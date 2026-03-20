"""
Settings API - Manage workflow prompts and prompt presets.
All prompts are stored in DB and editable via Settings UI.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.database import get_db
from app.models.database import WorkflowPromptTemplate, PromptPreset

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ========== Schemas ==========

class WorkflowPromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_text: Optional[str] = None
    required_variables: Optional[List[str]] = None


class WorkflowPromptResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    template_text: str
    required_variables: List[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PromptPresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    review_prompt: Optional[str] = None
    revision_prompt: Optional[str] = None
    personality: Optional[str] = None
    custom_instructions: Optional[str] = None


class PromptPresetResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    system_prompt: str
    review_prompt: str
    revision_prompt: str
    personality: str
    custom_instructions: str
    is_builtin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========== Workflow Prompts ==========

@router.get("/workflow-prompts", response_model=List[WorkflowPromptResponse])
async def list_workflow_prompts(db: AsyncSession = Depends(get_db)):
    """List all workflow prompt templates."""
    result = await db.execute(
        select(WorkflowPromptTemplate).order_by(WorkflowPromptTemplate.key)
    )
    return list(result.scalars().all())


@router.get("/workflow-prompts/{key}", response_model=WorkflowPromptResponse)
async def get_workflow_prompt(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific workflow prompt template."""
    result = await db.execute(
        select(WorkflowPromptTemplate).where(WorkflowPromptTemplate.key == key)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail=f"Workflow prompt '{key}' not found")
    return template


@router.put("/workflow-prompts/{key}", response_model=WorkflowPromptResponse)
async def update_workflow_prompt(
    key: str,
    data: WorkflowPromptUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a workflow prompt template."""
    result = await db.execute(
        select(WorkflowPromptTemplate).where(WorkflowPromptTemplate.key == key)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail=f"Workflow prompt '{key}' not found")

    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.template_text is not None:
        template.template_text = data.template_text
    if data.required_variables is not None:
        template.required_variables = data.required_variables

    await db.commit()
    await db.refresh(template)
    return template


# ========== Prompt Presets ==========

@router.get("/prompt-presets", response_model=List[PromptPresetResponse])
async def list_prompt_presets(db: AsyncSession = Depends(get_db)):
    """List all prompt presets."""
    result = await db.execute(
        select(PromptPreset).order_by(PromptPreset.key)
    )
    return list(result.scalars().all())


@router.get("/prompt-presets/{key}", response_model=PromptPresetResponse)
async def get_prompt_preset(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific prompt preset."""
    result = await db.execute(
        select(PromptPreset).where(PromptPreset.key == key)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Prompt preset '{key}' not found")
    return preset


@router.put("/prompt-presets/{key}", response_model=PromptPresetResponse)
async def update_prompt_preset(
    key: str,
    data: PromptPresetUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a prompt preset."""
    result = await db.execute(
        select(PromptPreset).where(PromptPreset.key == key)
    )
    preset = result.scalar_one_or_none()
    if not preset:
        raise HTTPException(status_code=404, detail=f"Prompt preset '{key}' not found")

    if data.name is not None:
        preset.name = data.name
    if data.description is not None:
        preset.description = data.description
    if data.system_prompt is not None:
        preset.system_prompt = data.system_prompt
    if data.review_prompt is not None:
        preset.review_prompt = data.review_prompt
    if data.revision_prompt is not None:
        preset.revision_prompt = data.revision_prompt
    if data.personality is not None:
        preset.personality = data.personality
    if data.custom_instructions is not None:
        preset.custom_instructions = data.custom_instructions

    await db.commit()
    await db.refresh(preset)
    return preset