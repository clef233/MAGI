"""
Prompt Service - Loads and renders prompt templates from database.

This is the single source of truth for all prompts.
NO prompts should be hardcoded in the engine or other services.
"""

import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import WorkflowPromptTemplate, PromptPreset
from app.services.prompt_serializer import (
    BlockPhase,
    serialize_answer_block,
    serialize_peer_answer_blocks,
    serialize_peer_review_blocks,
    serialize_latest_answer_blocks,
    serialize_history_blocks,
    BlockRole,
)

logger = logging.getLogger('magi.prompts')


class PromptError(Exception):
    """Raised when a required prompt template is missing."""
    pass


class PromptService:
    """Service for loading and rendering prompts from database."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._template_cache: dict[str, WorkflowPromptTemplate] = {}
        self._preset_cache: dict[str, PromptPreset] = {}

    async def load_templates(self):
        """Load all templates into cache."""
        if self._template_cache:
            return

        result = await self.db.execute(
            select(WorkflowPromptTemplate)
        )
        templates = list(result.scalars().all())

        for t in templates:
            self._template_cache[t.key] = t

        logger.info(f"Loaded {len(templates)} workflow templates")

    async def load_presets(self):
        """Load all presets into cache."""
        if self._preset_cache:
            return

        result = await self.db.execute(
            select(PromptPreset)
        )
        presets = list(result.scalars().all())

        for p in presets:
            self._preset_cache[p.key] = p

        logger.info(f"Loaded {len(presets)} prompt presets")

    async def get_template(self, key: str) -> WorkflowPromptTemplate:
        """
        Get a workflow prompt template by key.

        Raises PromptError if not found.
        """
        if not self._template_cache:
            await self.load_templates()

        template = self._template_cache.get(key)
        if not template:
            raise PromptError(
                f"Required workflow prompt template '{key}' not found in database. "
                "Please initialize the database with seed data."
            )
        return template

    async def get_preset(self, key: str) -> PromptPreset:
        """
        Get a prompt preset by key.

        Raises PromptError if not found.
        """
        if not self._preset_cache:
            await self.load_presets()

        preset = self._preset_cache.get(key)
        if not preset:
            raise PromptError(
                f"Required prompt preset '{key}' not found in database. "
                "Please initialize the database with seed data."
            )
        return preset

    def render(self, template_text: str, variables: dict[str, str]) -> str:
        """
        Render a template with the given variables.

        Uses simple {{variable}} replacement.
        """
        result = template_text
        for key, value in variables.items():
            result = result.replace(f"{{{{{key}}}}}", str(value))
        return result

    async def render_template(self, key: str, variables: dict[str, str]) -> str:
        """
        Get and render a workflow template.

        Raises PromptError if template not found or missing variables.
        """
        template = await self.get_template(key)

        # Check for missing required variables
        missing = []
        for var in (template.required_variables or []):
            if var not in variables:
                missing.append(var)

        if missing:
            raise PromptError(
                f"Template '{key}' requires variables: {missing}. "
                f"Provided: {list(variables.keys())}"
            )

        return self.render(template.template_text, variables)

    async def get_initial_answer_prompt(
        self,
        question: str,
        actor_name: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the system prompt for initial answer phase."""
        base_prompt = await self.render_template("initial_answer", {
            "question": question,
            "actor_name": actor_name,
        })
        if actor_custom_prompt:
            base_prompt = f"{actor_custom_prompt}\n\n{base_prompt}"
        return base_prompt

    async def get_review_prompt(
        self,
        question: str,
        self_actor_name: str,
        self_answer_block: str,
        peer_answer_blocks: str,
    ) -> str:
        """Get the prompt for peer review phase.

        Args:
            question: The original question
            self_actor_name: Name of the current actor
            self_answer_block: Serialized block of the actor's own answer
            peer_answer_blocks: Serialized blocks of peer answers
        """
        return await self.render_template("peer_review", {
            "question": question,
            "self_actor_name": self_actor_name,
            "self_answer_block": self_answer_block,
            "peer_answer_blocks": peer_answer_blocks,
        })

    async def get_revision_prompt(
        self,
        question: str,
        self_actor_name: str,
        self_previous_answer_block: str,
        peer_review_blocks: str,
    ) -> str:
        """Get the prompt for revision phase.

        Args:
            question: The original question
            self_actor_name: Name of the current actor
            self_previous_answer_block: Serialized block of the actor's previous answer
            peer_review_blocks: Serialized blocks of peer reviews about this actor
        """
        return await self.render_template("revision", {
            "question": question,
            "self_actor_name": self_actor_name,
            "self_previous_answer_block": self_previous_answer_block,
            "peer_review_blocks": peer_review_blocks,
        })

    async def get_summary_prompt(
        self,
        question: str,
        self_actor_name: str,
        history_blocks: str,
    ) -> str:
        """Get the prompt for summary phase.

        Args:
            question: The original question
            self_actor_name: Name of the judge actor
            history_blocks: Serialized blocks of all history
        """
        return await self.render_template("summary", {
            "question": question,
            "self_actor_name": self_actor_name,
            "history_blocks": history_blocks,
        })

    async def get_convergence_prompt(
        self,
        question: str,
        latest_answer_blocks: str,
    ) -> str:
        """Get the prompt for convergence check.

        Args:
            question: The original question
            latest_answer_blocks: Serialized blocks of all latest answers
        """
        return await self.render_template("convergence_check", {
            "question": question,
            "latest_answer_blocks": latest_answer_blocks,
        })

    async def get_final_answer_prompt(
        self,
        question: str,
        self_actor_name: str,
        actor_answer_blocks: str,
        convergence_info: str = "",
    ) -> str:
        """Get the prompt for final answer phase.

        Args:
            question: The original question
            self_actor_name: Name of the judge actor
            actor_answer_blocks: Serialized blocks of all actor answers
            convergence_info: Convergence analysis results
        """
        return await self.render_template("final_answer", {
            "question": question,
            "self_actor_name": self_actor_name,
            "actor_answer_blocks": actor_answer_blocks,
            "convergence_info": convergence_info,
        })

    # === Helper methods for serialization ===

    def build_self_answer_block(
        self,
        actor_name: str,
        content: str,
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build a self answer block for the current actor."""
        return serialize_answer_block(
            actor_name=actor_name,
            phase=phase,
            role=BlockRole.SELF,
            content=content,
        )

    def build_peer_answer_blocks(
        self,
        answers: list[dict],
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build peer answer blocks from a list of answers.

        Args:
            answers: List of dicts with keys: actor_name, content
            phase: The debate phase
        """
        return serialize_peer_answer_blocks(answers, phase)

    def build_peer_review_blocks(
        self,
        reviews: list[dict],
        phase: BlockPhase = BlockPhase.INITIAL,
    ) -> str:
        """Build peer review blocks from a list of reviews.

        Args:
            reviews: List of dicts with keys: reviewer_name, about_actor_name, content
            phase: The debate phase
        """
        return serialize_peer_review_blocks(reviews, phase)

    def build_latest_answer_blocks(
        self,
        answers: list[dict],
    ) -> str:
        """Build latest answer blocks for convergence check.

        Args:
            answers: List of dicts with keys: actor_name, content
        """
        return serialize_latest_answer_blocks(answers)

    def build_history_blocks(
        self,
        history_items: list[dict],
        self_actor_name: str,
    ) -> str:
        """Build history blocks for summary phase.

        Args:
            history_items: List of dicts with keys: actor_name, role, cycle, content
            self_actor_name: Name of the actor viewing the history
        """
        return serialize_history_blocks(history_items, self_actor_name)