from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from pydantic import BaseModel

from app.services.database import get_db
from app.models.database import Actor as DBActor, SemanticModelConfig, ProviderType, PromptPreset
from app.models.schemas import ActorResponse, PromptConfigBase

router = APIRouter(prefix="/api/presets", tags=["presets"])


# ========== 预设配置定义 ==========

PROVIDER_PRESETS = {
    "siliconflow": {
        "name": "硅基流动 SiliconFlow",
        "description": "国内 AI 模型聚合平台，支持多种模型，性价比高",
        "base_url": "https://api.siliconflow.cn/v1",
        "provider": "custom",
        "api_format": "openai_compatible",
        "actors": [
            {
                "name": "MiniMax-M2.5",
                "model": "Pro/MiniMaxAI/MiniMax-M2.5",
                "display_color": "#4ECDC4",
                "icon": "🔵",
                "is_meta_judge": False,
                "preset_key": "innovative",
            },
            {
                "name": "GLM-5",
                "model": "Pro/zai-org/GLM-5",
                "display_color": "#FF6B35",
                "icon": "🔶",
                "is_meta_judge": False,
                "preset_key": "conservative",
            },
            {
                "name": "Kimi-K2.5",
                "model": "Pro/moonshotai/Kimi-K2.5",
                "display_color": "#A855F7",
                "icon": "🟣",
                "is_meta_judge": True,
                "preset_key": "synthesizer",
            },
        ],
        "semantic_model": {
            "model": "Qwen/Qwen3-14B",
            "max_tokens": 2048,
            "temperature": 0.3,
        },
    },
}


# ========== 请求/响应 Schema ==========

class QuickSetupRequest(BaseModel):
    provider_preset: str  # e.g. "siliconflow"
    api_key: str


class QuickSetupActorResult(BaseModel):
    id: str
    name: str
    model: str
    is_meta_judge: bool


class QuickSetupResponse(BaseModel):
    success: bool
    message: str
    actors_created: List[QuickSetupActorResult]
    semantic_configured: bool


class ProviderPresetInfo(BaseModel):
    key: str
    name: str
    description: str
    actor_count: int
    actor_names: List[str]
    semantic_model: str


# ========== API 端点 ==========

@router.get("/providers")
async def list_provider_presets() -> List[ProviderPresetInfo]:
    """列出所有可用的服务商预设配置"""
    result = []
    for key, preset in PROVIDER_PRESETS.items():
        result.append(ProviderPresetInfo(
            key=key,
            name=preset["name"],
            description=preset["description"],
            actor_count=len(preset["actors"]),
            actor_names=[a["name"] for a in preset["actors"]],
            semantic_model=preset["semantic_model"]["model"],
        ))
    return result


