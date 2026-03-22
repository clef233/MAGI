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
from app.models.database import WorkflowPromptTemplate, PromptPreset, SemanticModelConfig
from app.models.schemas import (
    SemanticModelConfigResponse,
    SemanticModelConfigCreate,
    SemanticModelConfigUpdate,
)

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


# ========== Semantic Model Config ==========

@router.get("/semantic-model", response_model=SemanticModelConfigResponse)
async def get_semantic_model_config(db: AsyncSession = Depends(get_db)):
    """Get the semantic model configuration (singleton)."""
    result = await db.execute(
        select(SemanticModelConfig).where(SemanticModelConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=404,
            detail="Semantic model not configured. Please configure it in Settings."
        )
    return config


@router.put("/semantic-model", response_model=SemanticModelConfigResponse)
async def upsert_semantic_model_config(
    data: SemanticModelConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create or update the semantic model configuration (singleton).
    If a config exists, it will be updated. Otherwise, a new one is created.
    """
    result = await db.execute(
        select(SemanticModelConfig).limit(1)
    )
    config = result.scalar_one_or_none()

    if config:
        # Update existing
        config.provider = data.provider
        config.api_format = data.api_format
        config.base_url = data.base_url
        # Only update api_key if provided (non-empty string)
        if data.api_key and data.api_key.strip():
            config.api_key = data.api_key
        config.model = data.model
        config.max_tokens = data.max_tokens
        config.temperature = data.temperature
        config.question_intent_timeout = data.question_intent_timeout
        config.topic_extraction_timeout = data.topic_extraction_timeout
        config.cross_compare_timeout = data.cross_compare_timeout
        config.is_active = True
    else:
        # Create new - api_key is required
        if not data.api_key or not data.api_key.strip():
            raise HTTPException(status_code=400, detail="api_key is required for new configuration")
        config = SemanticModelConfig(
            provider=data.provider,
            api_format=data.api_format,
            base_url=data.base_url,
            api_key=data.api_key,
            model=data.model,
            max_tokens=data.max_tokens,
            temperature=data.temperature,
            question_intent_timeout=data.question_intent_timeout,
            topic_extraction_timeout=data.topic_extraction_timeout,
            cross_compare_timeout=data.cross_compare_timeout,
            is_active=True,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return config


@router.patch("/semantic-model", response_model=SemanticModelConfigResponse)
async def patch_semantic_model_config(
    data: SemanticModelConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Partially update semantic model configuration."""
    result = await db.execute(
        select(SemanticModelConfig).where(SemanticModelConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Semantic model not configured.")

    update_data = data.model_dump(exclude_unset=True)
    if "provider" in update_data and update_data["provider"] is not None:
        config.provider = update_data["provider"]
    if "api_format" in update_data and update_data["api_format"] is not None:
        config.api_format = update_data["api_format"]
    if "base_url" in update_data and update_data["base_url"] is not None:
        config.base_url = update_data["base_url"]
    if "api_key" in update_data and update_data["api_key"] is not None:
        config.api_key = update_data["api_key"]
    if "model" in update_data and update_data["model"] is not None:
        config.model = update_data["model"]
    if "max_tokens" in update_data and update_data["max_tokens"] is not None:
        config.max_tokens = update_data["max_tokens"]
    if "temperature" in update_data and update_data["temperature"] is not None:
        config.temperature = update_data["temperature"]
    if "question_intent_timeout" in update_data and update_data["question_intent_timeout"] is not None:
        config.question_intent_timeout = update_data["question_intent_timeout"]
    if "topic_extraction_timeout" in update_data and update_data["topic_extraction_timeout"] is not None:
        config.topic_extraction_timeout = update_data["topic_extraction_timeout"]
    if "cross_compare_timeout" in update_data and update_data["cross_compare_timeout"] is not None:
        config.cross_compare_timeout = update_data["cross_compare_timeout"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        config.is_active = update_data["is_active"]

    await db.commit()
    await db.refresh(config)
    return config


@router.post("/semantic-model/test")
async def test_semantic_model(db: AsyncSession = Depends(get_db)):
    """Test semantic model connectivity."""
    result = await db.execute(
        select(SemanticModelConfig).where(SemanticModelConfig.is_active == True).limit(1)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="Semantic model not configured.")

    from app.services.llm_adapter import create_adapter

    try:
        adapter = create_adapter(
            provider=config.provider.value,
            api_key=config.api_key,
            base_url=config.base_url,
            model=config.model,
        )
        response_text = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": "Say 'OK' if you can hear me."}],
            max_tokens=50,
        ):
            response_text += token
        return {"status": "success", "response": response_text[:100]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")