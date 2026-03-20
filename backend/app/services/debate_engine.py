"""
Debate Engine - Core orchestration logic for multi-agent review.

Flow:
1. Initial: All actors answer the question in parallel
2. Review/Revision Loop:
   - Each actor reviews others' answers
   - Each actor revises based on reviews
   - Check for convergence
   - If converged or max rounds reached, exit loop
3. Summary: Judge synthesizes final conclusion

All prompts are loaded from database via PromptService.
"""

import asyncio
import json
import logging
from typing import Optional, Callable
from datetime import datetime, timezone
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
from app.services.prompt_service import PromptService, PromptError
from app.services.convergence_service import check_convergence, ConvergenceResult
from app.services.semantic_service import SemanticService

logger = logging.getLogger('magi.debate_engine')
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
logger.propagate = False


class DebateEngine:
    """Core debate orchestration engine"""

    def __init__(
        self,
        db: AsyncSession,
        session: DebateSession,
        event_queue: Optional[asyncio.Queue] = None,
        is_cancelled: Optional[Callable[[], bool]] = None,
    ):
        self.db = db
        self.session = session
        self.event_queue = event_queue
        self.is_cancelled = is_cancelled
        self.actors: list[Actor] = []
        self.actor_responses: dict[str, list[dict]] = {}  # actor_id -> list of messages
        self.prompt_service = PromptService(db)
        self.semantic_service = SemanticService(db, self.prompt_service)
        self.step_number = 0  # Global step counter for phases
        self.question_intent = None  # Store question intent analysis result
        self.latest_semantic_comparisons = []  # Store latest semantic comparisons

    def _check_cancelled(self) -> bool:
        """Check if the debate should be cancelled."""
        if self.is_cancelled:
            return self.is_cancelled()
        return False

    async def _emit(self, event: dict):
        """Emit an event to the queue if available."""
        if self.event_queue:
            await self.event_queue.put(event)

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

    async def run_debate(self):
        """Run the full debate and emit events to queue."""
        logger.info(f"=== run_debate START, session_id={self.session.id} ===")

        try:
            # Initialize prompt service
            await self.prompt_service.load_templates()
            await self.prompt_service.load_presets()

            # Update status
            self.session.status = SessionStatus.DEBATING
            await self.db.commit()

            # Load actors
            await self.load_actors()

            if len(self.actors) < 2:
                await self._emit({"event": "debate_error", "data": {"message": "Need at least 2 actors for review"}})
                return

            # Check cancellation before initial round
            if self._check_cancelled():
                logger.info(f"Session {self.session.id} cancelled before initial round")
                return

            # ===== INITIAL ROUND =====
            self.step_number = 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "initial",
                    "round": 1,
                }
            })

            initial_round = DBRound(
                session_id=self.session.id,
                round_number=1,
                phase="initial",
            )
            self.db.add(initial_round)
            await self.db.commit()
            await self.db.refresh(initial_round)

            await self._run_initial_round(initial_round)

            if self._check_cancelled():
                return

            await self._emit({
                "event": "phase_end",
                "data": {"step": self.step_number, "phase": "initial"}
            })

            # Run semantic analysis after initial round
            await self._run_semantic_analysis(round_number=1, phase="initial")

            # ===== REVIEW/REVISION CYCLES =====
            max_cycles = self.session.max_rounds or 3
            converged = False
            last_convergence_result: Optional[ConvergenceResult] = None

            for cycle in range(1, max_cycles + 1):
                if self._check_cancelled():
                    logger.info(f"Session {self.session.id} cancelled during cycle {cycle}")
                    return

                # --- Review Phase ---
                self.step_number += 1
                await self._emit({
                    "event": "phase_start",
                    "data": {
                        "step": self.step_number,
                        "phase": "review",
                        "cycle": cycle,
                    }
                })

                review_round = DBRound(
                    session_id=self.session.id,
                    round_number=self.step_number,  # Sequential numbering
                    phase="review",
                )
                self.db.add(review_round)
                await self.db.commit()
                await self.db.refresh(review_round)

                await self._run_review_round(cycle, review_round)

                if self._check_cancelled():
                    return

                await self._emit({
                    "event": "phase_end",
                    "data": {"step": self.step_number, "phase": "review", "cycle": cycle}
                })

                # --- Revision Phase ---
                self.step_number += 1
                await self._emit({
                    "event": "phase_start",
                    "data": {
                        "step": self.step_number,
                        "phase": "revision",
                        "cycle": cycle,
                    }
                })

                revision_round = DBRound(
                    session_id=self.session.id,
                    round_number=self.step_number,  # Sequential numbering
                    phase="revision",
                )
                self.db.add(revision_round)
                await self.db.commit()
                await self.db.refresh(revision_round)

                await self._run_revision_round(cycle, review_round, revision_round)

                if self._check_cancelled():
                    return

                await self._emit({
                    "event": "phase_end",
                    "data": {"step": self.step_number, "phase": "revision", "cycle": cycle}
                })

                # Run semantic analysis after revision
                await self._run_semantic_analysis(
                    round_number=self.step_number,
                    phase="revision",
                    cycle=cycle,
                )

                # --- Convergence Check ---
                if self.session.auto_stop:
                    last_convergence_result = await self._check_convergence()

                    await self._emit({
                        "event": "convergence_result",
                        "data": {
                            "cycle": cycle,
                            **last_convergence_result.to_dict()
                        }
                    })

                    if last_convergence_result.converged:
                        logger.info(f"Session {self.session.id} converged at cycle {cycle}")
                        converged = True
                        break

            # ===== FINAL ANSWER PHASE =====
            if self._check_cancelled():
                return

            self.step_number += 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "final_answer",
                }
            })

            await self._run_final_answer_phase(last_convergence_result)

            if self._check_cancelled():
                return

            await self._emit({
                "event": "phase_end",
                "data": {"step": self.step_number, "phase": "final_answer"}
            })

            # ===== SUMMARY PHASE =====
            if self._check_cancelled():
                return

            self.session.status = SessionStatus.JUDGING
            await self.db.commit()

            self.step_number += 1
            await self._emit({
                "event": "phase_start",
                "data": {
                    "step": self.step_number,
                    "phase": "summary",
                }
            })

            await self._run_summary_phase(last_convergence_result)

            # Complete
            self.session.status = SessionStatus.COMPLETED
            self.session.completed_at = datetime.now(timezone.utc)
            await self.db.commit()

            await self._emit({
                "event": "complete",
                "data": {
                    "session_id": self.session.id,
                    "total_tokens": self.session.total_tokens,
                    "converged": converged,
                },
            })

        except PromptError as e:
            logger.error(f"Prompt error: {e}")
            await self._emit({"event": "debate_error", "data": {"message": str(e)}})
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()

        except asyncio.CancelledError:
            logger.info(f"Session {self.session.id} was cancelled")
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()
            await self._emit({"event": "cancelled", "data": {"session_id": self.session.id}})

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Session {self.session.id} failed: {e}")
            await self._emit({"event": "debate_error", "data": {"message": str(e)}})
            self.session.status = SessionStatus.STOPPED
            await self.db.commit()

    async def _run_initial_round(self, db_round: DBRound):
        """Run initial round where each actor answers the question with real streaming"""
        logger.info(f"_run_initial_round START, actors count: {len(self.actors)}")

        async def actor_response_stream(actor: Actor):
            """Stream response from an actor, emitting tokens in real-time"""
            logger.info(f"actor_response START for actor: {actor.name}")

            # Emit actor_start with full metadata
            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "initial",
                    "step": self.step_number,
                }
            })

            try:
                adapter = self.get_adapter(actor)
                logger.info(f"Created adapter: {type(adapter).__name__}")

                # Build system prompt from actor config + template
                system_prompt = actor.system_prompt or f"You are {actor.name}, an AI assistant."
                if actor.custom_instructions:
                    system_prompt += f"\n\n{actor.custom_instructions}"

                full_response = ""
                logger.info(f"Calling stream_completion for {actor.name}...")

                # Real streaming: emit each token
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": self.session.question}],
                    system_prompt=system_prompt,
                    max_tokens=actor.max_tokens,
                    temperature=actor.temperature,
                ):
                    full_response += token
                    await self._emit({
                        "event": "token",
                        "data": {
                            "actor_id": actor.id,
                            "content": token,
                            "phase": "initial",
                        }
                    })

                logger.info(f"stream_completion DONE for {actor.name}, response length: {len(full_response)}")

                # Store message after completion
                message = Message(
                    round_id=db_round.id,
                    actor_id=actor.id,
                    role="answer",
                    content=full_response,
                )
                self.db.add(message)
                await self.db.commit()

                # Track for later rounds
                self.actor_responses[actor.id].append({
                    "role": "answer",
                    "content": full_response,
                    "cycle": 0,
                })

                # Emit actor_end
                await self._emit({
                    "event": "actor_end",
                    "data": {
                        "actor_id": actor.id,
                        "phase": "initial",
                        "input_tokens": 0,
                        "output_tokens": 0,
                    }
                })

                return actor.id, full_response

            except Exception as e:
                logger.error(f"actor_response FAILED for {actor.name}: {e}", exc_info=True)
                await self._emit({"event": "debate_error", "data": {"message": f"Actor {actor.name} failed: {str(e)}"}})
                raise

        # Run all actors in parallel with real streaming
        tasks = [actor_response_stream(actor) for actor in self.actors]
        logger.info(f"Created {len(tasks)} streaming tasks for actors")

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Actor {self.actors[i].name} failed: {result}")

    async def _run_review_round(self, cycle: int, db_round: DBRound):
        """Run review round where each actor critiques others' answers"""

        # Get latest answers from each actor
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        async def actor_review_stream(actor: Actor):
            """Stream review from an actor with real-time token emission"""
            adapter = self.get_adapter(actor)

            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "review",
                    "step": self.step_number,
                    "cycle": cycle,
                }
            })

            # Get other actors' answers
            other_responses = []
            for aid, content in latest_answers.items():
                if aid != actor.id:
                    other_actor = next((a for a in self.actors if a.id == aid), None)
                    if other_actor:
                        other_responses.append(f"**{other_actor.name}**: {content}")

            # Build review prompt
            system_prompt = actor.review_prompt or f"You are {actor.name}. Provide a critical review."
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
                await self._emit({
                    "event": "token",
                    "data": {
                        "actor_id": actor.id,
                        "content": token,
                        "phase": "review",
                    }
                })

            # Store message
            message = Message(
                round_id=db_round.id,
                actor_id=actor.id,
                role="review",
                content=full_response,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor.id].append({
                "role": "review",
                "content": full_response,
                "cycle": cycle,
            })

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "review",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [actor_review_stream(actor) for actor in self.actors]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _run_revision_round(self, cycle: int, review_round: DBRound, db_round: DBRound):
        """Run revision round where actors improve their answers"""

        # Get review messages
        result = await self.db.execute(
            select(Message).where(Message.round_id == review_round.id)
        )
        review_messages = list(result.scalars().all())

        # Get latest answers
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        async def actor_revision_stream(actor: Actor):
            """Stream revised response from an actor"""
            adapter = self.get_adapter(actor)

            await self._emit({
                "event": "actor_start",
                "data": {
                    "actor_id": actor.id,
                    "actor_name": actor.name,
                    "actor_icon": actor.icon,
                    "actor_color": actor.display_color,
                    "phase": "revision",
                    "step": self.step_number,
                    "cycle": cycle,
                }
            })

            # Get reviews about this actor's response
            reviews_about_me = []
            for msg in review_messages:
                if msg.actor_id != actor.id:
                    other_actor = next((a for a in self.actors if a.id == msg.actor_id), None)
                    if other_actor:
                        reviews_about_me.append(f"**{other_actor.name}'s review**: {msg.content}")

            my_answer = latest_answers.get(actor.id, "")

            # Build revision prompt
            system_prompt = actor.revision_prompt or f"You are {actor.name}. Revise based on feedback."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            revision_prompt = f"""Original question: {self.session.question}

Your current response:
{my_answer}

Reviews from other participants:
{chr(10).join(reviews_about_me)}

Please revise your response to:
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
                await self._emit({
                    "event": "token",
                    "data": {
                        "actor_id": actor.id,
                        "content": token,
                        "phase": "revision",
                    }
                })

            # Store message
            message = Message(
                round_id=db_round.id,
                actor_id=actor.id,
                role="revision",
                content=full_response,
            )
            self.db.add(message)
            await self.db.commit()

            self.actor_responses[actor.id].append({
                "role": "revision",
                "content": full_response,
                "cycle": cycle,
            })

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "revision",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [actor_revision_stream(actor) for actor in self.actors]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_convergence(self) -> ConvergenceResult:
        """Check if responses have converged."""
        # Get latest answers
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        return await check_convergence(
            db=self.db,
            judge_actor_id=self.session.judge_actor_id,
            question=self.session.question,
            responses=latest_answers,
            threshold=self.session.convergence_threshold or 0.85,
        )

    async def _run_semantic_analysis(self, round_number: int, phase: str, cycle: int = 0):
        """
        Run semantic analysis on the latest responses.

        This method:
        1. Analyzes question intent (first time only)
        2. Extracts semantic topics from each actor's response
        3. Compares topics across actors
        4. Emits semantic_comparison event with canonical phase_id

        Args:
            round_number: The step number for this phase
            phase: Phase name (initial, review, revision, final_answer, summary)
            cycle: Cycle number for revision phases (1-indexed)
        """
        logger.info(f"Running semantic analysis for round {round_number}, phase {phase}, cycle {cycle}")

        try:
            # Get judge actor for semantic analysis
            result = await self.db.execute(
                select(Actor).where(Actor.id == self.session.judge_actor_id)
            )
            judge = result.scalar_one_or_none()

            if not judge:
                logger.warning("Judge actor not found for semantic analysis")
                return

            adapter = self.get_adapter(judge)

            # Step 1: Analyze question intent (only once)
            if not self.question_intent:
                logger.info("Analyzing question intent...")
                self.question_intent = await self.semantic_service.analyze_question_intent(
                    question=self.session.question,
                    adapter=adapter,
                )
                # Save to database
                await self.semantic_service.save_question_intent(
                    session_id=self.session.id,
                    result=self.question_intent,
                )
                logger.info(f"Question intent analyzed: {len(self.question_intent.comparison_axes)} axes")

            # Step 2: Extract semantic topics from each actor's latest response
            latest_answers = {}
            for actor in self.actors:
                responses = self.actor_responses.get(actor.id, [])
                for r in reversed(responses):
                    if r.get("role") in ["answer", "revision"]:
                        latest_answers[actor.id] = r["content"]
                        break

            topics_by_actor = {}
            for actor in self.actors:
                content = latest_answers.get(actor.id, "")
                if not content:
                    continue

                logger.info(f"Extracting topics for actor {actor.name}...")
                topics = await self.semantic_service.extract_semantic_topics(
                    question=self.session.question,
                    answer=content,
                    comparison_axes=self.question_intent.comparison_axes,
                    actor_id=actor.id,
                    adapter=adapter,
                )
                topics_by_actor[actor.id] = topics

                # Save to database
                if topics:
                    await self.semantic_service.save_semantic_topics(
                        session_id=self.session.id,
                        round_number=round_number,
                        phase=phase,
                        actor_id=actor.id,
                        topics=topics,
                        cycle=cycle,
                    )

            # Step 3: Compare topics across actors
            if len(topics_by_actor) >= 2:
                logger.info("Comparing topics across actors...")
                comparisons = await self.semantic_service.compare_actors(
                    question=self.session.question,
                    topics_by_actor=topics_by_actor,
                    actors=self.actors,
                    adapter=adapter,
                )

                # Save to database
                if comparisons:
                    await self.semantic_service.save_semantic_comparisons(
                        session_id=self.session.id,
                        round_number=round_number,
                        phase=phase,
                        comparisons=comparisons,
                        cycle=cycle,
                    )

                self.latest_semantic_comparisons = comparisons

                # Emit semantic_comparison event with canonical phase_id
                # phase_id format: "step:phase[:cycle]" (cycle only for revision)
                phase_id = f"{round_number}:{phase}"
                if phase == "revision" and cycle:
                    phase_id = f"{round_number}:{phase}:{cycle}"

                comparison_data = [
                    {
                        "topic_id": c.topic_id,
                        "label": c.label,
                        "salience": c.salience,
                        "disagreement_score": c.disagreement_score,
                        "status": c.status,
                        "difference_types": c.difference_types,
                        "agreement_summary": c.agreement_summary,
                        "disagreement_summary": c.disagreement_summary,
                        "actor_positions": [
                            {
                                "actor_id": p.actor_id,
                                "actor_name": p.actor_name,
                                "stance_label": p.stance_label,
                                "summary": p.summary,
                                "quotes": p.quotes,
                            }
                            for p in c.actor_positions
                        ],
                    }
                    for c in comparisons
                ]

                await self._emit({
                    "event": "semantic_comparison",
                    "data": {
                        "phase_id": phase_id,
                        "round_number": round_number,
                        "phase": phase,
                        "cycle": cycle,
                        "question_intent": {
                            "question_type": self.question_intent.question_type,
                            "user_goal": self.question_intent.user_goal,
                            "time_horizons": self.question_intent.time_horizons,
                            "comparison_axes": self.question_intent.comparison_axes,
                        },
                        "comparisons": comparison_data,
                    }
                })

                logger.info(f"Semantic analysis complete: {len(comparisons)} topics analyzed")

        except Exception as e:
            logger.error(f"Semantic analysis failed: {e}", exc_info=True)
            # Don't fail the debate if semantic analysis fails

    async def _run_final_answer_phase(self, convergence_result: Optional[ConvergenceResult] = None):
        """Run final answer phase where judge outputs a user-facing final answer."""

        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Get latest answers from each actor
        latest_answers = {}
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in reversed(responses):
                if r.get("role") in ["answer", "revision"]:
                    latest_answers[actor.id] = r["content"]
                    break

        # Build answer list
        answer_list = []
        for actor in self.actors:
            content = latest_answers.get(actor.id, "")
            answer_list.append(f"**{actor.name}**:\n{content}")

        # Build convergence info
        convergence_info = ""
        if convergence_result:
            convergence_info = f"""
