"""
Semantic Service - Provides semantic analysis for multi-agent review.

Core capabilities:
1. Question intent analysis - Extract comparison axes from user question
2. Semantic topic extraction - Extract structured topics from each answer
3. Cross-actor comparison - Generate disagreement map across actors
"""

import json
import logging
from typing import Optional
from dataclasses import dataclass, field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import (
    Actor,
    QuestionIntent,
    SemanticTopic,
    SemanticComparison,
)
from app.services.llm_adapter import LLMAdapter
from app.services.prompt_service import PromptService

logger = logging.getLogger('magi.semantic')
logger.setLevel(logging.DEBUG)

if not logger.handlers:
    file_handler = logging.FileHandler('magi_debug.log', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)
logger.propagate = False


@dataclass
class QuestionIntentResult:
    """Result of question intent analysis."""
    question_type: str = "general"
    user_goal: str = ""
    time_horizons: list[str] = field(default_factory=list)
    comparison_axes: list[dict] = field(default_factory=list)


@dataclass
class TopicResult:
    """Result of semantic topic extraction."""
    topic_id: str
    axis_id: Optional[str] = None
    label: str = ""
    summary: str = ""
    stance: str = ""
    time_horizon: str = "medium"
    risk_level: str = "medium"
    novelty: str = "medium"
    quotes: list[str] = field(default_factory=list)


@dataclass
class ActorPositionResult:
    """Actor's position on a topic."""
    actor_id: str
    actor_name: str = ""
    stance_label: str = ""
    summary: str = ""
    quotes: list[str] = field(default_factory=list)


@dataclass
class TopicComparisonResult:
    """Result of cross-actor comparison on a topic."""
    topic_id: str
    label: str
    salience: float = 0.5
    disagreement_score: float = 0.5
    status: str = "partial"  # converged, divergent, partial
    difference_types: list[str] = field(default_factory=list)
    agreement_summary: str = ""
    disagreement_summary: str = ""
    actor_positions: list[ActorPositionResult] = field(default_factory=list)


def parse_json_response(response: str) -> dict:
    """Parse JSON from LLM response with tolerance for formatting."""
    # Try to find JSON in the response
    json_start = response.find("{")
    json_end = response.rfind("}") + 1

    if json_start >= 0 and json_end > json_start:
        json_str = response[json_start:json_end]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error: {e}")
            # Try to fix common issues
            json_str = json_str.replace("'", '"')
            try:
                return json.loads(json_str)
            except:
                pass

    return {}


