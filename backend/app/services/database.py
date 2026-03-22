import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from app.core.config import get_settings

logger = logging.getLogger('magi.database')

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Alias for background tasks
async_session_factory = AsyncSessionLocal


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables and seed default prompts."""
    from app.models.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default workflow prompts and presets
    await _seed_default_prompts()


async def _seed_default_prompts():
    """Seed default workflow prompts and presets if they don't exist.

    This function is idempotent - it only adds missing templates/presets by key.
    """
    from app.models.database import WorkflowPromptTemplate, PromptPreset

    async with AsyncSessionLocal() as db:
        # Load existing template keys
        result = await db.execute(
            select(WorkflowPromptTemplate.key)
        )
        existing_keys = set(row[0] for row in result.fetchall())

        # Default workflow prompts
        workflow_prompts = [
            WorkflowPromptTemplate(
                key="initial_answer",
                name="初始回答提示词",
                description="用于生成初始回答的系统提示词模板",
                template_text="""你是 {{actor_name}}，一名专业的分析者，正在参与一个多模型互评系统。

请针对以下问题给出你的专业回答。你的回答应该：
1. 结构清晰，逻辑严谨
2. 提供具体的论据和例子
3. 考虑多种可能性

问题：{{question}}

请给出你的回答：""",
                required_variables=["question", "actor_name"],
            ),
            WorkflowPromptTemplate(
                key="peer_review",
                name="互评提示词",
                description="用于模型互相评审的回答",
                template_text="""你是一名专业的评审者，请对以下回答进行评审。

原始问题：{{question}}

你是 {{self_actor_name}}，下面是你的回答：

{{self_answer_block}}

其他参与者的回答：

{{peer_answer_blocks}}

## 重要说明

- 引用自己的回答时，请说"我的回答"或"{{self_actor_name}} 的回答"
- 引用其他参与者时，请使用他们的 actor_name 属性值
- 不要把自己的回答称为"你的回答"

请从以下角度进行评审：
1. 各回答的优点和亮点
2. 各回答的不足和可能的错误
3. 改进建议

请给出你的评审意见：""",
                required_variables=["question", "self_actor_name", "self_answer_block", "peer_answer_blocks"],
            ),
            WorkflowPromptTemplate(
                key="revision",
                name="修订提示词",
                description="根据互评意见修订回答",
                template_text="""请根据其他参与者的评审意见，修订你的原始回答。

原始问题：{{question}}

你是 {{self_actor_name}}，你的原始回答：

{{self_previous_answer_block}}

其他参与者对你的评审意见：

{{peer_review_blocks}}

## 重要说明

- 引用自己的上一轮回答时，请说"我的上一轮回答"或"{{self_actor_name}} 的上一轮回答"
- 不要把自己的回答称为"你的回答"
- 引用评审者时，请使用 reviewer_name 属性值

请根据这些意见修订你的回答：
1. 接纳合理的批评和建议
2. 保持你独特的视角
3. 提供更全面准确的答案

请给出修订后的回答：""",
                required_variables=["question", "self_actor_name", "self_previous_answer_block", "peer_review_blocks"],
            ),
            WorkflowPromptTemplate(
                key="final_answer",
                name="最终回答提示词",
                description="综合各模型回答，生成面向用户的最终回答",
                template_text="""你是 {{self_actor_name}}，一个综合决策助手，需要基于多轮互评的结果，输出一篇面向用户的最终回答。

## 原始问题

{{question}}

## 各参与者的最终回答

{{actor_answer_blocks}}

## 收敛分析结果

{{convergence_info}}

## 要求

请直接回答用户的问题，要求：
1. 优先采用已达成共识的观点
2. 对仍有分歧的地方说明条件与不确定性
3. 如果收敛度较低，给出分情境建议
4. 使用清晰、自然的语言，不要使用 JSON 格式
5. 直接给出最终回答，不要解释过程
6. 引用参与者观点时，使用 actor_name 属性值
""",
                required_variables=["question", "self_actor_name", "actor_answer_blocks", "convergence_info"],
            ),
            WorkflowPromptTemplate(
                key="summary",
                name="总结提示词",
                description="总结模型生成最终综合结论",
                template_text="""你是 {{self_actor_name}}，一个公正的综合者，需要根据多轮互评的结果生成最终的综合结论。

原始问题：{{question}}

完整的互评历史：

{{history_blocks}}

## 重要说明

- 引用参与者观点时，请使用 actor_name 属性值
- 引用自己的分析时，请说"我认为"或"经综合分析"

