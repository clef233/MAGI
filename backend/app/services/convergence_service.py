"""
Convergence Service - Determines if actor responses have converged.

Uses the judge model to analyze similarity and determine if more rounds
would be beneficial.
"""

import json
import logging
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import Actor, SemanticComparison
from app.services.llm_adapter import create_adapter

logger = logging.getLogger('magi.convergence')


class ConvergenceResult:
    """Result of a convergence check."""

    def __init__(
        self,
        converged: bool,
        score: float,
        reason: str,
        agreements: list[str] = None,
        disagreements: list[str] = None,
    ):
        self.converged = converged
        self.score = score
        self.reason = reason
        self.agreements = agreements or []
        self.disagreements = disagreements or []

    def to_dict(self) -> dict:
        return {
            "converged": self.converged,
            "score": self.score,
            "reason": self.reason,
            "agreements": self.agreements,
            "disagreements": self.disagreements,
        }


async def check_convergence_with_semantic(
    comparisons: List[SemanticComparison],
    threshold: float = 0.85,
) -> ConvergenceResult:
    """
    Check convergence based on semantic comparison results.

    This is a more sophisticated convergence check that uses the
    semantic disagreement map instead of raw text comparison.

    Args:
        comparisons: List of SemanticComparison objects
        threshold: Convergence threshold (0-1)

    Returns:
        ConvergenceResult with convergence status and details
    """
    if not comparisons:
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason="No semantic comparisons available",
        )

    # Count high disagreement topics
    high_disagreement_topics = [
        c for c in comparisons
        if c.disagreement_score > 0.6
    ]
    high_disagreement_count = len(high_disagreement_topics)

    # Calculate average disagreement
    total_disagreement = sum(c.disagreement_score for c in comparisons)
    avg_disagreement = total_disagreement / len(comparisons)

    # Calculate convergence score (inverse of disagreement)
    convergence_score = 1.0 - avg_disagreement

    # Determine convergence
    # Converged if:
    # 1. No high disagreement topics, OR
    # 2. Average disagreement is below threshold
    converged = (
        high_disagreement_count == 0 or
        convergence_score >= threshold
    )

    # Build agreements and disagreements lists
    agreements = []
    disagreements = []

    for c in comparisons:
        if c.status == "converged" or c.disagreement_score <= 0.3:
            if c.agreement_summary:
                agreements.append(f"{c.label}: {c.agreement_summary}")
            else:
                agreements.append(c.label)
        elif c.disagreement_score > 0.6:
            if c.disagreement_summary:
                disagreements.append(f"{c.label}: {c.disagreement_summary}")
            else:
                disagreements.append(c.label)

    # Build reason
    if converged:
        if high_disagreement_count == 0:
            reason = "所有主题都已达成共识"
        else:
            reason = f"共识度达到 {round(convergence_score * 100)}%，已超过阈值"
    else:
        reason = f"仍有 {high_disagreement_count} 个主题存在明显分歧"

    return ConvergenceResult(
        converged=converged,
        score=convergence_score,
        reason=reason,
        agreements=agreements,
        disagreements=disagreements,
    )


async def check_convergence(
    db: AsyncSession,
    judge_actor_id: str,
    question: str,
    responses: dict[str, str],  # actor_id -> response content
    threshold: float = 0.85,
) -> ConvergenceResult:
    """
    Check if responses have converged using the judge model.

    Args:
        db: Database session
        judge_actor_id: ID of the actor to use for convergence check
        question: The original question
        responses: Map of actor_id to their latest response
        threshold: Convergence threshold (0-1)

    Returns:
        ConvergenceResult with convergence status and details
    """
    # Get judge actor
    result = await db.execute(
        select(Actor).where(Actor.id == judge_actor_id)
    )
    judge = result.scalar_one_or_none()

    if not judge:
        logger.error(f"Judge actor {judge_actor_id} not found")
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason="Judge actor not found",
        )

    # Build the prompt
    response_list = []
    for actor_id, content in responses.items():
        # Get actor name
        actor_result = await db.execute(
            select(Actor.name).where(Actor.id == actor_id)
        )
        actor_name = actor_result.scalar_one_or_none() or "Unknown"
        response_list.append(f"**{actor_name}**:\n{content}")

    prompt = f"""你是一个收敛判断器，需要判断以下回答是否已经收敛（达成足够共识）。

原始问题：{question}

各参与者的最新回答：

{chr(10).join(response_list)}

请判断这些回答是否已收敛。收敛的标准是：
1. 核心观点基本一致
2. 主要分歧已经缩小到次要细节
3. 不太可能通过更多轮次获得显著改进

请以 JSON 格式返回：
{{
  "converged": true或false,
  "score": 0.0到1.0之间的数值,
  "reason": "判断理由",
  "agreements": ["已达成共识的点"],
  "disagreements": ["仍存在分歧的点"]
}}
"""

    try:
            adapter = create_adapter(
                provider=judge.provider.value,
                api_key=judge.api_key,
                base_url=judge.base_url,
                model=judge.model,
            )

            full_response = ""
            async for token in adapter.stream_completion(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="你是一个专业的收敛判断器。请以JSON格式返回判断结果。",
                max_tokens=judge.max_tokens,
                temperature=0.3,
            ):
                full_response += token

            # Parse JSON response
            json_start = full_response.find("{")
            json_end = full_response.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                json_str = full_response[json_start:json_end]
                data = json.loads(json_str)

                converged = data.get("converged", False)
                score = data.get("score")

                # Validate score - if not provided or invalid, mark as unavailable
                if score is None:
                    score = None
                    converged = False
                else:
                    try:
                        score = float(score)
                        # Apply threshold
                        if score >= threshold:
                            converged = True
                    except (ValueError, TypeError):
                        score = None
                        converged = False

                return ConvergenceResult(
                    converged=converged,
                    score=score if score is not None else 0.0,
                    reason=data.get("reason", "") + (" (置信度不可用)" if score is None else ""),
                    agreements=data.get("agreements", []),
                    disagreements=data.get("disagreements", []),
                )
            else:
                logger.warning(f"Could not parse convergence response: {full_response}")
                return ConvergenceResult(
                    converged=False,
                    score=0.0,
                    reason="无法解析收敛判断结果",
                )

    except Exception as e:
        logger.error(f"Convergence check failed: {e}")
        return ConvergenceResult(
            converged=False,
            score=0.0,
            reason=f"Error: {str(e)}",
        )