class SemanticService:
    """Service for semantic analysis in multi-agent review."""

    def __init__(self, db: AsyncSession, prompt_service: PromptService):
        self.db = db
        self.prompt_service = prompt_service
        # Templates are loaded via PromptService, no direct template storage needed

    async def _load_templates(self):
        """Load prompt templates from database via PromptService.

        Raises PromptError if templates are missing - NO fallback allowed.
        """
        # Templates are loaded on-demand via prompt_service.get_template()
        # This method exists for compatibility but doesn't store templates locally
        pass

    async def analyze_question_intent(
        self,
        question: str,
        adapter: LLMAdapter,
    ) -> QuestionIntentResult:
        """
        Analyze question intent and extract comparison axes.

        Args:
            question: The user's question
            adapter: LLM adapter to use for analysis

        Returns:
            QuestionIntentResult with comparison axes
        """
        # Get prompt from PromptService - NO fallback allowed
        prompt = await self.prompt_service.render_template("question_intent_analysis", {
            "question": question,
        })

        # Call LLM
        full_response = ""
        try:
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="你是一个专业的问题分析专家。请以JSON格式返回分析结果。",
                max_tokens=1024,
                temperature=0.3,
            ):
                full_response += token

            # Parse response
            data = parse_json_response(full_response)

            return QuestionIntentResult(
                question_type=data.get("question_type", "general"),
                user_goal=data.get("user_goal", ""),
                time_horizons=data.get("time_horizons", []),
                comparison_axes=data.get("comparison_axes", []),
            )

        except Exception as e:
            logger.error(f"Question intent analysis failed: {e}")
            # Return default axes based on question length
            return QuestionIntentResult(
                question_type="general",
                user_goal="",
                time_horizons=["short_term", "medium_term", "long_term"],
                comparison_axes=[
                    {"axis_id": "main_topic", "label": "核心观点"},
                    {"axis_id": "approach", "label": "解决思路"},
                    {"axis_id": "risk", "label": "风险考量"},
                ],
            )

    async def extract_semantic_topics(
        self,
        question: str,
        answer: str,
        comparison_axes: list[dict],
        actor_id: str,
        adapter: LLMAdapter,
    ) -> list[TopicResult]:
        """
        Extract semantic topics from an actor's answer.

        Args:
            question: The original question
            answer: The actor's answer
            comparison_axes: Axes from question intent analysis
            actor_id: ID of the actor
            adapter: LLM adapter to use

        Returns:
            List of TopicResult
        """
        if not comparison_axes:
            comparison_axes = [
                {"axis_id": "main_topic", "label": "核心观点"},
                {"axis_id": "approach", "label": "解决思路"},
            ]

        # Get prompt from PromptService - NO fallback allowed
        prompt = await self.prompt_service.render_template("semantic_extraction", {
            "question": question,
            "answer": answer,
            "comparison_axes": json.dumps(comparison_axes, ensure_ascii=False),
        })

        # Call LLM
        full_response = ""
        try:
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="你是一个专业的语义分析专家。请以JSON格式返回分析结果。",
                max_tokens=2048,
                temperature=0.3,
            ):
                full_response += token

            # Parse response
            data = parse_json_response(full_response)
            topics_data = data.get("topics", [])

            # Build valid axis_id set for validation
            valid_axis_ids = {a.get("axis_id") for a in comparison_axes if a.get("axis_id")}

            results = []
            for i, t in enumerate(topics_data):
                axis_id = t.get("axis_id")

                # Validate axis_id: must be from the given comparison_axes
                # If invalid or missing, try to find a matching axis by label similarity
                if axis_id and axis_id not in valid_axis_ids:
                    logger.warning(f"Invalid axis_id '{axis_id}', attempting fallback")
                    axis_id = None

                # Fallback: assign to first axis if only one exists
                if not axis_id and len(comparison_axes) == 1:
                    axis_id = comparison_axes[0].get("axis_id")

                results.append(TopicResult(
                    topic_id=t.get("topic_id", f"topic_{i}"),
                    axis_id=axis_id,
                    label=t.get("label", ""),
                    summary=t.get("summary", ""),
                    stance=t.get("stance", ""),
                    time_horizon=t.get("time_horizon", "medium"),
                    risk_level=t.get("risk_level", "medium"),
                    novelty=t.get("novelty", "medium"),
                    quotes=t.get("quotes", []),
                ))

            return results

        except Exception as e:
            logger.error(f"Semantic topic extraction failed for actor {actor_id}: {e}")
            return []

    async def compare_actors(
        self,
        question: str,  # noqa: ARG002 - kept for potential future use
        topics_by_actor: dict[str, list[TopicResult]],
        actors: list[Actor],
        adapter: LLMAdapter,
    ) -> list[TopicComparisonResult]:
        """
        Compare topics across actors and generate disagreement map.

        Args:
            question: The original question
            topics_by_actor: Map of actor_id to their topic results
            actors: List of actors for name lookup
            adapter: LLM adapter to use

        Returns:
            List of TopicComparisonResult

        IMPORTANT: Topics are aligned by axis_id, NOT by topic_id.
        axis_id comes from the comparison_axes extracted from question intent,
        providing a stable cross-actor alignment coordinate.
        """
        # Build actor lookup
        actor_map = {a.id: a for a in actors}

        # Group topics by axis_id (stable cross-actor alignment)
        # axis_id -> [(actor_id, TopicResult)]
        topics_by_axis: dict[str, list[tuple[str, TopicResult]]] = {}

        for actor_id, topics in topics_by_actor.items():
            for topic in topics:
                # Use axis_id if available, fallback to topic_id for legacy support
                align_key = topic.axis_id or f"unaligned_{topic.topic_id}"
                if align_key not in topics_by_axis:
                    topics_by_axis[align_key] = []
                topics_by_axis[align_key].append((actor_id, topic))

        # Compare each axis
        results = []
        for axis_id, actor_topics in topics_by_axis.items():
            # Skip unaligned topics that only one actor has
            if axis_id.startswith("unaligned_") and len(actor_topics) < 2:
                continue

            # Only compare if at least 2 actors have this axis
            if len(actor_topics) < 2:
                continue

            # Get the label (prefer axis label from first topic with valid axis_id)
            label = actor_topics[0][1].label or axis_id

            # Build positions for comparison
            positions = []
            for actor_id, topic in actor_topics:
                actor = actor_map.get(actor_id)
                positions.append({
                    "actor_id": actor_id,
                    "actor_name": actor.name if actor else "Unknown",
                    "summary": topic.summary,
                    "stance": topic.stance,
                    "quotes": topic.quotes[:2] if topic.quotes else [],
                })

            # Call LLM for comparison - NO fallback allowed
            prompt = await self.prompt_service.render_template("cross_actor_compare", {
                "topic_label": label,
                "actor_positions": json.dumps(positions, ensure_ascii=False),
            })

            try:
                full_response = ""
                async for token in adapter.stream_completion(
                    messages=[{"role": "user", "content": prompt}],
                    system_prompt="你是一个专业的观点比较专家。请以JSON格式返回比较结果。",
                    max_tokens=1024,
                    temperature=0.3,
                ):
                    full_response += token

                data = parse_json_response(full_response)

                # Build actor positions result
                actor_positions = [
                    ActorPositionResult(
                        actor_id=p["actor_id"],
                        actor_name=p["actor_name"],
                        stance_label=p.get("stance", ""),
                        summary=p["summary"],
                        quotes=p.get("quotes", []),
                    )
                    for p in positions
                ]

                # Use axis_id as topic_id for stable cross-phase comparison
                results.append(TopicComparisonResult(
                    topic_id=axis_id,  # Use axis_id as the stable identifier
                    label=label,
                    salience=float(data.get("salience", 0.5)),
                    disagreement_score=float(data.get("disagreement_score", 0.5)),
                    status=data.get("status", "partial"),
                    difference_types=data.get("difference_types", []),
                    agreement_summary=data.get("agreement_summary", ""),
                    disagreement_summary=data.get("disagreement_summary", ""),
                    actor_positions=actor_positions,
                ))

            except Exception as e:
                logger.error(f"Topic comparison failed for {axis_id}: {e}")
                # Add with default values
                actor_positions = [
                    ActorPositionResult(
                        actor_id=p["actor_id"],
                        actor_name=p["actor_name"],
                        stance_label=p.get("stance", ""),
                        summary=p["summary"],
                        quotes=p.get("quotes", []),
                    )
                    for p in positions
                ]

                # Calculate simple disagreement based on stance differences
                stances = [p.get("stance", "") for p in positions]
                unique_stances = len(set(stances)) if stances else 1

                results.append(TopicComparisonResult(
                    topic_id=axis_id,  # Use axis_id as the stable identifier
                    label=label,
                    salience=0.5,
                    disagreement_score=min(1.0, unique_stances / max(len(positions), 1)),
                    status="partial",
                    difference_types=["stance"],
                    agreement_summary="",
                    disagreement_summary="立场存在差异",
                    actor_positions=actor_positions,
                ))

        # Sort by salience (most important first)
        results.sort(key=lambda x: x.salience, reverse=True)

        return results

    async def save_question_intent(
        self,
        session_id: str,
        result: QuestionIntentResult,
    ) -> QuestionIntent:
        """Save question intent analysis to database."""
        intent = QuestionIntent(
            session_id=session_id,
            question_type=result.question_type,
            user_goal=result.user_goal,
            time_horizons=result.time_horizons,
            comparison_axes=result.comparison_axes,
        )
        self.db.add(intent)
        await self.db.commit()
        await self.db.refresh(intent)
        return intent

    async def save_semantic_topics(
        self,
        session_id: str,
        round_number: int,
        phase: str,
        actor_id: str,
        topics: list[TopicResult],
        cycle: int = 0,  # noqa: ARG002 - kept for API consistency
    ) -> list[SemanticTopic]:
        """Save semantic topics to database."""
        db_topics = []
        for t in topics:
            db_topic = SemanticTopic(
                session_id=session_id,
                round_number=round_number,
                phase=phase,
                actor_id=actor_id,
                topic_id=t.topic_id,
                axis_id=t.axis_id,
                label=t.label,
                summary=t.summary,
                stance=t.stance,
                time_horizon=t.time_horizon,
                risk_level=t.risk_level,
                novelty=t.novelty,
                quotes=t.quotes,
            )
            self.db.add(db_topic)
            db_topics.append(db_topic)

        await self.db.commit()
        return db_topics

    async def save_semantic_comparisons(
        self,
        session_id: str,
        round_number: int,
        phase: str,
        comparisons: list[TopicComparisonResult],
        cycle: int = 0,  # noqa: ARG002 - kept for API consistency
    ) -> list[SemanticComparison]:
        """Save semantic comparisons to database."""
        db_comparisons = []
        for c in comparisons:
            actor_positions = [
                {
                    "actor_id": p.actor_id,
                    "actor_name": p.actor_name,
                    "stance_label": p.stance_label,
                    "summary": p.summary,
                    "quotes": p.quotes,
                }
                for p in c.actor_positions
            ]

            db_comp = SemanticComparison(
                session_id=session_id,
                round_number=round_number,
                phase=phase,
                topic_id=c.topic_id,
                label=c.label,
                salience=c.salience,
                disagreement_score=c.disagreement_score,
                status=c.status,
                difference_types=c.difference_types,
                agreement_summary=c.agreement_summary,
                disagreement_summary=c.disagreement_summary,
                actor_positions=actor_positions,
            )
            self.db.add(db_comp)
            db_comparisons.append(db_comp)

        await self.db.commit()
        return db_comparisons

    async def get_latest_comparisons(
        self,
        session_id: str,
    ) -> list[SemanticComparison]:
        """Get the latest semantic comparisons for a session."""
        result = await self.db.execute(
            select(SemanticComparison)
            .where(SemanticComparison.session_id == session_id)
            .order_by(SemanticComparison.round_number.desc())
        )
        return list(result.scalars().all())