请根据以上信息，生成一个综合性的最终回答。你的回答应该：
1. 整合各参与者的核心观点
2. 指出达成的共识
3. 指出仍存在的分歧
4. 给出你的综合建议

请以 JSON 格式返回：
{
  "summary": "综合总结",
  "agreements": ["共识点1", "共识点2"],
  "disagreements": ["分歧点1"],
  "confidence": <你对结论的信心程度，0.0-1.0之间的小数，如果不确定则省略此字段>,
  "recommendation": "最终建议"
}""",
                required_variables=["question", "self_actor_name", "history_blocks"],
            ),
            WorkflowPromptTemplate(
                key="convergence_check",
                name="收敛检查提示词",
                description="检查各回答是否已收敛",
                template_text="""你是一个收敛判断器，需要判断以下回答是否已经收敛（达成足够共识）。

原始问题：{{question}}

各参与者的最新回答：

{{latest_answer_blocks}}

请判断这些回答是否已收敛。收敛的标准是：
1. 核心观点基本一致
2. 主要分歧已经缩小到次要细节
3. 不太可能通过更多轮次获得显著改进

## 重要说明
- 引用参与者时，请使用 actor_name 属性值

请以 JSON 格式返回：
{
  "converged": true/false,
  "score": 0.0-1.0,
  "reason": "判断理由",
  "agreements": ["已达成共识的点"],
  "disagreements": ["仍存在分歧的点"]
}""",
                required_variables=["question", "latest_answer_blocks"],
            ),
            # Semantic analysis prompts
            WorkflowPromptTemplate(
                key="question_intent_analysis",
                name="问题意图分析提示词",
                description="分析用户问题的意图和提取比较维度",
                template_text="""你是一个问题分析专家。请分析以下问题，提取其核心意图和比较维度。

问题：{{question}}

请以 JSON 格式返回：
{
  "question_type": "问题类型（如 investment_decision, analysis, comparison 等）",
  "user_goal": "用户的核心目标",
  "time_horizons": ["短期", "中期", "长期"],
  "comparison_axes": [
    {"axis_id": "维度ID", "label": "维度名称"}
  ]
}

要求：
1. question_type 应该是问题的核心类型
2. user_goal 应该简洁地描述用户想要达到的目的
3. time_horizons 列出问题涉及的时间维度
4. comparison_axes 列出 3-5 个最核心的比较维度，用于后续比较多模型回答

只返回 JSON，不要其他文字。""",
                required_variables=["question"],
            ),
            WorkflowPromptTemplate(
                key="semantic_extraction",
                name="语义主题提取提示词",
                description="从模型回答中提取语义主题和立场",
                template_text="""你是一个语义分析专家。请分析以下回答，提取其核心主题和立场。

问题：{{question}}

回答：{{answer}}

比较维度：
{{comparison_axes}}

请以 JSON 格式返回该回答的主题：
{
  "topics": [
    {
      "topic_id": "主题标识（英文，如 energy_substitution）",
      "axis_id": "对应的比较维度ID（必须从给定的比较维度列表中选择）",
      "label": "主题名称（中文）",
      "summary": "观点摘要（一句话）",
      "stance": "立场标签（如：保守、激进、中立、实用等）",
      "time_horizon": "时间维度（short/medium/long）",
      "risk_level": "风险偏好（low/medium/high）",
      "novelty": "观点新颖度（low/medium/high）",
      "quotes": ["原文中支持该观点的关键引用"]
    }
  ]
}

要求：
1. axis_id 必须严格从给定的比较维度列表中选择，不能自己编造
2. 每个主题应该对应一个比较维度
3. summary 应该简洁精炼
4. quotes 应该是原文中的关键句子
5. 最多提取 5 个最核心的主题

只返回 JSON，不要其他文字。""",
                required_variables=["question", "answer", "comparison_axes"],
            ),
            WorkflowPromptTemplate(
                key="cross_actor_compare",
                name="跨模型比较提示词",
                description="比较多个模型在同一主题上的观点差异",
                template_text="""你是一个观点比较专家。请比较以下多个回答在同一主题上的差异。

主题：{{topic_label}}

各回答的观点：
{{actor_positions}}

请以 JSON 格式返回：
{
  "salience": 0.9,
  "disagreement_score": 0.3,
  "status": "converged/divergent/partial",
  "difference_types": ["solution_class", "time_horizon", "risk_preference"],
  "agreement_summary": "一致点",
  "disagreement_summary": "分歧点"
}

