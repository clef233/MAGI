"""
Debate Engine - Core orchestration logic for multi-agent debates.

Flow:
1. Round 1 (Initial): All actors answer the question in parallel
2. Round 2 (Review): Each actor reviews others' answers
3. Round 3 (Revision): Each actor revises based on reviews
4. Meta Judge: Synthesizes consensus from all debate history
"""

import asyncio
import json
from typing import AsyncGenerator
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import (
    Actor,
    DebateSession,
    DebateSessionActor,
    Round as DBRound,
    Message,
    SessionStatus,
)
from app.services.llm_adapter import create_adapter, LLMAdapter


class DebateEngine:
    """Core debate orchestration engine"""

    def __init__(self, db: AsyncSession, session: DebateSession):
        self.db = db
        self.session = session
        self.actors: list[Actor] = []
        self.actor_responses: dict[str, list[dict]] = {}  # actor_id -> list of messages

    async def load_actors(self):
        """Load actors for this session"""
        result = await self.db.execute(
            select(Actor)
            .join(DebateSessionActor)
            .where(DebateSessionActor.session_id == self.session.id)
        )
        self.actors = list(result.scalars().all())

        for actor in self.actors:
            self.actor_responses[actor.id] = []

    def get_adapter(self, actor: Actor) -> LLMAdapter:
        """Create LLM adapter for an actor"""
        return create_adapter(
            provider=actor.provider.value,
            api_key=actor.api_key,
            base_url=actor.base_url,
            model=actor.model,
        )

    async def run_debate(self) -> AsyncGenerator[dict, None]:
        """Run the full debate and yield SSE events"""

        try:
            # Update status
            self.session.status = SessionStatus.DEBATING
            await self.db.commit()

            # Load actors
            await self.load_actors()

            if len(self.actors) < 2:
                yield {"event": "error", "data": {"message": "Need at least 2 actors for debate"}}
                return

            # Round 1: Initial responses
            yield {"event": "round_start", "data": {"round": 1, "phase": "initial"}}

            round_1 = DBRound(
                session_id=self.session.id,
                round_number=1,
                phase="initial",
            )
            self.db.add(round_1)
            await self.db.commit()
            await self.db.refresh(round_1)

            async for event in self._run_initial_round(round_1):
                yield event

            yield {"event": "round_end", "data": {"round": 1}}

            # Round 2: Cross review
            yield {"event": "round_start", "data": {"round": 2, "phase": "review"}}

            round_2 = DBRound(
                session_id=self.session.id,
                round_number=2,
                phase="review",
            )
            self.db.add(round_2)
            await self.db.commit()
            await self.db.refresh(round_2)

            async for event in self._run_review_round(round_1, round_2):
                yield event

            yield {"event": "round_end", "data": {"round": 2}}

            # Round 3: Revision
            yield {"event": "round_start", "data": {"round": 3, "phase": "revision"}}

            round_3 = DBRound(
                session_id=self.session.id,
                round_number=3,
                phase="revision",
            )
            self.db.add(round_3)
            await self.db.commit()
            await self.db.refresh(round_3)

            async for event in self._run_revision_round(round_2, round_3):
                yield event

            yield {"event": "round_end", "data": {"round": 3}}

            # Meta Judge: Consensus
            self.session.status = SessionStatus.JUDGING
            await self.db.commit()

            yield {"event": "judge_start", "data": {}}

            async for event in self._run_meta_judge():
                yield event

            # Complete
            self.session.status = SessionStatus.COMPLETED
            self.session.completed_at = datetime.utcnow()
            await self.db.commit()

            yield {
                "event": "complete",
                "data": {
                    "session_id": self.session.id,
                    "total_tokens": self.session.total_tokens,
                    "total_cost": self.session.total_cost,
                },
            }

        except Exception as e:
            import traceback
            traceback.print_exc()  # 打印完整堆栈到服务器日志
            yield {"event": "error", "data": {"message": str(e)}}
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()

    async def _run_initial_round(self, db_round: DBRound) -> AsyncGenerator[dict, None]:
        """Run initial round where each actor answers the question"""

        async def actor_response(actor: Actor) -> tuple[str, str]:
            """Get initial response from an actor"""
            adapter = self.get_adapter(actor)

            system_prompt = actor.system_prompt or f"You are {actor.name}, an AI assistant participating in a structured debate."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": self.session.question}],
                system_prompt=system_prompt,
                max_tokens=actor.max_tokens,
                temperature=actor.temperature,
            ):
                full_response += token

            return actor.id, full_response

        # Run all actors in parallel
        tasks = [actor_response(actor) for actor in self.actors]

        # Stream responses as they come
        for task in asyncio.as_completed(tasks):
            actor_id, content = await task

            # Find the actor
            actor = next(a for a in self.actors if a.id == actor_id)

            yield {"event": "actor_start", "data": {"actor_id": actor_id, "actor_name": actor.name}}

            # Store message
            message = Message(
                round_id=db_round.id,
                actor_id=actor_id,
                role="answer",
                content=content,
            )
            self.db.add(message)
            await self.db.commit()

            # Track for later rounds
            self.actor_responses[actor_id].append({
                "role": "answer",
                "content": content,
            })

            # Stream content
            yield {"event": "token", "data": {"actor_id": actor_id, "content": content}}

            yield {
                "event": "actor_end",
                "data": {"actor_id": actor_id, "input_tokens": 0, "output_tokens": 0},
            }

    async def _run_review_round(
        self, initial_round: DBRound, db_round: DBRound
    ) -> AsyncGenerator[dict, None]:
        """Run review round where each actor critiques others' answers"""

        # Get initial responses
        result = await self.db.execute(
            select(Message).where(Message.round_id == initial_round.id)
        )
        initial_messages = list(result.scalars().all())

        async def actor_review(actor: Actor) -> tuple[str, str]:
            """Get review from an actor about other actors' responses"""
            adapter = self.get_adapter(actor)

            # Get other actors' responses
            other_responses = []
            for msg in initial_messages:
                if msg.actor_id != actor.id:
                    other_actor = next(a for a in self.actors if a.id == msg.actor_id)
                    other_responses.append(f"**{other_actor.name}**: {msg.content}")

            system_prompt = actor.review_prompt or f"You are {actor.name}. Critically analyze the following responses to identify strengths, weaknesses, and potential improvements."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            review_prompt = f"""Original question: {self.session.question}

Here are the responses from other participants:

{chr(10).join(other_responses)}

Please provide a critical review of these responses. Focus on:
1. Key points you agree with
2. Important points that were missed or incorrect
3. Suggestions for improvement"""

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": review_prompt}],
                system_prompt=system_prompt,
                max_tokens=actor.max_tokens,
                temperature=actor.temperature,
            ):
                full_response += token

            return actor.id, full_response

        # Run all reviews in parallel
        tasks = [actor_review(actor) for actor in self.actors]

        for task in asyncio.as_completed(tasks):
            actor_id, content = await task
            actor = next(a for a in self.actors if a.id == actor_id)

            yield {"event": "actor_start", "data": {"actor_id": actor_id, "actor_name": actor.name}}

            message = Message(
                round_id=db_round.id,
                actor_id=actor_id,
                role="review",
                content=content,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor_id].append({
                "role": "review",
                "content": content,
            })

            yield {"event": "token", "data": {"actor_id": actor_id, "content": content}}

            yield {
                "event": "actor_end",
                "data": {"actor_id": actor_id, "input_tokens": 0, "output_tokens": 0},
            }

    async def _run_revision_round(
        self, review_round: DBRound, db_round: DBRound
    ) -> AsyncGenerator[dict, None]:
        """Run revision round where actors improve their initial answers"""

        # Get review messages
        result = await self.db.execute(
            select(Message).where(Message.round_id == review_round.id)
        )
        review_messages = list(result.scalars().all())

        # Get initial responses
        result = await self.db.execute(
            select(Message).where(Message.round_id == review_round.id - 1)
        )
        initial_messages = {msg.actor_id: msg.content for msg in result.scalars().all()}

        async def actor_revision(actor: Actor) -> tuple[str, str]:
            """Get revised response from an actor"""
            adapter = self.get_adapter(actor)

            # Get reviews about this actor's response
            reviews_about_me = []
            for msg in review_messages:
                if msg.actor_id != actor.id:
                    other_actor = next(a for a in self.actors if a.id == msg.actor_id)
                    reviews_about_me.append(f"**{other_actor.name}'s review**: {msg.content}")

            system_prompt = actor.revision_prompt or f"You are {actor.name}. Based on the reviews from other participants, revise your original answer to address their feedback."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            my_initial = initial_messages.get(actor.id, "")

            revision_prompt = f"""Original question: {self.session.question}

Your original response:
{my_initial}

Reviews from other participants:
{chr(10).join(reviews_about_me)}

Please revise your original response to:
1. Address valid critiques from the reviews
2. Incorporate useful suggestions
3. Maintain your unique perspective where appropriate
4. Provide a more comprehensive and accurate answer"""

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": revision_prompt}],
                system_prompt=system_prompt,
                max_tokens=actor.max_tokens,
                temperature=actor.temperature,
            ):
                full_response += token

            return actor.id, full_response

        # Run all revisions in parallel
        tasks = [actor_revision(actor) for actor in self.actors]

        for task in asyncio.as_completed(tasks):
            actor_id, content = await task
            actor = next(a for a in self.actors if a.id == actor_id)

            yield {"event": "actor_start", "data": {"actor_id": actor_id, "actor_name": actor.name}}

            message = Message(
                round_id=db_round.id,
                actor_id=actor_id,
                role="revision",
                content=content,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor_id].append({
                "role": "revision",
                "content": content,
            })

            yield {"event": "token", "data": {"actor_id": actor_id, "content": content}}

            yield {
                "event": "actor_end",
                "data": {"actor_id": actor_id, "input_tokens": 0, "output_tokens": 0},
            }

    async def _run_meta_judge(self) -> AsyncGenerator[dict, None]:
        """Run meta judge to synthesize consensus"""

        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            yield {"event": "error", "data": {"message": "Judge actor not found"}}
            return

        adapter = self.get_adapter(judge)

        # Compile all debate history
        debate_summary = f"**Original Question**: {self.session.question}\n\n"

        for round_num in range(1, 4):
            result = await self.db.execute(
                select(DBRound).where(
                    DBRound.session_id == self.session.id,
                    DBRound.round_number == round_num,
                )
            )
            db_round = result.scalar_one_or_none()
            if db_round:
                result = await self.db.execute(
                    select(Message).where(Message.round_id == db_round.id)
                )
                messages = list(result.scalars().all())

                phase_names = {"initial": "Initial Responses", "review": "Cross Reviews", "revision": "Revised Responses"}
                debate_summary += f"## Round {round_num}: {phase_names.get(db_round.phase, db_round.phase)}\n\n"

                for msg in messages:
                    actor = next((a for a in self.actors if a.id == msg.actor_id), None)
                    if actor:
                        debate_summary += f"### {actor.name} ({msg.role}):\n{msg.content}\n\n"

        judge_prompt = f"""You are the Meta Judge for a multi-agent debate. Your role is to synthesize the debate and produce a consensus report.

{debate_summary}

Based on this debate, please provide:
1. A concise summary of the key conclusions
2. Points where all participants agreed
3. Points where participants disagreed
4. Your confidence level (0-1) in the consensus
5. A final recommendation

Format your response as JSON:
{{
  "summary": "...",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": 0.85,
  "recommendation": "..."
}}"""

        system_prompt = judge.system_prompt or "You are an impartial Meta Judge analyzing a multi-agent AI debate to synthesize consensus."

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": judge_prompt}],
            system_prompt=system_prompt,
            max_tokens=judge.max_tokens,
            temperature=0.3,  # Lower temperature for more consistent output
        ):
            full_response += token
            yield {"event": "judge_token", "data": {"content": token}}

        # Parse JSON response
        try:
            # Try to extract JSON from the response
            json_start = full_response.find("{")
            json_end = full_response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = full_response[json_start:json_end]
                consensus = json.loads(json_str)
            else:
                consensus = {
                    "summary": full_response,
                    "agreements": [],
                    "disagreements": [],
                    "confidence": 0.5,
                    "recommendation": full_response,
                }
        except json.JSONDecodeError:
            consensus = {
                "summary": full_response,
                "agreements": [],
                "disagreements": [],
                "confidence": 0.5,
                "recommendation": full_response,
            }

        # Store consensus
        self.session.consensus_summary = consensus.get("summary", "")
        self.session.consensus_agreements = consensus.get("agreements", [])
        self.session.consensus_disagreements = consensus.get("disagreements", [])
        self.session.consensus_confidence = consensus.get("confidence", 0.5)
        self.session.consensus_recommendation = consensus.get("recommendation", "")
        await self.db.commit()

        yield {
            "event": "consensus",
            "data": consensus,
        }