## 收敛分析结果

共识度: {round(convergence_result.score * 100)}%
是否已收敛: {"是" if convergence_result.converged else "否"}

已达成共识的观点:
{chr(10).join(f"- {a}" for a in convergence_result.agreements) if convergence_result.agreements else "- 无"}

仍存在分歧的观点:
{chr(10).join(f"- {d}" for d in convergence_result.disagreements) if convergence_result.disagreements else "- 无"}

分析理由: {convergence_result.reason}
"""

        # Create DB round for final_answer
        final_round = DBRound(
            session_id=self.session.id,
            round_number=self.step_number,
            phase="final_answer",
        )
        self.db.add(final_round)
        await self.db.commit()
        await self.db.refresh(final_round)

        # Build final answer prompt
        final_answer_prompt = f"""你是一个综合决策助手，需要基于多轮互评的结果，输出一篇面向用户的最终回答。

## 原始问题

{self.session.question}

## 各参与者的最终回答

{chr(10).join(answer_list)}
{convergence_info}

## 要求

请直接回答用户的问题，要求：
1. 优先采用已达成共识的观点
2. 对仍有分歧的地方说明条件与不确定性
3. 如果收敛度较低，给出分情境建议
4. 使用清晰、自然的语言，不要使用 JSON 格式
5. 直接给出最终回答，不要解释过程
"""

        system_prompt = judge.system_prompt or "你是一个专业的综合决策助手，输出简洁明了的最终回答。"

        # Emit actor_start with judge's info
        await self._emit({
            "event": "actor_start",
            "data": {
                "actor_id": judge.id,
                "actor_name": judge.name,
                "actor_icon": judge.icon,
                "actor_color": judge.display_color,
                "phase": "final_answer",
                "step": self.step_number,
            }
        })

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": final_answer_prompt}],
            system_prompt=system_prompt,
            max_tokens=judge.max_tokens,
            temperature=0.3,
        ):
            full_response += token
            await self._emit({
                "event": "token",
                "data": {
                    "actor_id": judge.id,
                    "content": token,
                    "phase": "final_answer",
                }
            })

        # Store message
        message = Message(
            round_id=final_round.id,
            actor_id=judge.id,
            role="final_answer",
            content=full_response,
        )
        self.db.add(message)
        await self.db.commit()

        # Track in actor_responses
        if judge.id not in self.actor_responses:
            self.actor_responses[judge.id] = []
        self.actor_responses[judge.id].append({
            "role": "final_answer",
            "content": full_response,
            "cycle": 0,
        })

        await self._emit({
            "event": "actor_end",
            "data": {
                "actor_id": judge.id,
                "phase": "final_answer",
            }
        })

    async def _run_summary_phase(self, convergence_result: Optional[ConvergenceResult] = None):
        """Run summary phase to synthesize final conclusion"""

        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Compile all history
        history = f"**Original Question**: {self.session.question}\n\n"

        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            history += f"## {actor.name}\n\n"
            for r in responses:
                role_label = {
                    "answer": "Initial Answer",
                    "review": "Review",
                    "revision": "Revision",
                    "final_answer": "Final Answer",
                }.get(r.get("role"), r.get("role", "Response"))
                cycle = r.get("cycle", 0)
                history += f"### {role_label}" + (f" (Cycle {cycle})" if cycle > 0 else "") + "\n"
                history += f"{r.get('content', '')}\n\n"

        # Add convergence info if available
        convergence_info = ""
        if convergence_result:
            convergence_info = f"""
