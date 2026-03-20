from fastapi import APIRouter
from typing import List
from app.models.schemas import ActorCreate, ActorResponse, APIConfigCreate, PromptConfigBase, ProviderType

router = APIRouter(prefix="/api/presets", tags=["presets"])


# Default prompt templates
DEFAULT_PROMPTS = {
    "conservative": PromptConfigBase(
        system_prompt="You are a cautious and thorough analyst. You prioritize risk assessment and careful consideration of all possibilities. You tend to be skeptical of bold claims and prefer conservative, well-established solutions.",
        review_prompt="Review the responses with a critical eye towards risks, edge cases, and potential issues. Highlight any assumptions that may not hold.",
        revision_prompt="Revise your response to address valid concerns while maintaining your cautious perspective.",
        personality="conservative",
    ),
    "innovative": PromptConfigBase(
        system_prompt="You are an innovative thinker who embraces new approaches and creative solutions. You enjoy exploring unconventional ideas and pushing boundaries. You believe the best solutions often come from unexpected directions.",
        review_prompt="Review the responses and identify opportunities for innovation. Point out where traditional thinking might be limiting.",
        revision_prompt="Revise your response to incorporate creative insights while remaining practical.",
        personality="innovative",
    ),
    "academic": PromptConfigBase(
        system_prompt="You are an academic researcher with deep expertise. You value precision, citations, and logical rigor. You communicate in a scholarly manner and always seek evidence-based conclusions.",
        review_prompt="Review the responses for logical consistency, evidentiary support, and academic rigor. Identify any logical fallacies or unsupported claims.",
        revision_prompt="Revise your response to be more precise and evidence-based.",
        personality="academic",
    ),
    "practical": PromptConfigBase(
        system_prompt="You are a pragmatic problem-solver focused on real-world applications. You value simplicity, efficiency, and actionable solutions. You prefer approaches that can be implemented quickly and effectively.",
        review_prompt="Review the responses for practical applicability. Identify overly complex solutions and suggest simplifications.",
        revision_prompt="Revise your response to be more actionable and implementable.",
        personality="practical",
    ),
}


@router.get("/actors")
async def get_preset_actors() -> List[dict]:
    """Get preset actor templates"""
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
            "prompt_config": DEFAULT_PROMPTS["conservative"].model_dump(),
            "description": "Conservative analyst - cautious and thorough",
        },
        {
            "name": "BALTHASAR",
            "display_color": "#4ECDC4",
            "icon": "🔵",
            "is_meta_judge": False,
            "api_config": {
                "provider": "anthropic",
                "model": "claude-sonnet-4-20250514",
                "api_format": "anthropic",
            },
            "prompt_config": DEFAULT_PROMPTS["innovative"].model_dump(),
            "description": "Innovative thinker - creative and forward-looking",
        },
        {
            "name": "MELCHIOR",
            "display_color": "#A855F7",
            "icon": "🟣",
            "is_meta_judge": True,
            "api_config": {
                "provider": "anthropic",
                "model": "claude-sonnet-4-20250514",
                "api_format": "anthropic",
            },
            "prompt_config": {
                "system_prompt": "You are an impartial Meta Judge for multi-agent debates. Your role is to synthesize different perspectives into coherent consensus reports.",
                "review_prompt": "",
                "revision_prompt": "",
                "personality": "neutral",
                "custom_instructions": "Always provide balanced, fair judgments that respect all perspectives.",
            },
            "description": "Meta Judge - consensus synthesizer",
        },
    ]


@router.get("/prompts")
async def get_preset_prompts() -> dict:
    """Get preset prompt templates"""
    return {k: v.model_dump() for k, v in DEFAULT_PROMPTS.items()}