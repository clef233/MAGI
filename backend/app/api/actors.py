from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.services.database import get_db
from app.models.database import Actor as DBActor
from app.models.schemas import (
    ActorCreate,
    ActorUpdate,
    ActorResponse,
    ActorDetail,
)

router = APIRouter(prefix="/api/actors", tags=["actors"])


@router.get("", response_model=List[ActorResponse])
async def list_actors(db: AsyncSession = Depends(get_db)):
    """Get all active actors"""
    result = await db.execute(
        select(DBActor).where(DBActor.is_active == True).order_by(DBActor.created_at.desc())
    )
    actors = result.scalars().all()
    return [
        ActorResponse(
            id=actor.id,
            name=actor.name,
            display_color=actor.display_color,
            icon=actor.icon,
            is_meta_judge=actor.is_meta_judge,
            provider=actor.provider,
            model=actor.model,
            created_at=actor.created_at,
            updated_at=actor.updated_at,
        )
        for actor in actors
    ]


@router.get("/{actor_id}", response_model=ActorDetail)
async def get_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Get single actor details"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    return ActorDetail(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        api_format=actor.api_format,
        base_url=actor.base_url,
        max_tokens=actor.max_tokens,
        temperature=actor.temperature,
        extra_params=actor.extra_params or {},
        system_prompt=actor.system_prompt,
        review_prompt=actor.review_prompt,
        revision_prompt=actor.revision_prompt,
        personality=actor.personality,
        custom_instructions=actor.custom_instructions,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.post("", response_model=ActorResponse)
async def create_actor(data: ActorCreate, db: AsyncSession = Depends(get_db)):
    """Create new actor"""
    actor = DBActor(
        name=data.name,
        display_color=data.display_color,
        icon=data.icon,
        is_meta_judge=data.is_meta_judge,
        provider=data.api_config.provider,
        api_format=data.api_config.api_format,
        base_url=data.api_config.base_url,
        api_key=data.api_config.api_key,
        model=data.api_config.model,
        max_tokens=data.api_config.max_tokens,
        temperature=data.api_config.temperature,
        extra_params=data.api_config.extra_params,
        system_prompt=data.prompt_config.system_prompt,
        review_prompt=data.prompt_config.review_prompt,
        revision_prompt=data.prompt_config.revision_prompt,
        personality=data.prompt_config.personality,
        custom_instructions=data.prompt_config.custom_instructions,
    )
    db.add(actor)
    await db.commit()
    await db.refresh(actor)

    return ActorResponse(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.put("/{actor_id}", response_model=ActorResponse)
async def update_actor(
    actor_id: str,
    data: ActorUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update actor"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    update_data = data.model_dump(exclude_unset=True)

    if "name" in update_data:
        actor.name = update_data["name"]
    if "display_color" in update_data:
        actor.display_color = update_data["display_color"]
    if "icon" in update_data:
        actor.icon = update_data["icon"]
    if "is_meta_judge" in update_data:
        actor.is_meta_judge = update_data["is_meta_judge"]

    if "api_config" in update_data and update_data["api_config"]:
        api_config = update_data["api_config"]
        if api_config.get("provider") is not None:
            actor.provider = api_config["provider"]
        if api_config.get("api_format") is not None:
            actor.api_format = api_config["api_format"]
        if api_config.get("base_url") is not None:
            actor.base_url = api_config["base_url"]
        # ✅ 只有显式提供 api_key 时才更新，None 表示保留现有
        if api_config.get("api_key") is not None:
            actor.api_key = api_config["api_key"]
        if api_config.get("model") is not None:
            actor.model = api_config["model"]
        if api_config.get("max_tokens") is not None:
            actor.max_tokens = api_config["max_tokens"]
        if api_config.get("temperature") is not None:
            actor.temperature = api_config["temperature"]
        if api_config.get("extra_params") is not None:
            actor.extra_params = api_config["extra_params"]

    if "prompt_config" in update_data and update_data["prompt_config"]:
        prompt_config = update_data["prompt_config"]
        actor.system_prompt = prompt_config.get("system_prompt", actor.system_prompt)
        actor.review_prompt = prompt_config.get("review_prompt", actor.review_prompt)
        actor.revision_prompt = prompt_config.get("revision_prompt", actor.revision_prompt)
        actor.personality = prompt_config.get("personality", actor.personality)
        actor.custom_instructions = prompt_config.get("custom_instructions", actor.custom_instructions)

    await db.commit()
    await db.refresh(actor)

    return ActorResponse(
        id=actor.id,
        name=actor.name,
        display_color=actor.display_color,
        icon=actor.icon,
        is_meta_judge=actor.is_meta_judge,
        provider=actor.provider,
        model=actor.model,
        created_at=actor.created_at,
        updated_at=actor.updated_at,
    )


@router.delete("/{actor_id}")
async def delete_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Delete actor (soft delete)"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    # Check if actor is used in any session
    from app.models.database import DebateSessionActor, DebateSession

    # Check as participant
    result = await db.execute(
        select(DebateSessionActor).where(DebateSessionActor.actor_id == actor_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete actor: already used in debate sessions. Use soft delete instead."
        )

    # Check as judge
    result = await db.execute(
        select(DebateSession).where(DebateSession.judge_actor_id == actor_id).limit(1)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete actor: already used as judge in debate sessions."
        )

    # Soft delete
    actor.is_active = False
    await db.commit()
    return {"message": "Actor deleted successfully"}


@router.post("/{actor_id}/test")
async def test_actor(actor_id: str, db: AsyncSession = Depends(get_db)):
    """Test actor connectivity"""
    result = await db.execute(select(DBActor).where(DBActor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    from app.services.llm_adapter import create_adapter

    try:
        adapter = create_adapter(
            provider=actor.provider.value,
            api_key=actor.api_key,
            base_url=actor.base_url,
            model=actor.model,
        )

        # Simple test message
        response_text = ""
        async for token in adapter.stream_completion(
            messages=[{"role": "user", "content": "Say 'OK' if you can hear me."}],
            max_tokens=50,
        ):
            response_text += token

        return {"status": "success", "response": response_text[:100]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")