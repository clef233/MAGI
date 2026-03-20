# MAGI 开发文档

## 快速启动

### 后端启动 (FastAPI)

```bash
cd d:/Projects/MAGI/backend
D:/anaconda/python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端地址: http://localhost:8000
API 文档: http://localhost:8000/docs

### 前端启动 (Next.js)

```bash
cd d:/Projects/MAGI/frontend
npm run dev
```

前端地址: http://localhost:3000

---

## 项目结构

```
d:\Projects\MAGI\
├── START.HTML              # 启动动画源文件（已集成到前端 Splash 组件）
├── agent.md                # 项目架构设计文档
│
├── backend/                # Python FastAPI 后端
│   ├── pyproject.toml      # Python 依赖配置
│   ├── magi.db             # SQLite 数据库（运行后生成）
│   │
│   └── app/
│       ├── __init__.py
│       ├── main.py                    # FastAPI 应用入口，配置 CORS、路由
│       │
│       ├── core/
│       │   ├── __init__.py
│       │   └── config.py              # 配置管理（数据库URL、密钥等）
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── database.py            # SQLAlchemy 数据库模型定义
│       │   │                          #   - Actor: AI 角色（API配置 + Prompt配置）
│       │   │                          #   - DebateSession: 辩论会话
│       │   │                          #   - Round: 辩论轮次
│       │   │                          #   - Message: 消息记录
│       │   └── schemas.py             # Pydantic 请求/响应模型
│       │
│       ├── api/
│       │   ├── __init__.py
│       │   ├── actors.py              # Actor CRUD API
│       │   ├── debate.py              # 辩论启动、SSE 流式传输
│       │   ├── sessions.py            # 历史会话管理
│       │   └── presets.py             # 预设 Actor 模板
│       │
│       └── services/
│           ├── __init__.py
│           ├── database.py            # 数据库连接、Session 管理
│           ├── llm_adapter.py         # LLM 适配器（OpenAI, Anthropic, Custom）
│           │                          # 【当前BUG位置】async generator 问题
│           └── debate_engine.py       # 辩论引擎核心逻辑
│                                      #   - 3轮辩论流程
│                                      #   - Meta Judge 共识裁决
│
└── frontend/               # Next.js 14 前端
    ├── package.json        # npm 依赖配置
    ├── next.config.js      # Next.js 配置（API 代理到后端）
    ├── tailwind.config.ts  # Tailwind CSS 主题配置
    │
    └── src/
        ├── app/
        │   ├── layout.tsx            # 根布局
        │   ├── page.tsx              # 首页（Splash → Arena）
        │   └── globals.css           # 全局样式
        │
        ├── components/
        │   ├── index.ts              # 组件导出
        │   ├── Splash.tsx            # 启动动画（来自 START.HTML）
        │   ├── Arena.tsx             # 主页面（问题输入、Actor选择）
        │   ├── ActorCard.tsx         # Actor 选择卡片
        │   ├── ActorManager.tsx      # Actor 管理页面（创建/编辑/删除）
        │   ├── DebateView.tsx        # 辩论进行中的视图
        │   ├── ConsensusView.tsx     # 共识结果展示
        │   └── SessionHistory.tsx    # 历史辩论列表
        │
        ├── stores/
        │   ├── index.ts
        │   ├── actorStore.ts         # Actor 状态管理 (Zustand)
        │   └── debateStore.ts        # 辩论状态管理、SSE 事件处理
        │
        ├── types/
        │   └── index.ts              # TypeScript 类型定义
        │
        └── lib/
            └── utils.ts              # 工具函数 (cn 等)
```

---

## 核心数据流

```
用户输入问题
     ↓
选择 Actors (≥2) + Judge (1)
     ↓
POST /api/debate/start → 创建 DebateSession
     ↓
GET /api/debate/:id/stream → SSE 连接
     ↓
DebateEngine.run_debate() 流程:
     │
     ├─ Round 1: Initial (并行) - 各 Actor 独立回答
     │
     ├─ Round 2: Review (并行) - 互相评审
     │
     ├─ Round 3: Revision (并行) - 根据评审修正
     │
     └─ Meta Judge: 综合所有对话，输出共识 JSON
     ↓
前端显示 Consensus 结果
```

---

## API 端点

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/actors | 获取所有 Actor |
| POST | /api/actors | 创建 Actor |
| GET | /api/actors/:id | 获取 Actor 详情 |
| PUT | /api/actors/:id | 更新 Actor |
| DELETE | /api/actors/:id | 删除 Actor |
| POST | /api/actors/:id/test | 测试 Actor 连通性 |
| POST | /api/debate/start | 启动辩论 |
| GET | /api/debate/:id/stream | SSE 流式获取辩论 |
| POST | /api/debate/:id/stop | 停止辩论 |
| GET | /api/debate/:id | 获取辩论详情 |
| GET | /api/sessions | 获取历史会话 |
| GET | /api/presets/actors | 获取预设 Actor 模板 |
| GET | /api/health | 健康检查 |

---

## 当前已知问题

### 1. async_generator 报错

**错误信息**: `object async_generator can't be used in 'await' expression`

**位置**: `backend/app/services/debate_engine.py`

**可能原因**:
- `DebateEngine.run_debate()` 是 async generator
- `_run_initial_round()` 等方法也是 async generator
- 调用方式需要用 `async for` 而不是 `await`

**已尝试修复**: 第 86, 103, 120, 131 行已改为 `async for`

**仍需排查**:
- 检查 `llm_adapter.py` 中 `stream_completion` 的调用
- 检查 `debate_engine.py` 中内部函数 `actor_response()` 等的异步调用

---

## 技术栈

- **后端**: Python 3.9+, FastAPI, SQLAlchemy, Pydantic
- **前端**: Next.js 14, React 18, Tailwind CSS, Framer Motion, Zustand
- **数据库**: SQLite (开发) → PostgreSQL (生产)
- **AI SDK**: openai, anthropic 官方 SDK

---

## 环境要求

- Anaconda Python (或 Python 3.9+)
- Node.js 18+
- npm 或 pnpm

---

## 待完成功能

1. [ ] 修复 async_generator 错误
2. [ ] 实现真实的 LLM 调用（当前会调用 API）
3. [ ] 添加错误处理和重试逻辑
4. [ ] 实现 Token 计数和费用估算
5. [ ] 添加浅色模式支持
6. [ ] 部署配置