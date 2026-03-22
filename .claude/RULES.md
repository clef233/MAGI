# MAGI 项目铁律

## 🚫 绝对禁止

### 1. 禁止硬编码提示词
- **任何** LLM prompt 文本必须且只能来自 `PromptService`（从 DB 加载）
- **禁止** 在 `debate_engine.py`、`convergence_service.py`、`semantic_service.py` 或任何 service 文件中出现 f-string 拼接的 prompt
- **禁止** 以 "fallback"、"backup"、"default" 为借口在代码中内联 prompt 文本

### 2. 禁止滥用 fallback
- `PromptService` 加载模板失败时，必须 **raise PromptError 并终止流程**，不得静默降级
- 唯一允许的 fallback 是 `_seed_default_prompts()` 中的初始种子数据
- 如果模板缺失，说明数据库未正确初始化，应报错而非掩盖

### 3. 变量名契约
- DB 模板的 `required_variables` 必须与 `PromptService` 方法签名中的参数名 **完全一致**
- 任何变量名变更必须同时更新：seed 数据、PromptService 方法、debate_engine 调用点
- 使用 `{{variable}}` 模板语法，变量名使用 snake_case

## ✅ 必须遵守

### 提示词修改流程
1. 修改 `_seed_default_prompts()` 中的种子数据
2. 确认 `PromptService` 对应方法的参数名匹配
3. 确认 `debate_engine.py` 调用时传入的 key 匹配
4. 删除 DB 文件重新测试（或手动更新 DB）
5. 在 Settings UI 中验证模板可编辑且变量标签正确显示

### 单一真相源
- 提示词的**唯一真相源**是数据库中的 `workflow_prompt_templates` 表
- `_seed_default_prompts()` 是初始种子，仅在 key 不存在时写入
- Settings UI 是用户编辑入口
- `PromptService` 是运行时读取入口