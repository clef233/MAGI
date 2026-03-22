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
from app.services.prompt_serializer import BlockPhase

logger = logging.getLogger('magi.debate_engine')
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
logger.propagate = False


def _sanitize_string_list(items: list) -> list[str]:
    """Ensure all items in list are strings. LLM sometimes returns dicts.

    This handles cases where the LLM returns structured objects like:
    {"topic": "...", "detail": "..."} instead of plain strings.
    """
    result = []
    for item in items:
        if isinstance(item, str):
            result.append(item)
        elif isinstance(item, dict):
            # Convert dict to readable string by joining all values
            parts = [str(v) for v in item.values() if v]
            result.append(" — ".join(parts) if parts else str(item))
        else:
            result.append(str(item))
    return result


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
        self.semantic_model_config = None  # Loaded from DB in _run_semantic_analysis

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

            # Run semantic analysis in background - don't block the main flow
            # Semantic analysis is for UI enrichment, not critical for debate logic
            asyncio.create_task(self._run_semantic_analysis_safe(round_number=1, phase="initial"))

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

                # Run semantic analysis in background - don't block the main flow
                asyncio.create_task(self._run_semantic_analysis_safe(
                    round_number=self.step_number,
                    phase="revision",
                    cycle=cycle,
                ))

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

                # Build system prompt from actor config
                system_prompt = actor.system_prompt or f"You are {actor.name}, an AI assistant."
                if actor.custom_instructions:
                    system_prompt += f"\n\n{actor.custom_instructions}"

                # Get initial answer prompt from PromptService - NO fallback
                initial_prompt = await self.prompt_service.get_initial_answer_prompt(
                    question=self.session.question,
                    actor_name=actor.name,
                    actor_custom_prompt=None,  # Already included in system_prompt above
                )

                full_response = ""
                logger.info(f"Calling stream_completion for {actor.name}...")

                # Real streaming: emit each token
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": initial_prompt}],
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

        # Run all actors in parallel with real streaming using as_completed
        # to commit each actor's message immediately when done
        tasks = [asyncio.create_task(actor_response_stream(actor)) for actor in self.actors]
        logger.info(f"Created {len(tasks)} streaming tasks for actors")

        for coro in asyncio.as_completed(tasks):
            try:
                result = await coro
                if isinstance(result, tuple):
                    actor_id, full_response = result
                    # Commit immediately when this actor completes
                    message = Message(
                        round_id=db_round.id,
                        actor_id=actor_id,
                        role="answer",
                        content=full_response,
                    )
                    self.db.add(message)
                    await self.db.commit()
                    # Track for later rounds
                    self.actor_responses[actor_id].append({
                        "role": "answer",
                        "content": full_response,
                        "cycle": 0,
                    })
            except Exception as e:
                logger.error(f"Actor task failed: {e}")

    async def _run_review_round(self, cycle: int, db_round: DBRound):
        """Run review round where each actor critiques others' answers"""
        phase = BlockPhase.INITIAL if cycle == 1 else BlockPhase.REVISION

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

            # Build self answer block
            my_answer = latest_answers.get(actor.id, "")
            self_answer_block = self.prompt_service.build_self_answer_block(
                actor_name=actor.name,
                content=my_answer,
                phase=phase,
            )

            # Build peer answer blocks
            peer_answers = []
            for aid, content in latest_answers.items():
                if aid != actor.id:
                    other_actor = next((a for a in self.actors if a.id == aid), None)
                    if other_actor:
                        peer_answers.append({
                            "actor_name": other_actor.name,
                            "content": content,
                        })

            peer_answer_blocks = self.prompt_service.build_peer_answer_blocks(
                answers=peer_answers,
                phase=phase,
            )

            # Build review prompt using prompt_service - NO fallback allowed
            system_prompt = actor.review_prompt or f"You are {actor.name}. Provide a critical review."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            review_prompt = await self.prompt_service.get_review_prompt(
                question=self.session.question,
                self_actor_name=actor.name,
                self_answer_block=self_answer_block,
                peer_answer_blocks=peer_answer_blocks,
            )

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

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "review",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [asyncio.create_task(actor_review_stream(actor)) for actor in self.actors]

        for coro in asyncio.as_completed(tasks):
            try:
                result = await coro
                if isinstance(result, tuple):
                    actor_id, full_response = result
                    # Commit immediately when this actor completes
                    message = Message(
                        round_id=db_round.id,
                        actor_id=actor_id,
                        role="review",
                        content=full_response,
                    )
                    self.db.add(message)
                    await self.db.commit()
                    self.actor_responses[actor_id].append({
                        "role": "review",
                        "content": full_response,
                        "cycle": cycle,
                    })
            except Exception as e:
                logger.error(f"Review task failed: {e}")

    async def _run_revision_round(self, cycle: int, review_round: DBRound, db_round: DBRound):
        """Run revision round where actors improve their answers"""
        phase = BlockPhase.INITIAL if cycle == 1 else BlockPhase.REVISION

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

            # Build self previous answer block
            my_answer = latest_answers.get(actor.id, "")
            self_previous_answer_block = self.prompt_service.build_self_answer_block(
                actor_name=actor.name,
                content=my_answer,
                phase=phase,
            )

            # Build peer review blocks (reviews about this actor)
            peer_reviews = []
            for msg in review_messages:
                if msg.actor_id != actor.id:
                    other_actor = next((a for a in self.actors if a.id == msg.actor_id), None)
                    if other_actor:
                        peer_reviews.append({
                            "reviewer_name": other_actor.name,
                            "about_actor_name": actor.name,
                            "content": msg.content,
                        })

            peer_review_blocks = self.prompt_service.build_peer_review_blocks(
                reviews=peer_reviews,
                phase=phase,
            )

            # Build revision prompt using prompt_service - NO fallback allowed
            system_prompt = actor.revision_prompt or f"You are {actor.name}. Revise based on feedback."
            if actor.custom_instructions:
                system_prompt += f"\n\n{actor.custom_instructions}"

            revision_prompt = await self.prompt_service.get_revision_prompt(
                question=self.session.question,
                self_actor_name=actor.name,
                self_previous_answer_block=self_previous_answer_block,
                peer_review_blocks=peer_review_blocks,
            )

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

            await self._emit({
                "event": "actor_end",
                "data": {
                    "actor_id": actor.id,
                    "phase": "revision",
                    "cycle": cycle,
                }
            })

            return actor.id, full_response

        tasks = [asyncio.create_task(actor_revision_stream(actor)) for actor in self.actors]

        for coro in asyncio.as_completed(tasks):
            try:
                result = await coro
                if isinstance(result, tuple):
                    actor_id, full_response = result
                    # Commit immediately when this actor completes
                    message = Message(
                        round_id=db_round.id,
                        actor_id=actor_id,
                        role="revision",
                        content=full_response,
                    )
                    self.db.add(message)
                    await self.db.commit()
                    self.actor_responses[actor_id].append({
                        "role": "revision",
                        "content": full_response,
                        "cycle": cycle,
                    })
            except Exception as e:
                logger.error(f"Revision task failed: {e}")

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
            prompt_service=self.prompt_service,  # REQUIRED - no hardcoded prompts
        )

    async def _run_semantic_analysis_safe(self, round_number: int, phase: str, cycle: int = 0):
        """
        Safe wrapper for semantic analysis that runs in background.

        This method catches all exceptions to prevent background task failures
        from affecting the main debate flow. Semantic analysis is optional
        enrichment for the UI and should not block or crash the debate.
        """
        try:
            await self._run_semantic_analysis(round_number, phase, cycle)
        except asyncio.CancelledError:
            logger.info(f"Semantic analysis cancelled for round {round_number}, phase {phase}")
        except Exception as e:
            # Log but don't propagate - semantic analysis is optional
            logger.error(f"Semantic analysis failed (non-blocking): {e}", exc_info=True)

    async def _run_semantic_analysis(self, round_number: int, phase: str, cycle: int = 0):
        """
        Run semantic analysis on the latest responses with parallel execution.

        IMPORTANT: Uses an independent database session to avoid concurrent
        access issues with the main debate flow's session.

        This method:
        1. Analyzes question intent (first time only)
        2. Extracts semantic topics from each actor's response (parallel)
        3. Compares topics across actors
        4. Emits semantic_comparison event with canonical phase_id

        Args:
            round_number: The step number for this phase
            phase: Phase name (initial, review, revision, final_answer, summary)
            cycle: Cycle number for revision phases (1-indexed)
        """
        logger.info(f"Running semantic analysis for round {round_number}, phase {phase}, cycle {cycle}")

        # Use independent db session to avoid SQLAlchemy concurrent access issues
        from app.services.database import async_session_factory
        async with async_session_factory() as bg_db:
            # Create independent PromptService and SemanticService for this background task
            bg_prompt_service = PromptService(bg_db)
            await bg_prompt_service.load_templates()
            await bg_prompt_service.load_presets()
            bg_semantic_service = SemanticService(bg_db, bg_prompt_service)

            try:
                # Load semantic model config from DB
                from app.models.database import SemanticModelConfig

                result = await bg_db.execute(
                    select(SemanticModelConfig).where(SemanticModelConfig.is_active == True).limit(1)
                )
                semantic_config = result.scalar_one_or_none()

                if not semantic_config:
                    logger.warning("Semantic model not configured, skipping semantic analysis")
                    await self._emit({
                        "event": "semantic_skipped",
                        "data": {
                            "reason": "semantic_model_not_configured",
                            "message": "语义分析模型未配置，请在设置中配置后重试",
                        }
                    })
                    return

                # Create independent adapter for semantic analysis
                from app.services.llm_adapter import create_adapter as create_llm_adapter
                adapter = create_llm_adapter(
                    provider=semantic_config.provider.value,
                    api_key=semantic_config.api_key,
                    base_url=semantic_config.base_url,
                    model=semantic_config.model,
                )

                # Store timeout configs for use in this method
                intent_timeout = float(semantic_config.question_intent_timeout)
                extraction_timeout = float(semantic_config.topic_extraction_timeout)
                compare_timeout = float(semantic_config.cross_compare_timeout)

                # Step 1: Analyze question intent (only once) - with timeout
                if not self.question_intent:
                    logger.info("Analyzing question intent...")
                    try:
                        self.question_intent = await asyncio.wait_for(
                            bg_semantic_service.analyze_question_intent(
                                question=self.session.question,
                                adapter=adapter,
                            ),
                            timeout=intent_timeout
                        )
                        # Save to database
                        await bg_semantic_service.save_question_intent(
                            session_id=self.session.id,
                            result=self.question_intent,
                        )
                        logger.info(f"Question intent analyzed: {len(self.question_intent.comparison_axes)} axes")
                    except asyncio.TimeoutError:
                        logger.warning("Question intent analysis timed out, using defaults")
                        # Use default comparison axes
                        self.question_intent = type('QuestionIntentResult', (), {
                            'question_type': 'general',
                            'user_goal': '',
                            'time_horizons': [],
                            'comparison_axes': [
                                {"axis_id": "main_topic", "label": "核心观点"},
                                {"axis_id": "approach", "label": "解决思路"},
                            ]
                        })()
                    except Exception as e:
                        logger.error(f"Question intent analysis failed: {e}")
                        # Use default comparison axes
                        self.question_intent = type('QuestionIntentResult', (), {
                            'question_type': 'general',
                            'user_goal': '',
                            'time_horizons': [],
                            'comparison_axes': [
                                {"axis_id": "main_topic", "label": "核心观点"},
                                {"axis_id": "approach", "label": "解决思路"},
                            ]
                        })()

                # Step 2: Extract semantic topics from each actor's latest response (parallel)
                # Make a shallow copy to avoid concurrent modification from main flow
                latest_answers = {}
                for actor in self.actors:
                    responses = list(self.actor_responses.get(actor.id, []))  # copy list
                    for r in reversed(responses):
                        if r.get("role") in ["answer", "revision"]:
                            latest_answers[actor.id] = r["content"]
                            break

                if not latest_answers:
                    logger.warning("No answers found for semantic analysis")
                    return

                # Parallel topic extraction using asyncio.gather with timeout
                async def extract_topics_for_actor(actor: Actor):
                    content = latest_answers.get(actor.id, "")
                    if not content:
                        return actor.id, []

                    logger.info(f"Extracting topics for actor {actor.name}...")
                    try:
                        topics = await asyncio.wait_for(
                            bg_semantic_service.extract_semantic_topics(
                                question=self.session.question,
                                answer=content,
                                comparison_axes=self.question_intent.comparison_axes,
                                actor_id=actor.id,
                                adapter=adapter,
                            ),
                            timeout=extraction_timeout
                        )
                        return actor.id, topics
                    except asyncio.TimeoutError:
                        logger.warning(f"Topic extraction timed out for actor {actor.name}")
                        return actor.id, []
                    except Exception as e:
                        logger.error(f"Topic extraction failed for actor {actor.name}: {e}")
                        return actor.id, []

                extraction_tasks = [extract_topics_for_actor(actor) for actor in self.actors]
                extraction_results = await asyncio.gather(*extraction_tasks, return_exceptions=True)

                topics_by_actor = {}
                for result in extraction_results:
                    if isinstance(result, tuple):
                        actor_id, topics = result
                        topics_by_actor[actor_id] = topics
                        # Save to database
                        if topics:
                            try:
                                await bg_semantic_service.save_semantic_topics(
                                    session_id=self.session.id,
                                    round_number=round_number,
                                    phase=phase,
                                    actor_id=actor_id,
                                    topics=topics,
                                    cycle=cycle,
                                )
                            except Exception as e:
                                logger.error(f"Failed to save semantic topics: {e}")
                    elif isinstance(result, Exception):
                        logger.error(f"Topic extraction task failed: {result}")

                # Step 3: Compare topics across actors
                if len(topics_by_actor) >= 2:
                    logger.info("Comparing topics across actors...")
                    try:
                        comparisons = await asyncio.wait_for(
                            bg_semantic_service.compare_actors(
                                question=self.session.question,
                                topics_by_actor=topics_by_actor,
                                actors=self.actors,
                                adapter=adapter,
                            ),
                            timeout=compare_timeout
                        )

                        # Save to database
                        if comparisons:
                            await bg_semantic_service.save_semantic_comparisons(
                                session_id=self.session.id,
                                round_number=round_number,
                                phase=phase,
                                comparisons=comparisons,
                                cycle=cycle,
                            )

                        self.latest_semantic_comparisons = comparisons

                        # Emit semantic_comparison event with canonical phase_id
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

                    except asyncio.TimeoutError:
                        logger.warning("Topic comparison timed out")
                    except Exception as e:
                        logger.error(f"Topic comparison failed: {e}")
                else:
                    logger.info(f"Not enough actors with topics ({len(topics_by_actor)}), skipping comparison")

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

        # Build actor answer blocks
        actor_answers = []
        for actor in self.actors:
            content = latest_answers.get(actor.id, "")
            actor_answers.append({
                "actor_name": actor.name,
                "content": content,
            })

        actor_answer_blocks = self.prompt_service.build_latest_answer_blocks(actor_answers)

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

        # Build final answer prompt using prompt_service - NO fallback allowed
        system_prompt = judge.system_prompt or "你是一个专业的综合决策助手，输出简洁明了的最终回答。"

        final_answer_prompt = await self.prompt_service.get_final_answer_prompt(
            question=self.session.question,
            self_actor_name=judge.name,
            actor_answer_blocks=actor_answer_blocks,
            convergence_info=convergence_info,
        )

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
        """Run summary phase to synthesize final conclusion

        Note: convergence_result is currently unused but kept for potential
        future integration with summary templates.
        """
        # Get judge actor
        result = await self.db.execute(
            select(Actor).where(Actor.id == self.session.judge_actor_id)
        )
        judge = result.scalar_one_or_none()

        if not judge:
            await self._emit({"event": "debate_error", "data": {"message": "Judge actor not found"}})
            return

        adapter = self.get_adapter(judge)

        # Build history blocks with actor attribution
        history_items = []
        for actor in self.actors:
            responses = self.actor_responses.get(actor.id, [])
            for r in responses:
                role = r.get("role", "response")
                history_items.append({
                    "actor_name": actor.name,
                    "role": role,
                    "cycle": r.get("cycle", 0),
                    "content": r.get("content", ""),
                })

        history_blocks = self.prompt_service.build_history_blocks(
            history_items=history_items,
            self_actor_name=judge.name,
        )

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

        # Build summary prompt using prompt_service - NO fallback allowed
        summary_prompt = await self.prompt_service.get_summary_prompt(
            question=self.session.question,
            self_actor_name=judge.name,
            history_blocks=history_blocks,
        )

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

        # If first attempt failed, try a more structured retry with context
        if not parse_success:
            logger.warning(f"Summary JSON parse failed, attempting retry with stricter prompt")
            retry_prompt = f"""Based on this multi-agent review, provide ONLY a valid JSON object with no additional text.

Original Question: {self.session.question}

The previous response could not be parsed. Please provide ONLY a valid JSON object:
{{
  "summary": "Brief summary of conclusions",
  "agreements": ["point 1", "point 2"],
  "disagreements": ["point 1"],
  "confidence": <0.0-1.0 or omit if uncertain>,
  "recommendation": "Brief recommendation"
}}"""

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

        # If still failed, use convergence_result score as fallback confidence
        if not parse_success or consensus is None:
            fallback_confidence = None
            if convergence_result and convergence_result.score > 0:
                fallback_confidence = convergence_result.score
                logger.info(f"Using convergence score {fallback_confidence} as fallback confidence")

            consensus = {
                "summary": "",
                "agreements": convergence_result.agreements if convergence_result else [],
                "disagreements": convergence_result.disagreements if convergence_result else [],
                "confidence": fallback_confidence,
                "recommendation": full_response[:200] if full_response else "",
                "key_uncertainties": [],
                "confidence_unavailable": fallback_confidence is None,
            }
            logger.warning(f"Summary JSON parse failed after retry, fallback confidence: {fallback_confidence}")

        # Store message
        message = Message(
            round_id=summary_round.id,
            actor_id=judge.id,
            role="summary",
            content=full_response,
        )
        self.db.add(message)

        # Store consensus
        # New prompt schema: no "summary" field, use "recommendation" as summary fallback
        self.session.consensus_summary = consensus.get("summary", "") or consensus.get("recommendation", "")
        self.session.consensus_agreements = _sanitize_string_list(consensus.get("agreements", []))
        self.session.consensus_disagreements = _sanitize_string_list(consensus.get("disagreements", []))
        # Store confidence as-is (could be None if unavailable)
        confidence_value = consensus.get("confidence")
        if confidence_value is not None:
            self.session.consensus_confidence = float(confidence_value)
        else:
            self.session.consensus_confidence = None
        self.session.consensus_recommendation = consensus.get("recommendation", "")
        self.session.consensus_key_uncertainties = _sanitize_string_list(consensus.get("key_uncertainties", []))
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