@router.post("/quick-setup", response_model=QuickSetupResponse)
async def quick_setup(
    data: QuickSetupRequest,
    db: AsyncSession = Depends(get_db),
):
    """一键配置：根据服务商预设创建所有 Actor 和语义分析模型"""

    preset = PROVIDER_PRESETS.get(data.provider_preset)
    if not preset:
        raise HTTPException(
            status_code=400,
            detail=f"未知的服务商预设: {data.provider_preset}，"
                   f"可用选项: {list(PROVIDER_PRESETS.keys())}"
        )

    if not data.api_key or not data.api_key.strip():
        raise HTTPException(status_code=400, detail="API Key 不能为空")

    api_key = data.api_key.strip()
    base_url = preset["base_url"]
    provider = preset["provider"]
    api_format = preset["api_format"]

    # 加载 prompt presets
    prompt_presets_map = {}
    result = await db.execute(select(PromptPreset))
    for pp in result.scalars().all():
        prompt_presets_map[pp.key] = pp

    actors_created = []

    # 检查是否已存在同名 actor（避免重复创建）
    result = await db.execute(
        select(DBActor).where(DBActor.is_active == True)
    )
    existing_names = {a.name for a in result.scalars().all()}

    for actor_def in preset["actors"]:
        # 跳过已存在的同名 actor
        if actor_def["name"] in existing_names:
            # 查找已存在的 actor，返回其信息
            result = await db.execute(
                select(DBActor).where(
                    DBActor.name == actor_def["name"],
                    DBActor.is_active == True,
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                actors_created.append(QuickSetupActorResult(
                    id=existing.id,
                    name=existing.name,
                    model=existing.model,
                    is_meta_judge=existing.is_meta_judge,
                ))
            continue

        # 获取对应的 prompt preset
        pp = prompt_presets_map.get(actor_def["preset_key"])
        system_prompt = pp.system_prompt if pp else ""
        review_prompt = pp.review_prompt if pp else ""
        revision_prompt = pp.revision_prompt if pp else ""
        personality = pp.personality if pp else "neutral"
        custom_instructions = pp.custom_instructions if pp else ""

        actor = DBActor(
            name=actor_def["name"],
            display_color=actor_def["display_color"],
            icon=actor_def["icon"],
            is_meta_judge=actor_def["is_meta_judge"],
            provider=ProviderType(provider),
            api_format=api_format,
            base_url=base_url,
            api_key=api_key,
            model=actor_def["model"],
            max_tokens=4096,
            temperature=0.7,
            system_prompt=system_prompt,
            review_prompt=review_prompt,
            revision_prompt=revision_prompt,
            personality=personality,
            custom_instructions=custom_instructions,
        )
        db.add(actor)
        await db.flush()

        actors_created.append(QuickSetupActorResult(
            id=actor.id,
            name=actor.name,
            model=actor.model,
            is_meta_judge=actor.is_meta_judge,
        ))

    # 配置语义分析模型
    semantic_configured = False
    semantic_def = preset.get("semantic_model")
    if semantic_def:
        # 检查是否已有配置
        result = await db.execute(
            select(SemanticModelConfig).limit(1)
        )
        existing_config = result.scalar_one_or_none()

        if existing_config:
            # 更新现有配置
            existing_config.provider = ProviderType(provider)
            existing_config.api_format = api_format
            existing_config.base_url = base_url
            existing_config.api_key = api_key
            existing_config.model = semantic_def["model"]
            existing_config.max_tokens = semantic_def.get("max_tokens", 2048)
            existing_config.temperature = semantic_def.get("temperature", 0.3)
            existing_config.is_active = True
        else:
            # 创建新配置
            config = SemanticModelConfig(
                provider=ProviderType(provider),
                api_format=api_format,
                base_url=base_url,
                api_key=api_key,
                model=semantic_def["model"],
                max_tokens=semantic_def.get("max_tokens", 2048),
                temperature=semantic_def.get("temperature", 0.3),
                is_active=True,
            )
            db.add(config)

        semantic_configured = True

    await db.commit()

    skipped = len([a for a in preset["actors"] if a["name"] in existing_names])
    created = len(actors_created) - skipped

    message = f"配置完成！创建了 {created} 个 Actor"
    if skipped > 0:
        message += f"（跳过 {skipped} 个已存在的）"
    if semantic_configured:
        message += "，语义分析模型已配置"

    return QuickSetupResponse(
        success=True,
        message=message,
        actors_created=actors_created,
        semantic_configured=semantic_configured,
    )


@router.get("/actors")
async def get_preset_actors() -> List[dict]:
    """Get preset actor templates (legacy endpoint)"""
    return [
        {
            "name": "CASPER",
            "display_color": "#FF6B35",
            "icon": "🔶",
            "is_meta_judge": False,
            "api_config": {
                "provider": "openai",
                "model": "gpt-4o",
                "api_format": "openai_compatible",
            },
            "prompt_config": {
                "system_prompt": "",
                "review_prompt": "",
                "revision_prompt": "",
                "personality": "conservative",
                "custom_instructions": "",
            },
            "description": "Conservative analyst - cautious and thorough",
        },
    ]


@router.get("/prompts")
async def get_preset_prompts() -> dict:
    """Get preset prompt templates (legacy endpoint)"""
    return {}