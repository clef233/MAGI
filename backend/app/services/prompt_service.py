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
        own_answer: str,
        other_answers: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the prompt for peer review phase."""
        return await self.render_template("peer_review", {
            "question": question,
            "own_answer": own_answer,
            "other_answers": other_answers,
        })

    async def get_revision_prompt(
        self,
        question: str,
        own_answer: str,
        reviews_about_me: str,
        actor_custom_prompt: Optional[str] = None,
    ) -> str:
        """Get the prompt for revision phase."""
        return await self.render_template("revision", {
            "question": question,
            "own_answer": own_answer,
            "reviews_about_me": reviews_about_me,
        })

    async def get_summary_prompt(
        self,
        question: str,
        history: str,
    ) -> str:
        """Get the prompt for summary phase."""
        return await self.render_template("summary", {
            "question": question,
            "history": history,
        })

    async def get_convergence_prompt(
        self,
        question: str,
        latest_answers: str,
    ) -> str:
        """Get the prompt for convergence check."""
        return await self.render_template("convergence_check", {
            "question": question,
            "latest_answers": latest_answers,
        })

    async def get_final_answer_prompt(
        self,
        question: str,
        actor_answers: str,
        convergence_info: str = "",
    ) -> str:
        """Get the prompt for final answer phase."""
        return await self.render_template("final_answer", {
            "question": question,
            "actor_answers": actor_answers,
            "convergence_info": convergence_info,
        })