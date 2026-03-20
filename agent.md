 <think>

The user wants me to produce a prototype and architecture document for the MAGI project MVP. Key requirements:

1. **No code yet** - just architecture and prototype design
2. **Ignore benchmark** - not needed for first 3 major versions
3. **MVP version** - implement all core tech
4. **Beautiful, minimalist web UI** - Apple-style aesthetics
5. **Actor management** - configurable roles (API protocol layer + prompt layer), visual config management
6. **MAGI tribute** - startup animation placeholder (they'll provide later)

Let me organize this into:
- System architecture
- Data model / schema design
- UI wireframes (text-based)


- Component breakdown
- Tech stack recommendation
- API design
- User flow

The core architecture revolves around actors as reusable configurations combining API settings and prompts, with debate sessions orchestrating multiple actors through rounds while a meta judge synthesizes consensus, all streamed in real-time. I'm structuring this across five layers: the frontend web interface, backend API, debate engine handling the core logic, actor registry for managing configurations, and an LLM adapter that abstracts away provider differences. For the tech stack, I'm leaning toward Next.js for the frontend to handle both the UI and API routes seamlessly.

Defining the actor data model with encrypted API credentials, provider flexibility across OpenAI, Anthropic, or custom endpoints, and configurable debate personalities...

Now I'm structuring the debate session to track multiple rounds of discussion, individual actor messages with token usage, and a consensus mechanism that captures agreements, disagreements, and confidence levels across the debate.

Moving on to the UI design with an Apple-inspired aesthetic...

I want to emphasize clean whitespace, smooth animations, and glass morphism effects throughout the interface. The debate arena should use a split-view layout with color-coded actor cards, and the consensus panel at the bottom needs that frosted glass treatment to feel polished and modern.
</think>

# MAGI 项目 — MVP 原型与架构设计文档

> **v0.1 · 架构与原型 · 不含代码**

---

## 一、设计原则

```
1. 极简优先      → 每个页面只做一件事，没有多余元素
2. 信息密度克制  → 大量留白，呼吸感，Apple 官网级审美
3. 动效即反馈    → 所有状态变化都有过渡动画，不突兀
4. 深色基调      → 致敬 EVA 的科技/神秘感，同时提供浅色模式
5. 配置即产品    → Actor 配置面板本身要好看到"想截图分享"
```

---

## 二、技术架构总览

### 2.1 系统分层图

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                       │
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Splash   │  │  Debate   │  │  Actor    │  │ History  │ │
│  │  Screen   │  │  Arena    │  │  Manager  │  │  List    │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              UI Framework: React + Tailwind             ││
│  │              State: Zustand    Stream: SSE              ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (API Server)                    │
│                        Python FastAPI                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    API Layer (REST + SSE)             │   │
│  │  POST /debate/start    GET /debate/:id/stream        │   │
│  │  CRUD /actors          GET /debate/:id/result        │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │               DEBATE ENGINE (Core)                   │   │
│  │                                                      │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │   │
│  │  │ Orchestrator│  │ Round       │  │ Convergence  │  │   │
│  │  │ (总调度)    │  │ Manager     │  │ Detector     │  │   │
│  │  │            │  │ (轮次管理)   │  │ (收敛判断)    │  │   │
│  │  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘  │   │
│  │        │                │                │           │   │
│  │        ▼                ▼                ▼           │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │            Meta Judge (共识裁决)              │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └───────────────────────────┬──────────────────────────┘   │
│                              │                              │
│  ┌───────────────────────────▼──────────────────────────┐   │
│  │              LLM ADAPTER LAYER (统一接口)             │   │
│  │                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│  │  │ OpenAI   │ │Anthropic │ │ Custom   │ │Ollama  │  │   │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │Adapter │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              STORAGE (SQLite → PostgreSQL)            │   │
│  │  actors / sessions / rounds / messages / configs     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 推荐技术选型

| 层 | 选型 | 理由 |
|---|---|---|
| **前端框架** | Next.js 14 (App Router) | SSR + 文件路由 + 部署方便 (Vercel) |
| **样式** | Tailwind CSS + Framer Motion | 极快开发速度 + 流畅动效 |
| **状态管理** | Zustand | 轻量，比 Redux 简洁 10 倍 |
| **流式传输** | SSE (Server-Sent Events) | 比 WebSocket 简单，单向流足够 |
| **后端框架** | Python FastAPI | 原生 async + SSE 支持 + 类型安全 |
| **LLM SDK** | `openai` + `anthropic` 官方 SDK | 稳定，streaming 原生支持 |
| **数据库** | SQLite (MVP) → PostgreSQL | 零配置启动，后续可迁移 |
| **部署** | Vercel (前端) + Railway/Fly.io (后端) | MVP 阶段免费/低成本 |
| **字体** | Inter (英文) + Noto Sans SC (中文) | 最接近 Apple 的开源字体方案 |

---

## 三、核心数据模型

### 3.1 Actor（演员 / 角色）

```
Actor
├── id                  : UUID
├── name                : string          "CASPER" / "BALTHASAR" / "MELCHIOR"
├── display_color       : string          "#FF6B35" (UI 标识色)
├── icon                : string          emoji 或 icon name
│
├── api_config          : APIConfig
│   ├── provider        : enum            "openai" | "anthropic" | "google" | "custom"
│   ├── api_format      : enum            "openai_compatible" | "anthropic" | "custom"
│   ├── base_url        : string          "https://api.openai.com/v1"
│   ├── api_key         : string          (加密存储)
│   ├── model           : string          "gpt-4o" / "claude-3-5-sonnet-20241022"
│   ├── max_tokens      : int             4096
│   ├── temperature     : float           0.7
│   └── extra_params    : JSON            (厂商特有参数，如 top_p 等)
│
├── prompt_config       : PromptConfig
│   ├── system_prompt   : string          "你是一位严谨的技术评审员..."
│   ├── review_prompt   : string          "请批判性地审视以下回答..."
│   ├── revision_prompt : string          "根据以下批评，修正你的回答..."
│   ├── personality     : string          (预设性格标签：保守/激进/中立/学术)
│   └── custom_instructions : string      (用户补充指令)
│
├── is_meta_judge       : boolean         是否可作为共识裁决者
├── created_at          : datetime
└── updated_at          : datetime
```

### 3.2 Debate Session（辩论会话）

```
DebateSession
├── id                  : UUID
├── question            : string          用户原始问题
├── status              : enum            "initializing" | "debating" | "judging" | "completed" | "stopped"
├── actor_ids           : [UUID]          参与辩论的 Actor（2-N 个）
├── judge_actor_id      : UUID            Meta Judge 用的 Actor
├── config              : SessionConfig
│   ├── max_rounds      : int             3
│   ├── convergence_threshold : float     0.85
│   └── auto_stop       : boolean         到达收敛自动停止
│
├── rounds              : [Round]
│   ├── round_number    : int
│   ├── phase           : enum            "initial" | "review" | "revision" | "final"
│   └── messages        : [Message]
│       ├── actor_id    : UUID
│       ├── role        : enum            "answer" | "review" | "revision" | "final"
│       ├── content     : string
│       ├── token_usage : { input, output }
│       └── timestamp   : datetime
│
├── consensus           : ConsensusResult (nullable, 完成后填充)
│   ├── summary         : string
│   ├── agreements      : [string]
│   ├── disagreements   : [string]
│   ├── confidence      : float           0.0 ~ 1.0
│   └── recommendation  : string
│
├── total_tokens        : int
├── total_cost          : float           (按模型定价估算)
├── created_at          : datetime
└── completed_at        : datetime
```

---

## 四、核心引擎流程

### 4.1 辩论编排流程（Orchestrator）

```
START
  │
  ▼
[1] 接收用户问题 + 选择的 Actors + 配置
  │
  ▼
[2] ──── ROUND 1: Initial Response ────────────────────
  │   并行调用所有 Actor，各自独立回答用户问题
  │   Actor_A.answer(question)  →  Stream → 前端
  │   Actor_B.answer(question)  →  Stream → 前端
  │   (等待所有 Actor 完成)
  │
  ▼
[3] ──── ROUND 2: Cross Review ────────────────────────
  │   每个 Actor 收到其他 Actor 的回答，进行批判性审查
  │   Actor_A.review(question, B_answer)  →  Stream → 前端
  │   Actor_B.review(question, A_answer)  →  Stream → 前端
  │
  ▼
[4] ──── ROUND 3: Revision ────────────────────────────
  │   每个 Actor 收到对方的 review，修正自己的回答
  │   Actor_A.revise(own_answer, B_review)  →  Stream → 前端
  │   Actor_B.revise(own_answer, A_review)  →  Stream → 前端
  │
  ▼
[5] ──── 收敛检测 ─────────────────────────────────────
  │   Convergence Detector 检查：
  │     ├── 两方修正后的回答语义相似度 > 阈值？
  │     ├── 或已达到 max_rounds？
  │     ├── 是 → 进入 [6]
  │     └── 否 → 回到 [3]，开始下一轮 review
  │
  ▼
[6] ──── Meta Judge: 共识裁决 ─────────────────────────
  │   将全部对话历史交给 Judge Actor
  │   输出结构化的 ConsensusResult：
  │     { summary, agreements, disagreements, confidence }
  │   Stream → 前端
  │
  ▼
[7] 存储完整 session → 标记 status = "completed"
  │
  ▼
END
```

### 4.2 收敛检测策略（MVP 版本）

```
MVP 收敛策略（简单有效）：

方案 A：硬轮次上限
  → 固定 3 轮，不做收敛检测
  → 最简单，MVP 推荐 ✅

方案 B：关键论点重叠
  → 用 Meta Judge Actor 在每轮结束后做一次快速判断
  → Prompt: "以下两个修正后的回答，核心观点是否已基本一致？回答 YES/NO"
  → 如果 YES → 提前终止
  → 增加 1 次 API 调用/轮，但可省后续轮次

MVP 选择：方案 A（3 轮硬上限）
v1.1 升级：方案 B（智能收敛）
```

### 4.3 并行 vs 顺序

```
Round 1 (Initial): Actor A & B → 并行调用 ✅（互不依赖）
Round 2 (Review):  Actor A & B → 并行调用 ✅（各看对方 Round 1）
Round 3 (Revise):  Actor A & B → 并行调用 ✅（各看对方 Round 2）
Meta Judge:        单次调用    → 顺序

→ 每一轮内部并行，轮与轮之间顺序
→ 总延迟 ≈ 3 × max(Actor_A, Actor_B) + 1 × Judge
→ 预估 15-30 秒（取决于模型响应速度）
```

---

## 五、API 设计

### 5.1 接口列表

```
═══════════════════════════════════════════════════
  ACTOR 管理
═══════════════════════════════════════════════════
GET    /api/actors              获取所有 Actor 列表
POST   /api/actors              创建新 Actor
GET    /api/actors/:id          获取单个 Actor 详情
PUT    /api/actors/:id          更新 Actor
DELETE /api/actors/:id          删除 Actor
POST   /api/actors/:id/test     测试 Actor 连通性（发一条测试消息）

═══════════════════════════════════════════════════
  辩论 SESSION
═══════════════════════════════════════════════════
POST   /api/debate/start        启动新辩论
  Body: {
    question: string,
    actor_ids: [UUID, UUID],
    judge_actor_id: UUID,
    config: { max_rounds: 3 }
  }
  Response: { session_id: UUID }

GET    /api/debate/:id/stream   SSE 流式获取辩论过程
  Event Types:
    event: round_start     data: { round: 1, phase: "initial" }
    event: actor_start     data: { actor_id, actor_name }
    event: token           data: { actor_id, content: "..." }
    event: actor_end       data: { actor_id, token_usage }
    event: round_end       data: { round: 1 }
    event: judge_start     data: {}
    event: judge_token     data: { content: "..." }
    event: consensus       data: { ConsensusResult }
    event: complete        data: { session summary }
    event: error           data: { message }

POST   /api/debate/:id/stop     手动停止辩论
GET    /api/debate/:id          获取完整辩论记录

═══════════════════════════════════════════════════
  历史记录
═══════════════════════════════════════════════════
GET    /api/sessions            获取历史 session 列表
DELETE /api/sessions/:id        删除某条记录

═══════════════════════════════════════════════════
  系统
═══════════════════════════════════════════════════
GET    /api/presets/actors      获取预设 Actor 模板
GET    /api/health              健康检查
```

---

## 六、前端页面架构与 UI 原型

### 6.1 页面地图

```
/                           → Splash（MAGI 启动动画）→ 自动跳转 /arena
/arena                      → 辩论场（主页面）
/arena/:session_id          → 辩论进行中 / 查看历史辩论
/actors                     → Actor 管理列表
/actors/new                 → 新建 Actor
/actors/:id/edit            → 编辑 Actor
/settings                   → 全局设置（深色模式/语言等）
```

### 6.2 设计系统（Design Tokens）

```
═══ 色彩体系 ═══

Dark Mode 为主（致敬 EVA 暗色调）：

  --bg-primary:       #0A0A0B        近黑背景
  --bg-secondary:     #141416        卡片/面板背景
  --bg-tertiary:      #1C1C1F        悬浮态/输入框
  --border:           #2A2A2E        极细分割线
  
  --text-primary:     #F5F5F7        主文本（Apple 式亮白）
  --text-secondary:   #86868B        次要文本
  --text-tertiary:    #56565A        辅助信息
  
  --accent-blue:      #0A84FF        主色调（链接/按钮）
  --accent-green:     #30D158        成功/共识
  --accent-orange:    #FF9F0A        警告/分歧
  --accent-red:       #FF453A        错误/冲突
  --accent-purple:    #BF5AF2        Meta Judge 专属色

Actor 预设色板（区分不同 Actor）：
  Actor 1:  #FF6B35 (CASPER 橙)
  Actor 2:  #4ECDC4 (BALTHASAR 青)
  Actor 3:  #A855F7 (MELCHIOR 紫)
  Judge:    #BF5AF2 (裁决者紫)

═══ 字体 ═══

  --font-sans:  'Inter', 'Noto Sans SC', -apple-system, sans-serif
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace

  标题:    text-2xl (24px)   font-semibold  tracking-tight
  正文:    text-base (16px)  font-normal    leading-relaxed
  小字:    text-sm (14px)    font-normal    text-secondary
  代码:    text-sm           font-mono

═══ 圆角 ═══

  按钮:     rounded-xl    (12px)
  卡片:     rounded-2xl   (16px)
  输入框:   rounded-xl    (12px)
  弹窗:     rounded-3xl   (24px)

═══ 阴影（仅深色模式用微光效果）═══

  卡片:     shadow-lg shadow-black/20 + border border-white/5
  弹窗:     shadow-2xl shadow-black/40

═══ 动效 ═══

  过渡:     transition-all duration-300 ease-out
  入场:     fade-in + slide-up (Framer Motion)
  流式文字: 逐字符出现，typewriter 效果
  轮次切换: 横向滑动过渡
```

---

### 6.3 页面 0：Splash Screen（启动动画）

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                     ╔═══════════╗                       │
│                     ║           ║                       │
│                     ║   MAGI    ║                       │
│                     ║  SYSTEM   ║                       │
│                     ║           ║                       │
│                     ╚═══════════╝                       │
│                                                         │
│              [ 启 动 动 画 区 域 - 留 空 ]               │
│                                                         │
│              你完成后提供给我，我来集成                     │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘

行为说明：
  - 首次访问 / 刷新时播放
  - 动画结束后自动淡入主界面
  - 设置 localStorage 标记，后续访问可选择跳过
  - 右下角小字 "SKIP →" 可手动跳过
```

---

### 6.4 页面 1：Debate Arena（辩论场 — 核心主页）

#### 状态 A：等待输入（默认状态）

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─ Nav ──────────────────────────────────────────────────────┐ │
│  │  ◉ MAGI          [Arena]    Actors    History    ⚙ Settings│ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                                                 │
│                                                                 │
│                                                                 │
│                         M A G I                                 │
│                  Multi-Agent Guided                              │
│                     Intelligence                                │
│                                                                 │
│                                                                 │
│         ┌───────────────────────────────────────────┐           │
│         │                                           │           │
│         │    输入你的问题，让多个 AI 辩论求解          │           │
│         │                                           │           │
│         └───────────────────────────────────────────┘           │
│                                                                 │
│                                                                 │
│         参与辩论的 Actor:                                        │
│                                                                 │
│         ┌──────────┐    ┌──────────┐    ┌────────┐             │
│         │ 🟠       │    │ 🔵       │    │ + 添加  │             │
│         │ CASPER   │    │BALTHASAR │    │  Actor │             │
│         │ GPT-4o   │    │ Claude   │    │        │             │
│         │    ✓ 选中 │    │    ✓ 选中 │    │        │             │
│         └──────────┘    └──────────┘    └────────┘             │
│                                                                 │
│         裁决者:  🟣 MELCHIOR (Claude 3.5 Sonnet)   [更换]       │
│         轮次:    3 轮   [调整]                                   │
│                                                                 │
│                    ┌───────────────┐                             │
│                    │  ▶ 开始辩论    │                             │
│                    └───────────────┘                             │
│                                                                 │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   最近辩论                                                       │
│   ┌────────────────────────────────────────────────────┐        │
│   │ "React vs Vue 2025年新项目"  ✅ 87%共识  3分钟前    │        │
│   ├────────────────────────────────────────────────────┤        │
│   │ "该不该读研"                  ⚡ 62%共识  昨天       │        │
│   └────────────────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 状态 B：辩论进行中（核心交互）

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◉ MAGI      [Arena]  Actors  History  ⚙                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  问题: "2025年做全栈开发，Rust + WASM 能否替代 Node.js？"             │
│                                                          [⏹ 停止]   │
│                                                                      │
│  ● Round 1 / 3 — 初始回答                   ○ Round 2   ○ Round 3   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌─────────────────────────────┐ ┌──────────────────────────────┐   │
│  │ 🟠 CASPER                   │ │ 🔵 BALTHASAR                 │   │
│  │    GPT-4o                   │ │    Claude 3.5 Sonnet         │   │
│  │ ─────────────────────────── │ │ ──────────────────────────── │   │
│  │                             │ │                              │   │
│  │ Rust + WASM 确实在性能上有    │ │ 虽然 Rust + WASM 技术上        │   │
│  │ 显著优势，特别是在以下场景：   │ │ 很强大，但从全栈开发的实际      │   │
│  │                             │ │ 需求来看，Node.js 仍然是       │   │
│  │ 1. 计算密集型前端应用        │ │ 更务实的选择：                  │   │
│  │ 2. 边缘计算场景             │ │                              │   │
│  │ 3. 高性能后端服务            │ │ 1. 生态成熟度差距巨大          │   │
│  │                             │ │ 2. 开发效率和招聘成本          │   │
│  │ 但要完全替代 Node.js，       │ │ 3. 全栈统一语言的便利性        │   │
│  │ 目前还面临几个挑战...█       │ │                              │   │
│  │                             │ │ 2025年 Rust WASM 在特定       │   │
│  │                             │ │ 领域是补充，不是替代...█       │   │
│  │            ● 生成中          │ │              ● 生成中          │   │
│  │            237 tokens        │ │              194 tokens       │   │
│  └─────────────────────────────┘ └──────────────────────────────┘   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 📊 实时状态栏                                                │   │
│  │ Round 1/3    Token: 431/~12000    预估耗费: $0.03   已用 8s  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 状态 C：辩论完成 — 共识面板

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ...（上方是可折叠的 3 轮辩论内容）...                                │
│                                                                      │
│  ● Round 1    ● Round 2    ● Round 3    ★ 共识                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  🟣 MAGI CONSENSUS                                          │   │
│  │  ──────────────────────────────────────────────────────      │   │
│  │                                                              │   │
│  │  📊 共识置信度                                                │   │
│  │  ████████████████████████████░░░░░░░  78%                    │   │
│  │                                                              │   │
│  │  📝 总结                                                     │   │
│  │  Rust + WASM 在 2025 年尚不能完全替代 Node.js 做全栈开发，    │   │
│  │  但在计算密集型场景中是有价值的补充技术。                       │   │
│  │                                                              │   │
│  │  ✅ 共识点                                                    │   │
│  │  · Rust 在性能敏感场景有不可替代的优势                         │   │
│  │  · Node.js 生态在 2025 年仍远超 Rust WASM                    │   │
│  │  · 小团队不建议 All-in Rust 做全栈                            │   │
│  │                                                              │   │
│  │  ⚡ 分歧点                                                    │   │
│  │  · 对"3年后能否替代"的判断不同（CASPER偏乐观，BALTHASAR偏保守）│   │
│  │  · 对 WASM 在前端领域的渗透速度预估不同                        │   │
│  │                                                              │   │
│  │  🎯 建议                                                     │   │
│  │  当前项目仍建议 Node.js/TypeScript 全栈。可在性能关键模块       │   │
│  │  （图像处理、数据计算）中引入 Rust WASM 作为局部优化。          │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────┐  ┌────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ 👍 有用 │  │ 👎 没用 │  │ 🔗 复制链接   │  │ 📸 生成卡片   │        │
│  └────────┘  └────────┘  └──────────────┘  └──────────────┘        │
│                                                                      │
│  ── 统计 ───────────────────────────────────────────────            │
│  总 Token: 11,847   总耗费: $0.08   总耗时: 23s   轮次: 3           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 6.5 页面 2：Actor 管理

#### Actor 列表页

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◉ MAGI      Arena    [Actors]    History    ⚙                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Actor 管理                                       ┌──────────────┐  │
│  配置你的 AI 辩论参与者                              │ + 新建 Actor │  │
│                                                    └──────────────┘  │
│                                                                      │
│  ── 我的 Actor ─────────────────────────────────────────────────     │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │                      │  │                      │                 │
│  │  🟠 CASPER           │  │  🔵 BALTHASAR        │                 │
│  │                      │  │                      │                 │
│  │  Provider: OpenAI    │  │  Provider: Anthropic │                 │
│  │  Model:    GPT-4o    │  │  Model:    Claude    │                 │
│  │                      │  │           3.5 Sonnet │                 │
│  │  性格: 技术乐观派     │  │  性格: 务实保守派     │                 │
│  │                      │  │                      │                 │
│  │  ● 连接正常           │  │  ● 连接正常           │                 │
│  │                      │  │                      │                 │
│  │  [编辑]  [测试] [复制]│  │  [编辑]  [测试] [复制]│                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │                      │  │                      │                 │
│  │  🟣 MELCHIOR         │  │  🟢 DeepSeek-R1      │                 │
│  │  (Meta Judge)        │  │                      │                 │
│  │                      │  │  Provider: Custom    │                 │
│  │  Provider: Anthropic │  │  Model: deepseek-r1  │                 │
│  │  Model: Claude 3.5   │  │  Format: OpenAI兼容   │                 │
│  │                      │  │                      │                 │
│  │  性格: 中立裁决者     │  │  性格: 深度思考者     │                 │
│  │                      │  │                      │                 │
│  │  ● 连接正常           │  │  ○ 未测试             │                 │
│  │                      │  │                      │                 │
│  │  [编辑]  [测试] [复制]│  │  [编辑]  [测试] [复制]│                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
│  ── 预设模板 ───────────────────────────────────────────────────     │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │
│  │ GPT-4o       │ │ Claude 3.5   │ │ Gemini 2.0   │                │
│  │ 标准配置      │ │ 标准配置      │ │ 标准配置      │                │
│  │ [一键创建]    │ │ [一键创建]    │ │ [一键创建]    │                │
│  └──────────────┘ └──────────────┘ └──────────────┘                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Actor 编辑页（核心配置界面）

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◉ MAGI     ← 返回 Actor 列表                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  编辑 Actor                                                          │
│                                                                      │
│  ┌─ 基本信息 ────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  名称        ┌──────────────────────────┐                    │   │
│  │              │ CASPER                   │                    │   │
│  │              └──────────────────────────┘                    │   │
│  │                                                              │   │
│  │  标识色      🟠 🔵 🟢 🟣 🔴 🟡 ⚪                             │   │
│  │              ▲ 已选                                          │   │
│  │                                                              │   │
│  │  角色类型    ◉ 辩论者 (Debater)    ○ 裁决者 (Judge)           │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ API 配置 ────────────────────────────────────────────────────┐  │
│  │                                                              │   │
│  │  Provider    ┌──────────────────────────┐                    │   │
│  │              │ OpenAI                 ▼ │                    │   │
│  │              └──────────────────────────┘                    │   │
│  │              选项: OpenAI / Anthropic / Google / Custom       │   │
│  │                                                              │   │
│  │  API Format  ┌──────────────────────────┐                    │   │
│  │              │ OpenAI Compatible      ▼ │   ← 选 Custom 时   │   │
│  │              └──────────────────────────┘     才需要改这个    │   │
│  │                                                              │   │
│  │  Base URL    ┌──────────────────────────────────────┐        │   │
│  │              │ https://api.openai.com/v1             │        │   │
│  │              └──────────────────────────────────────┘        │   │
│  │              选择 Provider 后自动填充，可手动修改               │   │
│  │                                                              │   │
│  │  API Key     ┌──────────────────────────────────────┐        │   │
│  │              │ sk-••••••••••••••••••••••••3a7f       │  👁    │   │
│  │              └──────────────────────────────────────┘        │   │
│  │              🔒 加密存储在本地                                  │   │
│  │                                                              │   │
│  │  Model       ┌──────────────────────────┐                    │   │
│  │              │ gpt-4o                 ▼ │                    │   │
│  │              └──────────────────────────┘                    │   │
│  │              常用: gpt-4o / gpt-4o-mini / gpt-4-turbo        │   │
│  │              或手动输入任意模型名                                │   │
│  │                                                              │   │
│  │  ┌─ 高级参数（默认折叠）─────────────────────────────────┐    │   │
│  │  │                                                      │    │   │
│  │  │  Temperature    ──────●──────────  0.7               │    │   │
│  │  │                 0            1           2            │    │   │
│  │  │                                                      │    │   │
│  │  │  Max Tokens     ┌─────────┐                          │    │   │
│  │  │                 │ 4096    │                          │    │   │
│  │  │                 └─────────┘                          │    │   │
│  │  │                                                      │    │   │
│  │  │  其他参数 (JSON) ┌──────────────────────────────┐    │    │   │
│  │  │                  │ { "top_p": 0.95 }            │    │    │   │
│  │  │                  └──────────────────────────────┘    │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │              ┌────────────────┐                               │   │
│  │              │ 🔌 测试连接     │   → 发送 "Hello" 验证可用性    │   │
│  │              └────────────────┘                               │   │
│  │              ● 连接成功 · GPT-4o · 响应 0.8s                   │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─ Prompt 配置 ─────────────────────────────────────────────────┐  │
│  │                                                              │   │
│  │  性格预设    ┌──────────────────────────┐                     │   │
│  │              │ 技术乐观派             ▼ │                     │   │
│  │              └──────────────────────────┘                     │   │
│  │  预设: 中立客观 / 技术乐观派 / 务实保守派 / 学术严谨 / 自定义   │   │
│  │  (选择预设会自动填充下方 prompt，仍可手动修改)                   │   │
│  │                                                              │   │
│  │  System Prompt                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ 你是一位经验丰富的技术专家，倾向于拥抱新技术和          │    │   │
│  │  │ 创新方案。你相信技术进步能解决大多数工程问题。          │    │   │
│  │  │ 在辩论中，你会积极指出新技术的潜力和机会。              │    │   │
│  │  │                                                      │    │   │
│  │  │ 重要：你必须基于事实论证，不可捏造数据。               │    │   │
│  │  │ 如果你不确定某个信息，明确说明。                        │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │  8 行 · 142 字                                       [重置]  │   │
│  │                                                              │   │
│  │  Review Prompt（审查他人回答时用）                              │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ 请批判性地审查以下回答。重点关注：                      │    │   │
│  │  │ 1. 事实准确性 - 是否有错误或过时的信息？               │    │   │
│  │  │ 2. 逻辑漏洞 - 推理是否有跳跃或矛盾？                  │    │   │
│  │  │ 3. 遗漏 - 是否忽略了重要的角度或论点？                 │    │   │
│  │  │ 4. 偏见 - 是否过度倾向某一方？                        │    │   │
│  │  │ 不要礼貌性敷衍，要给出具体的、有建设性的批评。          │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │  Revision Prompt（修正自己回答时用）                            │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ 根据以下来自其他评审者的批评，修正你之前的回答。        │    │   │
│  │  │ - 如果批评有道理，坦然承认并修正                       │    │   │
│  │  │ - 如果批评有误，有理有据地反驳                         │    │   │
│  │  │ - 给出修正后的完整回答                                │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  │  附加指令（可选）                                               │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │ 回答请使用中文                                        │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────┐                         ┌────────┐  ┌────────────┐  │
│  │ 🗑 删除     │                         │ 取消   │  │ ✓ 保存     │  │
│  └────────────┘                         └────────┘  └────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 6.6 页面 3：历史记录

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◉ MAGI      Arena    Actors    [History]    ⚙                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  辩论历史                                        🔍 搜索...          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  "2025 全栈开发 Rust+WASM vs Node.js"                        │   │
│  │  🟠 CASPER  ×  🔵 BALTHASAR  →  🟣 MELCHIOR 裁决             │   │
│  │  3 轮 · 11,847 tokens · $0.08                                │   │
│  │  共识 78% · 2025-07-15 14:32                                 │   │
│  │                                                      [查看]  │   │
│  │                                                              │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  "React vs Vue 2025年新项目该选哪个"                          │   │
│  │  🟠 CASPER  ×  🔵 BALTHASAR  →  🟣 MELCHIOR 裁决             │   │
│  │  3 轮 · 9,231 tokens · $0.06                                 │   │
│  │  共识 87% · 2025-07-14 09:15                                 │   │
│  │                                                      [查看]  │   │
│  │                                                              │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                              │   │
│  │  "该不该读研"                                                 │   │
│  │  🟠 CASPER  ×  🟢 DeepSeek-R1  →  🔵 BALTHASAR 裁决         │   │
│  │  3 轮 · 14,502 tokens · $0.05                                │   │
│  │  共识 62% · 2025-07-13 22:41                                 │   │
│  │                                                      [查看]  │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 七、组件拆分（前端）

```
src/
├── app/
│   ├── layout.tsx                  全局 layout（Nav + Dark mode）
│   ├── page.tsx                    Splash → redirect /arena
│   │
│   ├── arena/
│   │   ├── page.tsx                辩论场主页面
│   │   └── [sessionId]/
│   │       └── page.tsx            查看具体辩论
│   │
│   ├── actors/
│   │   ├── page.tsx                Actor 列表
│   │   ├── new/page.tsx            新建 Actor
│   │   └── [id]/edit/page.tsx      编辑 Actor
│   │
│   ├── history/
│   │   └── page.tsx                历史记录
│   │
│   └── settings/
│       └── page.tsx                设置页
│
├── components/
│   ├── layout/
│   │   ├── NavBar.tsx              顶部导航
│   │   └── SplashScreen.tsx        启动动画容器（你提供内容）
│   │
│   ├── arena/
│   │   ├── QuestionInput.tsx       问题输入框
│   │   ├── ActorSelector.tsx       选择参与辩论的 Actor
│   │   ├── DebatePanel.tsx         左右双栏辩论面板
│   │   ├── ActorColumn.tsx         单个 Actor 的回答列（含流式文字）
│   │   ├── RoundTabs.tsx           轮次切换标签
│   │   ├── ConsensusCard.tsx       共识结果卡片
│   │   ├── StatusBar.tsx           底部实时状态栏
│   │   └── ShareCard.tsx           分享卡片生成
│   │
│   ├── actors/
│   │   ├── ActorCard.tsx           Actor 展示卡片
│   │   ├── ActorForm.tsx           Actor 编辑表单（核心）
│   │   ├── ApiConfigSection.tsx    API 配置区块
│   │   ├── PromptConfigSection.tsx Prompt 配置区块
│   │   ├── ConnectionTester.tsx    连接测试按钮 + 结果
│   │   └── PresetTemplates.tsx     预设模板选择器
│   │
│   ├── history/
│   │   └── SessionList.tsx         历史会话列表
│   │
│   └── ui/                         基础 UI 组件
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── TextArea.tsx
│       ├── Select.tsx
│       ├── Slider.tsx
│       ├── Card.tsx
│       ├── Badge.tsx
│       ├── Progress.tsx
│       ├── Tooltip.tsx
│       └── StreamingText.tsx       流式文字渲染组件
│
├── lib/
│   ├── api.ts                      后端 API 客户端
│   ├── sse.ts                      SSE 连接管理
│   └── storage.ts                  localStorage 工具
│
├── stores/
│   ├── actorStore.ts               Actor CRUD 状态
│   ├── debateStore.ts              辩论进行中状态
│   └── uiStore.ts                  UI 状态（主题/splash）
│
└── styles/
    └── globals.css                 Tailwind + 自定义 CSS 变量
```

---

## 八、后端模块拆分

```
server/
├── main.py                         FastAPI 入口
├── config.py                       配置加载
│
├── api/
│   ├── __init__.py
│   ├── actors.py                   /api/actors CRUD
│   ├── debate.py                   /api/debate 启动/流/停止
│   ├── sessions.py                 /api/sessions 历史
│   └── presets.py                  /api/presets 预设模板
│
├── engine/
│   ├── __init__.py
│   ├── orchestrator.py             辩论总调度器 ⭐ 核心
│   ├── round_manager.py            单轮管理（并行调用 + 收集结果）
│   ├── convergence.py              收敛检测器
│   ├── meta_judge.py               共识裁决逻辑
│   └── prompt_builder.py           动态组装 prompt（含历史上下文）
│
├── adapters/
│   ├── __init__.py
│   ├── base.py                     LLM Adapter 抽象基类
│   ├── openai_adapter.py           OpenAI API 适配
│   ├── anthropic_adapter.py        Anthropic API 适配
│   └── custom_adapter.py           OpenAI-compatible 通用适配
│
├── models/
│   ├── __init__.py
│   ├── actor.py                    Actor 数据模型
│   ├── session.py                  Session 数据模型
│   └── consensus.py                ConsensusResult 数据模型
│
├── storage/
│   ├── __init__.py
│   ├── database.py                 SQLite 连接 / ORM
│   └── repository.py              数据访问层
│
├── presets/
│   ├── actors/                     预设 Actor 配置 JSON
│   │   ├── casper_gpt4o.json
│   │   ├── balthasar_claude.json
│   │   └── melchior_judge.json
│   └── prompts/                    预设 prompt 模板
│       ├── neutral.json
│       ├── optimistic.json
│       ├── conservative.json
│       └── academic.json
│
└── utils/
    ├── crypto.py                   API Key 加密/解密
    ├── token_counter.py            Token 用量估算
    └── cost_calculator.py          费用计算
```

---

## 九、核心引擎伪逻辑（Orchestrator）

```
class Orchestrator:

    async def run_debate(session_config) -> AsyncGenerator[SSEEvent]:
        
        yield SSEEvent("debate_start", { session_id, question, actors })
        
        actors = load_actors(session_config.actor_ids)
        judge = load_actor(session_config.judge_actor_id)
        context = DebateContext(question=session_config.question)
        
        # ═══ ROUND 1: Initial Response ═══
        yield SSEEvent("round_start", { round: 1, phase: "initial" })
        
        tasks = []
        for actor in actors:
            prompt = PromptBuilder.build_initial(actor, context)
            tasks.append(call_llm_streaming(actor, prompt))
        
        # 并行流式输出
        responses = await parallel_stream(tasks, yield_tokens=True)
        # 每个 token 实时 yield → 前端实时渲染
        
        context.add_round(1, "initial", responses)
        yield SSEEvent("round_end", { round: 1 })
        
        # ═══ ROUND 2..N: Review + Revise ═══
        for round_num in range(2, max_rounds + 1):
            
            # --- Review Phase ---
            yield SSEEvent("round_start", { round: round_num, phase: "review" })
            
            review_tasks = []
            for i, actor in enumerate(actors):
                others_responses = [r for j, r in enumerate(responses) if j != i]
                prompt = PromptBuilder.build_review(actor, context, others_responses)
                review_tasks.append(call_llm_streaming(actor, prompt))
            
            reviews = await parallel_stream(review_tasks, yield_tokens=True)
            context.add_round(round_num, "review", reviews)
            
            # --- Revision Phase ---
            yield SSEEvent("phase_change", { phase: "revision" })
            
            revision_tasks = []
            for i, actor in enumerate(actors):
                others_reviews = [r for j, r in enumerate(reviews) if j != i]
                prompt = PromptBuilder.build_revision(actor, context, others_reviews)
                revision_tasks.append(call_llm_streaming(actor, prompt))
            
            responses = await parallel_stream(revision_tasks, yield_tokens=True)
            context.add_round(round_num, "revision", responses)
            yield SSEEvent("round_end", { round: round_num })
        
        # ═══ META JUDGE ═══
        yield SSEEvent("judge_start", {})
        
        judge_prompt = PromptBuilder.build_judge(judge, context)
        consensus = await call_llm_streaming(judge, judge_prompt, yield_tokens=True)
        consensus_result = parse_consensus(consensus)
        
        yield SSEEvent("consensus", consensus_result)
        
        # ═══ 保存 ═══
        save_session(context, consensus_result)
        
        yield SSEEvent("complete", { session_id, total_tokens, total_cost })
```

---

## 十、Prompt 模板结构

### 10.1 Initial Answer Prompt

```
[System]
{actor.system_prompt}

{actor.custom_instructions}

[User]
请回答以下问题。要求：
- 给出你的明确观点和立场
- 用具体事实和数据支撑论点
- 结构清晰，论证完整
- 如有不确定的信息，明确标注

问题：{question}
```

### 10.2 Review Prompt

```
[System]
{actor.system_prompt}

你现在进入「审查模式」。

[User]
原始问题：{question}

你之前的回答：
---
{own_answer}
---

另一位专家的回答：
---
{other_answer}
---

{actor.review_prompt}

请给出你的审查意见。
```

### 10.3 Revision Prompt

```
[System]
{actor.system_prompt}

你现在进入「修正模式」。

[User]
原始问题：{question}

你之前的回答：
---
{own_answer}
---

另一位专家对你的审查意见：
---
{other_review}
---

{actor.revision_prompt}

请给出修正后的完整回答。
```

### 10.4 Meta Judge Prompt

```
[System]
你是 MAGI 系统的共识裁决者。你的任务是综合多轮辩论的内容，
输出结构化的共识报告。你必须保持绝对中立，不偏向任何一方。

[User]
原始问题：{question}

以下是 {N} 位专家经过 {rounds} 轮辩论的完整记录：

{formatted_debate_history}

请输出以下格式的共识报告（使用 JSON）：

{
  "summary": "一段话总结最终结论",
  "agreements": ["共识点1", "共识点2", ...],
  "disagreements": ["分歧点1", "分歧点2", ...],
  "confidence": 0.78,  // 0-1，基于共识程度
  "recommendation": "给用户的具体建议"
}

评分标准：
- confidence 1.0 = 所有专家完全一致
- confidence 0.5 = 各执一词，无法调和
- confidence 0.0 = 完全矛盾

请确保 JSON 格式正确。
```

---

## 十一、MVP 功能边界

### ✅ MVP 必须做

| 功能 | 说明 |
|------|------|
| Actor CRUD | 创建/编辑/删除/列表 |
| API 配置 | 支持 OpenAI / Anthropic / OpenAI-compatible |
| Prompt 配置 | System + Review + Revision 三段式 |
| 连接测试 | 一键验证 Actor API 可用性 |
| 辩论启动 | 选 2 个 Actor + 1 个 Judge，输入问题 |
| 流式辩论 | SSE 实时左右双栏显示 |
| 3 轮固定 | Initial → Review → Revision，固定 3 轮 |
| 共识输出 | 结构化共识报告（JSON 解析渲染） |
| 历史记录 | 查看过去的辩论 |
| 深色主题 | 默认深色，Apple 级美学 |
| 启动动画 | 预留接口，你做好后集成 |
| 预设模板 | 3 个预设 Actor + 4 种性格 prompt |

### ❌ MVP 不做

| 功能 | 推迟到 |
|------|--------|
| Benchmark | v3+ |
| 智能收敛检测 | v1.1 |
| 用户账号系统 | v2 |
| 分享链接 | v1.1 |
| 投票功能 | v2 |
| 分享卡片生成 | v1.1 |
| 浅色主题 | v1.1 |
| 多语言 i18n | v2 |
| 3+ Actor 辩论 | v1.2（先做 2 对 1） |
| API 对外开放 | v2 |
| 部署托管版 | v1.1（MVP 先本地跑） |
| 付费功能 | v2+ |

---

## 十二、MVP 工作量估算

```
假设：你全职投入，熟悉 React + Python

Phase 1: 后端引擎 (3-5 天)
  ├── LLM Adapter 层             1 天
  ├── Orchestrator + 轮次管理    1-2 天
  ├── API 接口 + SSE             1 天
  └── Actor 存储 + CRUD          0.5 天

Phase 2: 前端 UI (5-7 天)
  ├── 项目脚手架 + 设计系统      1 天
  ├── Actor 管理页面              1-2 天
  ├── 辩论场 + 流式渲染           2-3 天
  ├── 共识结果页                  0.5 天
  ├── 历史记录                    0.5 天
  └── 启动动画集成                0.5 天

Phase 3: 联调 + 打磨 (2-3 天)
  ├── 前后端联调                  1 天
  ├── UI 细节打磨 + 动效          1 天
  └── 测试 + 修 bug               1 天

────────────────────────────────
总计: 10-15 天（2-3 周）
```