## 收敛分析

共识度: {round(convergence_result.score * 100)}%
是否已收敛: {"是" if convergence_result.converged else "否"}

已达成共识的观点:
{chr(10).join(f"- {a}" for a in convergence_result.agreements) if convergence_result.agreements else "- 无"}

仍存在分歧的观点:
{chr(10).join(f"- {d}" for d in convergence_result.disagreements) if convergence_result.disagreements else "- 无"}
"""

        # Build summary prompt
        summary_prompt = f"""Based on the following multi-agent review, please provide a comprehensive summary.
{history}
{convergence_info}
Please provide:
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

        system_prompt = judge.system_prompt or "You are an impartial Meta Judge synthesizing multi-agent reviews. Always respond with valid JSON."

        # Create DB round for summary
        summary_round = DBRound(
            session_id=self.session.id,
            round_number=self.step_number,
            phase="summary",
        )
        self.db.add(summary_round)
        await self.db.commit()
        await self.db.refresh(summary_round)

        # Emit judge start with judge's actual id
        await self._emit({
            "event": "actor_start",
            "data": {
                "actor_id": judge.id,
                "actor_name": judge.name,
                "actor_icon": judge.icon,
                "actor_color": judge.display_color,
                "phase": "summary",
                "step": self.step_number,
            }
        })

        full_response = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": summary_prompt}],
            system_prompt=system_prompt,
            max_tokens=judge.max_tokens,
            temperature=0.3,
        ):
            full_response += token
            await self._emit({
                "event": "token",
                "data": {
                    "actor_id": judge.id,
                    "content": token,
                    "phase": "summary",
                }
            })

        # Parse JSON response with retry logic
        consensus = None
        parse_success = False

        # First attempt
        try:
            json_start = full_response.find("{")
            json_end = full_response.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                json_str = full_response[json_start:json_end]
                consensus = json.loads(json_str)
                parse_success = True
        except json.JSONDecodeError:
            pass

        # If first attempt failed, try a more structured retry
        if not parse_success:
            logger.warning(f"Summary JSON parse failed, attempting retry with stricter prompt")
            retry_prompt = """The previous response could not be parsed as JSON. Please provide ONLY a valid JSON object with no additional text:

{
  "summary": "Brief summary of conclusions",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": 0.85,
  "recommendation": "Brief recommendation"
}"""

            retry_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": retry_prompt}],
                system_prompt="You are a JSON generator. Output ONLY valid JSON, no other text.",
                max_tokens=512,
                temperature=0.1,
            ):
                retry_response += token

            try:
                json_start = retry_response.find("{")
                json_end = retry_response.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = retry_response[json_start:json_end]
                    consensus = json.loads(json_str)
                    parse_success = True
            except json.JSONDecodeError:
                pass

        # If still failed, return with confidence: null to indicate unavailable
        if not parse_success or consensus is None:
            consensus = {
                "summary": full_response,
                "agreements": [],
                "disagreements": [],
                "confidence": None,  # null indicates unavailable, not fake 0.5
                "recommendation": full_response,
                "confidence_unavailable": True,  # Explicit flag for frontend
            }
            logger.warning("Summary JSON parse failed after retry, confidence marked as unavailable")

        # Store message
        message = Message(
            round_id=summary_round.id,
            actor_id=judge.id,
            role="summary",
            content=full_response,
        )
        self.db.add(message)

        # Store consensus (only store confidence if valid)
        self.session.consensus_summary = consensus.get("summary", "")
        self.session.consensus_agreements = consensus.get("agreements", [])
        self.session.consensus_disagreements = consensus.get("disagreements", [])
        # Store confidence as-is (could be None if unavailable)
        confidence_value = consensus.get("confidence")
        if confidence_value is not None:
            self.session.consensus_confidence = float(confidence_value)
        else:
            self.session.consensus_confidence = None
        self.session.consensus_recommendation = consensus.get("recommendation", "")
        await self.db.commit()

        await self._emit({
            "event": "actor_end",
            "data": {
                "actor_id": judge.id,
                "phase": "summary",
            }
        })

        await self._emit({
            "event": "consensus",
            "data": consensus,
        })