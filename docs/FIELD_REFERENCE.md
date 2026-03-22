# MAGI 字段参考文档

本文档详细记录 MAGI 系统中所有数据库表结构和程序内数据结构的字段定义。

---

## 目录

1. [数据库表结构](#数据库表结构)
   - [actors - 参与者配置](#actors---参与者配置)
   - [debate_sessions - 会话主表](#debate_sessions---会话主表)
   - [debate_session_actors - 会话-参与者关联](#debate_session_actors---会话-参与者关联)
   - [rounds - 轮次记录](#rounds---轮次记录)
   - [messages - 消息记录](#messages---消息记录)
   - [workflow_prompt_templates - 工作流提示词模板](#workflow_prompt_templates---工作流提示词模板)
   - [prompt_presets - 提示词预设](#prompt_presets---提示词预设)
   - [question_intents - 问题意图分析](#question_intents---问题意图分析)
   - [semantic_topics - 语义主题](#semantic_topics---语义主题)
   - [semantic_comparisons - 语义比较](#semantic_comparisons---语义比较)
2. [程序内数据结构](#程序内数据结构)
   - [枚举类型](#枚举类型)
   - [Dataclass 数据类](#dataclass-数据类)
   - [Block 序列化结构](#block-序列化结构)
3. [模板变量契约](#模板变量契约)
   - [工作流模板变量](#工作流模板变量)
   - [语义分析模板变量](#语义分析模板变量)

---

## 数据库表结构

### actors - 参与者配置

存储参与辩论的 AI 模型配置信息。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键，参与者唯一标识 |
| `name` | String(50) | - | 参与者名称（如 "GLM"、"DeepSeek"） |
| `display_color` | String(7) | "#FF6B35" | 显示颜色，十六进制格式 |
| `icon` | String(10) | "🤖" | 显示图标 |
| `provider` | Enum | - | API 提供商类型：`openai`/`anthropic`/`custom` |
| `api_format` | String(50) | "openai_compatible" | API 格式类型 |
| `base_url` | String(255) | - | API 基础 URL |
| `api_key` | String(255) | - | API 密钥（生产环境应加密） |
| `model` | String(100) | - | 模型名称（如 "gpt-4"、"glm-4"） |
| `max_tokens` | Integer | 4096 | 最大输出 token 数 |
| `temperature` | Float | 0.7 | 生成温度参数 |
| `extra_params` | JSON | {} | 额外参数字典 |
| `system_prompt` | Text | "" | 系统提示词 |
| `review_prompt` | Text | "" | 评审阶段提示词 |
| `revision_prompt` | Text | "" | 修订阶段提示词 |
| `personality` | String(50) | "neutral" | 人格类型 |
| `custom_instructions` | Text | "" | 自定义指令 |
| `is_meta_judge` | Boolean | False | 是否为元评判者 |
| `is_active` | Boolean | True | 软删除标记 |
| `created_at` | DateTime | 自动生成 | 创建时间 |
| `updated_at` | DateTime | 自动更新 | 更新时间 |

---

### debate_sessions - 会话主表

存储辩论会话的主要信息和结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键，会话唯一标识 |
| `question` | Text | - | 用户提出的问题 |
| `status` | Enum | "initializing" | 会话状态：`initializing`/`debating`/`judging`/`completed`/`stopped` |
| `judge_actor_id` | String(36) | - | 外键，评判者 Actor ID |
| `max_rounds` | Integer | 3 | 最大轮次限制 |
| `convergence_threshold` | Float | 0.85 | 收敛阈值（0-1） |
| `auto_stop` | Boolean | True | 是否自动停止 |
| `consensus_summary` | Text | - | 共识总结 |
| `consensus_agreements` | JSON | [] | 达成共识的观点列表 |
| `consensus_disagreements` | JSON | [] | 存在分歧的观点列表 |
| `consensus_confidence` | Float | - | 共识置信度（0-1） |
| `consensus_recommendation` | Text | - | 最终建议 |
| `total_tokens` | Integer | 0 | 总 token 消耗 |
| `total_cost` | Float | 0.0 | 总成本 |
| `created_at` | DateTime | 自动生成 | 创建时间 |
| `completed_at` | DateTime | - | 完成时间 |

---

### debate_session_actors - 会话-参与者关联

多对多关联表，记录每个会话包含哪些参与者。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `session_id` | String(36) | - | 外键，会话 ID |
| `actor_id` | String(36) | - | 外键，参与者 ID |

**约束**: `uq_session_actor` - (session_id, actor_id) 唯一

---

### rounds - 轮次记录

记录每个会话的各个阶段轮次。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `session_id` | String(36) | - | 外键，会话 ID |
| `round_number` | Integer | - | 轮次编号（全局递增） |
| `phase` | String(20) | "initial" | 阶段类型：`initial`/`review`/`revision`/`final_answer`/`summary` |

**约束**: `uq_session_round` - (session_id, round_number) 唯一

---

### messages - 消息记录

存储每个轮次中各参与者产生的消息内容。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `round_id` | String(36) | - | 外键，轮次 ID |
| `actor_id` | String(36) | - | 外键，参与者 ID |
| `role` | String(20) | - | 消息角色：`answer`/`review`/`revision`/`final_answer`/`summary` |
| `content` | Text | - | 消息内容 |
| `input_tokens` | Integer | 0 | 输入 token 数 |
| `output_tokens` | Integer | 0 | 输出 token 数 |
| `created_at` | DateTime | 自动生成 | 创建时间 |

---

### workflow_prompt_templates - 工作流提示词模板

存储可编辑的工作流提示词模板。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `key` | String(50) | - | 模板唯一键（如 `peer_review`、`revision`） |
| `name` | String(100) | - | 模板显示名称 |
| `description` | Text | "" | 模板描述 |
| `template_text` | Text | - | 模板文本，使用 `{{variable}}` 语法 |
| `required_variables` | JSON | [] | 必需变量列表，如 `["question", "self_actor_name"]` |
| `created_at` | DateTime | 自动生成 | 创建时间 |
| `updated_at` | DateTime | 自动更新 | 更新时间 |

**内置模板键值**:

| Key | 用途 |
|-----|------|
| `initial_answer` | 初始回答阶段 |
| `peer_review` | 互评阶段 |
| `revision` | 修订阶段 |
| `final_answer` | 最终回答阶段 |
| `summary` | 总结阶段 |
| `convergence_check` | 收敛检查 |
| `question_intent_analysis` | 问题意图分析 |
| `semantic_extraction` | 语义主题提取 |
| `cross_actor_compare` | 跨模型比较 |

---

### prompt_presets - 提示词预设

存储参与者提示词预设配置。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `key` | String(50) | - | 预设唯一键 |
| `name` | String(100) | - | 预设显示名称 |
| `description` | Text | "" | 预设描述 |
| `system_prompt` | Text | "" | 系统提示词 |
| `review_prompt` | Text | "" | 评审提示词 |
| `revision_prompt` | Text | "" | 修订提示词 |
| `personality` | String(50) | "neutral" | 人格类型 |
| `custom_instructions` | Text | "" | 自定义指令 |
| `is_builtin` | Boolean | True | 是否为内置预设 |
| `created_at` | DateTime | 自动生成 | 创建时间 |
| `updated_at` | DateTime | 自动更新 | 更新时间 |

**内置预设键值**: `conservative`、`innovative`、`academic`、`practical`、`synthesizer`

---

### question_intents - 问题意图分析

存储对用户问题的结构化分析结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `session_id` | String(36) | - | 外键，会话 ID（唯一） |
| `question_type` | String(50) | - | 问题类型（如 `investment_decision`、`analysis`、`comparison`） |
| `user_goal` | Text | - | 用户核心目标 |
| `time_horizons` | JSON | [] | 时间维度列表，如 `["short_term", "medium_term", "long_term"]` |
| `comparison_axes` | JSON | [] | 比较维度列表，如 `[{"axis_id": "main_topic", "label": "核心观点"}]` |
| `created_at` | DateTime | 自动生成 | 创建时间 |

---

### semantic_topics - 语义主题

存储每个回答的语义主题提取结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `session_id` | String(36) | - | 外键，会话 ID |
| `round_number` | Integer | - | 轮次编号 |
| `phase` | String(20) | - | 阶段类型 |
| `actor_id` | String(36) | - | 外键，参与者 ID |
| `topic_id` | String(50) | - | 主题唯一标识（如 `energy_substitution`） |
| `axis_id` | String(50) | - | 对应的比较维度 ID |
| `label` | String(100) | - | 主题名称 |
| `summary` | Text | - | 观点摘要 |
| `stance` | String(50) | - | 立场标签（如 `保守`、`激进`、`中立`） |
| `time_horizon` | String(20) | - | 时间维度：`short`/`medium`/`long` |
| `risk_level` | String(20) | - | 风险偏好：`low`/`medium`/`high` |
| `novelty` | String(20) | - | 观点新颖度：`low`/`medium`/`high` |
| `quotes` | JSON | [] | 原文引用列表 |
| `created_at` | DateTime | 自动生成 | 创建时间 |

---

### semantic_comparisons - 语义比较

存储跨模型的语义比较结果（主题分歧图谱）。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `id` | String(36) | UUID | 主键 |
| `session_id` | String(36) | - | 外键，会话 ID |
| `round_number` | Integer | - | 轮次编号 |
| `phase` | String(20) | - | 阶段类型 |
| `topic_id` | String(50) | - | 主题 ID（对应 axis_id） |
| `label` | String(100) | - | 主题名称 |
| `salience` | Float | 0.5 | 重要度（0-1） |
| `disagreement_score` | Float | 0.5 | 分歧度（0-1，0=完全一致，1=完全分歧） |
| `status` | String(20) | "partial" | 共识状态：`converged`/`divergent`/`partial` |
| `difference_types` | JSON | [] | 分歧类型列表，如 `["solution_class", "time_horizon"]` |
| `agreement_summary` | Text | - | 一致点摘要 |
| `disagreement_summary` | Text | - | 分歧点摘要 |
| `actor_positions` | JSON | [] | 各参与者立场列表 |
| `created_at` | DateTime | 自动生成 | 创建时间 |

**actor_positions 结构**:
```json
[
  {
    "actor_id": "uuid",
    "actor_name": "GLM",
    "stance_label": "保守",
    "summary": "观点摘要",
    "quotes": ["引用1", "引用2"]
  }
]
```

---

## 程序内数据结构

### 枚举类型

#### ProviderType
API 提供商类型。

| 值 | 说明 |
|----|------|
| `OPENAI` | OpenAI 官方 API |
| `ANTHROPIC` | Anthropic 官方 API |
| `CUSTOM` | 自定义/兼容 API |

#### SessionStatus
会话状态。

| 值 | 说明 |
|----|------|
| `INITIALIZING` | 初始化中 |
| `DEBATING` | 辩论进行中 |
| `JUDGING` | 评判中 |
| `COMPLETED` | 已完成 |
| `STOPPED` | 已停止 |

#### BlockPhase
Block 阶段类型（用于序列化）。

| 值 | 说明 |
|----|------|
| `INITIAL` | 初始阶段 |
| `REVISION` | 修订阶段 |
| `FINAL` | 最终阶段 |

#### BlockRole
Block 角色类型（用于序列化）。

| 值 | 说明 |
|----|------|
| `SELF` | 当前参与者自己的内容 |
| `PEER` | 其他参与者的内容 |

---

### Dataclass 数据类

#### QuestionIntentResult
问题意图分析结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `question_type` | str | "general" | 问题类型 |
| `user_goal` | str | "" | 用户核心目标 |
| `time_horizons` | list[str] | [] | 时间维度列表 |
| `comparison_axes` | list[dict] | [] | 比较维度列表 |

#### TopicResult
语义主题提取结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `topic_id` | str | - | 主题标识 |
| `axis_id` | Optional[str] | None | 对应的比较维度 ID |
| `label` | str | "" | 主题名称 |
| `summary` | str | "" | 观点摘要 |
| `stance` | str | "" | 立场标签 |
| `time_horizon` | str | "medium" | 时间维度 |
| `risk_level` | str | "medium" | 风险偏好 |
| `novelty` | str | "medium" | 新颖度 |
| `quotes` | list[str] | [] | 原文引用 |

#### ActorPositionResult
参与者在某主题上的立场。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `actor_id` | str | - | 参与者 ID |
| `actor_name` | str | "" | 参与者名称 |
| `stance_label` | str | "" | 立场标签 |
| `summary` | str | "" | 观点摘要 |
| `quotes` | list[str] | [] | 引用列表 |

#### TopicComparisonResult
跨参与者主题比较结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `topic_id` | str | - | 主题 ID（对应 axis_id） |
| `label` | str | - | 主题名称 |
| `salience` | float | 0.5 | 重要度 |
| `disagreement_score` | float | 0.5 | 分歧度 |
| `status` | str | "partial" | 共识状态 |
| `difference_types` | list[str] | [] | 分歧类型 |
| `agreement_summary` | str | "" | 一致点摘要 |
| `disagreement_summary` | str | "" | 分歧点摘要 |
| `actor_positions` | list[ActorPositionResult] | [] | 各参与者立场 |

#### ConvergenceResult
收敛检查结果。

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `converged` | bool | - | 是否已收敛 |
| `score` | float | - | 收敛分数（0-1） |
| `reason` | str | - | 判断理由 |
| `agreements` | list[str] | [] | 已达成共识的观点 |
| `disagreements` | list[str] | [] | 仍存在分歧的观点 |

---

### Block 序列化结构

用于在模板中传递结构化的回答/评审数据，确保参与者归属清晰。

#### Answer Block 格式
```xml
<answer actor_name="GLM" phase="initial" role="self">
回答内容...
</answer>
```

| 属性 | 说明 |
|------|------|
| `actor_name` | 回答者名称 |
| `phase` | 阶段：`initial`/`revision`/`final` |
| `role` | 角色：`self`（当前参与者）/ `peer`（其他参与者） |

#### Review Block 格式
```xml
<review reviewer_name="DeepSeek" about_actor="GLM" phase="initial">
评审内容...
</review>
```

| 属性 | 说明 |
|------|------|
| `reviewer_name` | 评审者名称 |
| `about_actor` | 被评审者名称 |
| `phase` | 阶段 |

#### 序列化函数

| 函数名 | 输入 | 输出 |
|--------|------|------|
| `serialize_answer_block` | actor_name, phase, role, content | 单个 answer block |
| `serialize_review_block` | reviewer_name, about_actor_name, phase, content | 单个 review block |
| `serialize_answer_blocks` | answers[], self_actor_name, phase | 多个 answer blocks（区分 self/peer） |
| `serialize_peer_answer_blocks` | answers[], phase | 多个 answer blocks（全部标记为 peer） |
| `serialize_peer_review_blocks` | reviews[], phase | 多个 review blocks |
| `serialize_history_blocks` | history_items[], self_actor_name | 历史记录 blocks |
| `serialize_latest_answer_blocks` | answers[] | 最新回答 blocks（用于收敛检查） |

---

## 模板变量契约

所有模板变量名必须与 `PromptService` 方法参数名严格一致。

### 工作流模板变量

| 模板 Key | 变量名 | 类型 | 说明 |
|----------|--------|------|------|
| `initial_answer` | `question` | str | 用户问题 |
| | `actor_name` | str | 当前参与者名称 |
| `peer_review` | `question` | str | 用户问题 |
| | `self_actor_name` | str | 当前参与者名称 |
| | `self_answer_block` | str | 自己的回答 Block（XML） |
| | `peer_answer_blocks` | str | 其他参与者的回答 Blocks（XML） |
| `revision` | `question` | str | 用户问题 |
| | `self_actor_name` | str | 当前参与者名称 |
| | `self_previous_answer_block` | str | 自己上一轮回答 Block |
| | `peer_review_blocks` | str | 其他参与者的评审 Blocks |
| `final_answer` | `question` | str | 用户问题 |
| | `self_actor_name` | str | 评判者名称 |
| | `actor_answer_blocks` | str | 所有参与者回答 Blocks |
| | `convergence_info` | str | 收敛分析结果（可选） |
| `summary` | `question` | str | 用户问题 |
| | `self_actor_name` | str | 评判者名称 |
| | `history_blocks` | str | 完整历史记录 Blocks |
| `convergence_check` | `question` | str | 用户问题 |
| | `latest_answer_blocks` | str | 所有参与者最新回答 Blocks |

### 语义分析模板变量

| 模板 Key | 变量名 | 类型 | 说明 |
|----------|--------|------|------|
| `question_intent_analysis` | `question` | str | 用户问题 |
| `semantic_extraction` | `question` | str | 用户问题 |
| | `answer` | str | 参与者回答 |
| | `comparison_axes` | str | 比较维度 JSON |
| `cross_actor_compare` | `topic_label` | str | 主题名称 |
| | `actor_positions` | str | 参与者立场 JSON |

---

## 修改记录

| 日期 | 变更内容 |
|------|----------|
| 2026-03-22 | 初始版本，整理所有字段定义 |