字段说明：
- salience: 该主题的重要度 (0-1)
- disagreement_score: 分歧程度 (0-1，0表示完全一致，1表示完全分歧)
- status: converged(已共识)/divergent(明显分歧)/partial(部分一致)
- difference_types: 分歧类型，可包括：solution_class(解决方案类别)、time_horizon(时间维度)、risk_preference(风险偏好)、evidence_strength(证据强度)

只返回 JSON，不要其他文字。""",
                required_variables=["topic_label", "actor_positions"],
            ),
        ]

        # Only add templates that don't exist, or update if variables changed
        added_count = 0
        for wp in workflow_prompts:
            if wp.key not in existing_keys:
                db.add(wp)
                added_count += 1
                logger.info(f"Added missing template: {wp.key}")
            else:
                # Check if required_variables mismatch - force update if stale
                result = await db.execute(
                    select(WorkflowPromptTemplate)
                    .where(WorkflowPromptTemplate.key == wp.key)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    existing_vars = set(existing.required_variables or [])
                    new_vars = set(wp.required_variables or [])
                    if existing_vars != new_vars:
                        logger.warning(
                            f"Template '{wp.key}' has stale variables: "
                            f"{list(existing_vars)} → {list(new_vars)}. "
                            f"Force updating template_text and required_variables."
                        )
                        existing.required_variables = wp.required_variables
                        existing.template_text = wp.template_text
                        existing.name = wp.name
                        existing.description = wp.description
                        added_count += 1

        # Load existing preset keys
        result = await db.execute(
            select(PromptPreset.key)
        )
        existing_preset_keys = set(row[0] for row in result.fetchall())

        # Default prompt presets
        prompt_presets = [
            PromptPreset(
                key="conservative",
                name="保守分析型",
                description="谨慎、全面，优先考虑风险和边界情况",
                system_prompt="你是一名谨慎且全面的分析师。你优先进行风险评估和全面考虑所有可能性。你对大胆的主张持怀疑态度，倾向于选择保守、经过验证的解决方案。",
                review_prompt="请以批判性的眼光评审这些回答，重点关注风险、边界情况和潜在问题。指出可能不成立的假设。",
                revision_prompt="请修订你的回答以解决合理的担忧，同时保持你谨慎的视角。",
                personality="conservative",
            ),
            PromptPreset(
                key="innovative",
                name="创新探索型",
                description="拥抱新方法，探索创意解决方案",
                system_prompt="你是一名创新型思考者，拥抱新方法和创意解决方案。你喜欢探索非传统的想法，突破边界。你相信最好的解决方案往往来自意想不到的方向。",
                review_prompt="请评审这些回答并识别创新的机会。指出传统思维可能在哪些方面限制了思考。",
                revision_prompt="请修订你的回答以融入创意洞察，同时保持实用性。",
                personality="innovative",
            ),
            PromptPreset(
                key="academic",
                name="学术严谨型",
                description="注重精确、严谨、证据支撑",
                system_prompt="你是一名具有深厚专业知识的学术研究者。你重视精确性、引用和逻辑严谨性。你以学术的方式交流，始终追求基于证据的结论。",
                review_prompt="请评审这些回答的逻辑一致性、证据支持和学术严谨性。识别任何逻辑谬误或缺乏支持的主张。",
                revision_prompt="请修订你的回答使其更加精确和基于证据。",
                personality="academic",
            ),
            PromptPreset(
                key="practical",
                name="实用主义型",
                description="聚焦实际应用，追求简单高效",
                system_prompt="你是一名专注于实际应用的务实问题解决者。你重视简单性、效率和可执行的解决方案。你倾向于可以快速有效实施的方案。",
                review_prompt="请评审这些回答的实际可应用性。识别过于复杂的解决方案并提出简化建议。",
                revision_prompt="请修订你的回答使其更具可操作性和可实施性。",
                personality="practical",
            ),
            PromptPreset(
                key="synthesizer",
                name="综合总结型",
                description="适合作为总结模型，综合各方观点",
                system_prompt="你是一名公正的多模型辩论综合者。你的角色是将不同的观点综合成连贯的共识报告。你尊重所有视角，提供平衡、公正的判断。",
                review_prompt="",
                revision_prompt="",
                personality="neutral",
                custom_instructions="始终提供平衡、公正的判断，尊重所有观点。",
            ),
        ]

        # Only add presets that don't exist
        for pp in prompt_presets:
            if pp.key not in existing_preset_keys:
                db.add(pp)
                added_count += 1
                logger.info(f"Added missing preset: {pp.key}")

        if added_count > 0:
            await db.commit()
            logger.info(f"Seeded {added_count} new prompts/presets")
        else:
            logger.info("All prompts/presets already exist, skipping seed")