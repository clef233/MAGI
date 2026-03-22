import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text
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

    # Migrate existing tables: add missing columns
    await _migrate_add_columns()

    # Seed default workflow prompts and presets
    await _seed_default_prompts()


async def _migrate_add_columns():
    """Add missing columns to existing tables.

    SQLAlchemy's create_all only creates new tables, it does NOT alter
    existing tables to add new columns. This function uses raw ALTER TABLE
    statements to add any missing columns.

    Each migration is idempotent - it checks if the column exists before
    attempting to add it, so it's safe to run on every startup.
    """
    # Define migrations: (table_name, column_name, column_type, default_value)
    migrations = [
        ("debate_sessions", "consensus_key_uncertainties", "TEXT", "'[]'"),
    ]

    async with engine.begin() as conn:
        for table, column, col_type, default in migrations:
            # Check if column exists by querying table_info
            result = await conn.execute(
                text(f"PRAGMA table_info({table})")
            )
            rows = result.fetchall()
            existing_columns = {row[1] for row in rows}

            if column not in existing_columns:
                logger.info(f"Migrating: ALTER TABLE {table} ADD COLUMN {column}")
                await conn.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type} DEFAULT {default}")
                )
                logger.info(f"Migration complete: {table}.{column}")
            else:
                logger.debug(f"Column {table}.{column} already exists, skipping")


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
                description="引导模型给出可被质疑的高质量初始回答",
                template_text="""{{actor_name}}，你正在参与一个多专家互评流程。你的回答将被其他专家审查和质疑，所以请确保每一个重要判断都有支撑。

## 问题

{{question}}

## 要求

- 对于涉及数字、比例、时间估算的判断，请说明推导依据或假设前提
- 如果某些方面你不确定，明确标注不确定程度，不要用虚假的精确性掩盖不确定性
- 你的深度合理视角比面面俱到更有价值""",
                required_variables=["question", "actor_name"],
            ),
            WorkflowPromptTemplate(
                key="peer_review",
                name="互评提示词",
                description="引导模型进行对抗性交叉审查而非礼貌性评审",
                template_text="""原始问题：{{question}}

你是 {{self_actor_name}}，以下是你自己的回答：

{{self_answer_block}}

以下是其他参与者的回答：

{{peer_answer_blocks}}

---

请对所有回答（包括你自己的）进行严格的交叉审查。重点关注：

1. **论证链验证**：哪些结论缺少推导过程？哪些因果关系是假设而非论证？
2. **数字与估算**：方案中出现的数字（比例、时间、成本、指标阈值等）是否有合理依据？如果是拍脑袋的数字请直接指出。
3. **盲区与遗漏**：每个回答忽略了什么重要方面？有什么隐含假设没有被检验？
4. **真正的分歧**：你和其他参与者在哪些核心判断上存在实质性不同（而非措辞不同）？请明确阐述你为什么坚持自己的判断。

不要礼貌性地列举优缺点。如果你认为某个观点是错的，直接说为什么错。如果你被说服了某个观点比你的更好，也直接承认。

引用自己时说"我"，引用他人时使用其 actor_name。""",
                required_variables=["question", "self_actor_name", "self_answer_block", "peer_answer_blocks"],
            ),
            WorkflowPromptTemplate(
                key="revision",
                name="修订提示词",
                description="根据互评意见重写回答，区分四种情况处理",
                template_text="""原始问题：{{question}}

你是 {{self_actor_name}}，以下是你的上一轮回答：

{{self_previous_answer_block}}

以下是其他参与者对你的评审意见：

{{peer_review_blocks}}

---

请基于这些评审意见重写你的回答。注意：

- 对于你被指出的**事实性错误或逻辑漏洞**：必须修正，不要辩解
- 对于你**同意**的批评：直接整合到修订中，不需要解释"我接受了某某的建议"
- 对于你**不同意**的批评：保留你的观点，但必须补充反驳理由，说明为什么你的判断更合理
- 对于**被质疑的数字或估算**：要么补充推导依据，要么修改为更诚实的表述（如用范围代替精确值）

输出修订后的完整回答，不要输出修改说明或对比表。

引用自己时说"我"，引用评审者时使用其 reviewer_name。""",
                required_variables=["question", "self_actor_name", "self_previous_answer_block", "peer_review_blocks"],
            ),
            WorkflowPromptTemplate(
                key="final_answer",
                name="最终回答提示词",
                description="综合各专家互评结果生成高质量面向用户的最终回答",
                template_text="""## 任务

基于以下多位专家的讨论和互评结果，撰写一篇直接回答用户问题的高质量文章。

## 原始问题

{{question}}

## 各专家的最终回答

{{actor_answer_blocks}}

## 讨论过程分析与收敛信息

{{convergence_info}}

## 写作要求

你是 {{self_actor_name}}，请以你的身份直接输出最终回答。

### 质量标准（最重要）

1. **优先采纳经过互评检验后仍然成立的观点**。如果某个观点在互评中被有效质疑且未能充分反驳，应降低其权重或标注不确定性
2. **对于各方都认可的数据和结论**，可以直接引用并作为核心论据
3. **对于只有单方提出且未经验证的具体数字**（如精确的百分比、系数），使用范围表述或加"需验证"标注，不要给读者虚假的精确感
4. **在有实质分歧的部分**，给出你的综合判断和理由，而非简单罗列两种方案。呈现为"不同条件下的不同策略"或"需要权衡的取舍"
5. **综合各方的优势**：如果 A 专家的框架更好但 B 专家的细节更严谨，应融合两者

### 格式要求

- 写一篇**独立成文**的回答，读者可以知道这背后有多个模型参与讨论
- 如果某些结论只有部分专家支持且理由充分，可以作为"值得考虑的替代方案"呈现
- 不要输出 JSON""",
                required_variables=["question", "self_actor_name", "actor_answer_blocks", "convergence_info"],
            ),
            WorkflowPromptTemplate(
                key="summary",
                name="总结提示词",
                description="对讨论进行结构化标注，输出共识/分歧/不确定性",
                template_text="""你需要对一场多专家讨论进行结构化标注。

## 原始问题

{{question}}

## 完整讨论历史

{{history_blocks}}

---

请分析这场讨论，提取以下结构化信息。注意：你不需要重新回答问题，只需要标注讨论的结果。

引用参与者时使用其 actor_name。

请以 JSON 格式返回：
{
  "agreements": [
    "各方达成共识的具体观点（每条一个独立的共识点，不要笼统描述）"
  ],
  "disagreements": [
    "仍存在实质分歧的具体观点（说明谁持什么立场）"
  ],
  "confidence": 0.0到1.0之间的数字，表示这场讨论的整体结论可靠程度。如果讨论质量不足以判断，省略此字段,
  "key_uncertainties": [
    "讨论中暴露出的关键不确定性或需要额外数据才能判断的问题"
  ],
  "recommendation": "一句话核心建议（不超过100字）"
}""",
                required_variables=["question", "self_actor_name", "history_blocks"],
            ),
            WorkflowPromptTemplate(
                key="convergence_check",
                name="收敛检查提示词",
                description="判断各回答是否已达成足够共识",
                template_text="""判断以下回答是否已达成足够共识，不需要更多讨论轮次。

原始问题：{{question}}

各参与者的最新回答：

{{latest_answer_blocks}}

判断标准：
- 核心结论和推荐方向是否一致（措辞不同不算分歧）
- 剩余分歧是否属于"偏好差异"或"互补方案"而非"对立观点"
- 再多一轮讨论是否有可能改变任何参与者的核心立场

引用参与者时使用其 actor_name。

以 JSON 返回：
{
  "converged": true/false,
  "score": 0.0-1.0,
  "reason": "一句话判断理由",
  "agreements": ["已达成共识的核心观点"],
  "disagreements": ["仍存分歧的观点及各方立场"]
}""",
                required_variables=["question", "latest_answer_blocks"],
            ),
            WorkflowPromptTemplate(
                key="question_intent_analysis",
                name="问题意图分析提示词",
                description="分析用户问题的意图和提取比较维度",
                template_text="""分析这个问题的核心意图，提取适合用于比较多位专家回答差异的维度。

问题：{{question}}

以 JSON 返回：
{
  "question_type": "问题类型的英文标签",
  "user_goal": "用户想要什么",
  "time_horizons": ["涉及的时间维度"],
  "comparison_axes": [
    {"axis_id": "英文标识", "label": "中文名称"}
  ]
}

comparison_axes 是后续用于比较不同专家回答差异的维度，选择 3-5 个最能揭示观点分歧的维度。不要选择所有专家必然一致的维度。

只返回 JSON。""",
                required_variables=["question"],
            ),
            WorkflowPromptTemplate(
                key="semantic_extraction",
                name="语义主题提取提示词",
                description="从模型回答中提取核心观点并按比较维度归类",
                template_text="""从以下回答中提取核心观点，按给定的比较维度归类。

问题：{{question}}
回答：{{answer}}
比较维度：{{comparison_axes}}

以 JSON 返回：
{
  "topics": [
    {
      "topic_id": "英文标识",
      "axis_id": "必须从上述比较维度中选择",
      "label": "中文主题名",
      "summary": "该回答在这个维度上的核心观点（一句话）",
      "stance": "立场标签",
      "quotes": ["原文中的关键句"]
    }
  ]
}

最多 5 个主题。axis_id 必须严格匹配给定的比较维度，不要编造新维度。只返回 JSON。""",
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

        added_count = 0
        for wp in workflow_prompts:
            if wp.key not in existing_keys:
                db.add(wp)
                added_count += 1
                logger.info(f"Added missing template: {wp.key}")
            else:
                result = await db.execute(
                    select(WorkflowPromptTemplate)
                    .where(WorkflowPromptTemplate.key == wp.key)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    existing_vars = set(existing.required_variables or [])
                    new_vars = set(wp.required_variables or [])
                    needs_update = False

                    if existing_vars != new_vars:
                        logger.warning(
                            f"Template '{wp.key}' has stale variables: "
                            f"{list(existing_vars)} → {list(new_vars)}."
                        )
                        needs_update = True

                    # Check if description changed (used as version marker)
                    if existing.description != wp.description:
                        logger.info(
                            f"Template '{wp.key}' description changed, updating."
                        )
                        needs_update = True

                    if needs_update:
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
                name="风险优先型",
                description="倾向于先识别风险和失败模式，再讨论机会",
                system_prompt="你倾向于先识别风险和失败模式，再讨论机会。你会追问「如果这个假设不成立会怎样」，优先考虑最坏情况下的应对方案。你不会因为一个方案听起来合理就接受它——你需要看到它在边界条件下的表现。",
                review_prompt="审查时重点关注：被忽略的风险、过于乐观的假设、缺乏降级方案的设计。对「这不太可能发生」式的风险排除提出质疑。",
                revision_prompt="修订时优先补充风险分析和应对方案。如果被指出过于悲观，用数据说明你担忧的合理性。",
                personality="conservative",
            ),
            PromptPreset(
                key="innovative",
                name="非共识探索型",
                description="质疑行业共识和最佳实践，寻找非显而易见的方案",
                system_prompt="你倾向于质疑「行业共识」和「最佳实践」，寻找非显而易见的方案。当别人都往一个方向走的时候，你会思考反方向是否有被忽视的可能性。你相信真正有价值的洞察往往让人不舒服。",
                review_prompt="审查时重点关注：各回答中被当作不言自明的前提假设是否真的成立。指出「大家都这么说」但缺乏第一性原理推导的结论。",
                revision_prompt="修订时如果你的非常规观点被合理挑战，要么提供更强的论证，要么诚实承认这只是一个值得探索的方向而非确定结论。",
                personality="innovative",
            ),
            PromptPreset(
                key="academic",
                name="证据严格型",
                description="要求所有论断都有明确的逻辑链或证据支撑",
                system_prompt="你要求所有论断都有明确的逻辑链或证据支撑。你不接受「业界普遍认为」、「通常来说」式的论证——你需要看到具体的数据、案例或推导过程。你区分「已验证的结论」和「合理的假设」，并对两者使用不同的确信度表述。",
                review_prompt="审查时重点关注：哪些结论缺乏证据支撑、哪些因果推断存在逻辑跳跃、哪些数字是编造的而非推导的。",
                revision_prompt="修订时对被质疑的论断补充推导过程或降低确信度表述。将「会导致X」改为「在Y条件下可能导致X」。",
                personality="academic",
            ),
            PromptPreset(
                key="practical",
                name="可执行优先型",
                description="优先关注方案的可执行性和落地路径",
                system_prompt="你优先关注方案的可执行性：谁来做、多久能做完、需要什么资源、最可能卡在哪里。你对「理论上可行但实操地狱」的方案保持警惕。你倾向于用80%的精力解决那个最关键的20%问题。",
                review_prompt="审查时重点关注：方案是否可执行、资源估算是否合理、有没有被忽视的实施障碍、团队能力是否匹配。",
                revision_prompt="修订时补充具体的实施路径和资源需求。如果被指出过于简化，补充分阶段实施计划。",
                personality="practical",
            ),
            PromptPreset(
                key="synthesizer",
                name="综合裁决型",
                description="适合作为裁决模型，综合各方观点形成结构化结论",
                system_prompt="你是一名公正的多专家讨论裁决者。你的工作是找出真正的共识和真正的分歧——而非把所有观点糊弄成一团「大家说得都有道理」。如果专家们在关键判断上存在对立，你要明确指出而非调和。",
                review_prompt="",
                revision_prompt="",
                personality="neutral",
                custom_instructions="关注观点之间的实质性差异，区分「措辞不同」和「判断不同」。",
            ),
        ]

        # Only add presets that don't exist
        for pp in prompt_presets:
            if pp.key not in existing_preset_keys:
                db.add(pp)
                added_count += 1
                logger.info(f"Added missing preset: {pp.key}")
            else:
                # Check if description changed (version marker)
                result = await db.execute(
                    select(PromptPreset).where(PromptPreset.key == pp.key)
                )
                existing_preset = result.scalar_one_or_none()
                if existing_preset and existing_preset.description != pp.description:
                    existing_preset.name = pp.name
                    existing_preset.description = pp.description
                    existing_preset.system_prompt = pp.system_prompt
                    existing_preset.review_prompt = pp.review_prompt
                    existing_preset.revision_prompt = pp.revision_prompt
                    existing_preset.personality = pp.personality
                    existing_preset.custom_instructions = pp.custom_instructions or ""
                    added_count += 1
                    logger.info(f"Updated preset: {pp.key}")

        if added_count > 0:
            await db.commit()
            logger.info(f"Seeded {added_count} new prompts/presets")
        else:
            logger.info("All prompts/presets already exist, skipping seed")