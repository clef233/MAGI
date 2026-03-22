"""
Prompt Serializer - Unified block serialization for self/peer disambiguation.

This module provides structured XML-like blocks for LLM context, ensuring:
1. All answers/reviews have explicit actor attribution
2. Self vs peer materials are structurally symmetric
3. No hardcoded model names in templates
"""

from typing import Optional
from enum import Enum


class BlockPhase(str, Enum):
    """Phase of the debate."""
    INITIAL = "initial"
    REVISION = "revision"
    FINAL = "final"


class BlockRole(str, Enum):
    """Role of the actor relative to the block content."""
    SELF = "self"       # The current actor's own content
    PEER = "peer"       # Another actor's content


def serialize_answer_block(
    actor_name: str,
    phase: BlockPhase,
    role: BlockRole,
    content: str,
) -> str:
    """
    Serialize an answer block with full actor attribution.

    Args:
        actor_name: The name of the actor who produced this answer
        phase: The debate phase (initial, revision, final)
        role: Whether this is self (current actor) or peer (other actor)
        content: The answer text

    Returns:
        XML-like block string with actor attribution

    Example output:
        <answer actor_name="GLM" phase="initial" role="self">
        ...content...
        </answer>
    """
    return f'''<answer actor_name="{actor_name}" phase="{phase.value}" role="{role.value}">
{content}
</answer>'''


def serialize_review_block(
    reviewer_name: str,
    about_actor_name: str,
    phase: BlockPhase,
    content: str,
) -> str:
    """
    Serialize a review block with full attribution.

    Args:
        reviewer_name: The name of the actor who wrote the review
        about_actor_name: The name of the actor being reviewed
        phase: The debate phase
        content: The review text

    Returns:
        XML-like block string with full attribution

    Example output:
        <review reviewer_name="DeepSeek" about_actor="GLM" phase="initial">
        ...content...
        </review>
    """
    return f'''<review reviewer_name="{reviewer_name}" about_actor="{about_actor_name}" phase="{phase.value}">
{content}
</review>'''


def serialize_answer_blocks(
    answers: list[dict],
    self_actor_name: str,
    phase: BlockPhase,
) -> str:
    """
    Serialize multiple answer blocks, distinguishing self from peer.

    Args:
        answers: List of dicts with keys: actor_name, content
        self_actor_name: The name of the current actor (to determine role)
        phase: The debate phase

    Returns:
        Combined block strings separated by newlines
    """
    blocks = []
    for ans in answers:
        role = BlockRole.SELF if ans["actor_name"] == self_actor_name else BlockRole.PEER
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=phase,
            role=role,
            content=ans["content"],
        ))
    return "\n\n".join(blocks)


def serialize_peer_answer_blocks(
    answers: list[dict],
    phase: BlockPhase,
) -> str:
    """
    Serialize peer answer blocks (all marked as peer role).

    Args:
        answers: List of dicts with keys: actor_name, content
        phase: The debate phase

    Returns:
        Combined block strings
    """
    blocks = []
    for ans in answers:
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=phase,
            role=BlockRole.PEER,
            content=ans["content"],
        ))
    return "\n\n".join(blocks)


def serialize_peer_review_blocks(
    reviews: list[dict],
    phase: BlockPhase,
) -> str:
    """
    Serialize peer review blocks.

    Args:
        reviews: List of dicts with keys: reviewer_name, about_actor_name, content
        phase: The debate phase

    Returns:
        Combined block strings
    """
    blocks = []
    for rev in reviews:
        blocks.append(serialize_review_block(
            reviewer_name=rev["reviewer_name"],
            about_actor_name=rev["about_actor_name"],
            phase=phase,
            content=rev["content"],
        ))
    return "\n\n".join(blocks)


def serialize_history_blocks(
    history_items: list[dict],
    self_actor_name: str,
) -> str:
    """
    Serialize history blocks for summary phase.

    Args:
        history_items: List of dicts with keys: actor_name, role, cycle, content
        self_actor_name: The name of the current actor viewing history

    Returns:
        Combined block strings
    """
    blocks = []
    for item in history_items:
        role = BlockRole.SELF if item["actor_name"] == self_actor_name else BlockRole.PEER
        phase = BlockPhase.INITIAL if item.get("cycle", 0) == 0 else BlockPhase.REVISION

        if item.get("role") == "review":
            # Review block
            blocks.append(serialize_review_block(
                reviewer_name=item["actor_name"],
                about_actor_name=item.get("about_actor_name", "unknown"),
                phase=phase,
                content=item["content"],
            ))
        else:
            # Answer block
            blocks.append(serialize_answer_block(
                actor_name=item["actor_name"],
                phase=phase,
                role=role,
                content=item["content"],
            ))
    return "\n\n".join(blocks)


def serialize_latest_answer_blocks(
    answers: list[dict],
) -> str:
    """
    Serialize latest answer blocks for convergence check.

    Args:
        answers: List of dicts with keys: actor_name, content

    Returns:
        Combined block strings (all as peer role for neutrality)
    """
    blocks = []
    for ans in answers:
        blocks.append(serialize_answer_block(
            actor_name=ans["actor_name"],
            phase=BlockPhase.FINAL,
            role=BlockRole.PEER,  # Neutral for convergence check
            content=ans["content"],
        ))
    return "\n\n".join(blocks)