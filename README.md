# MAGI - Multi-Agent Guided Intelligence

> 多模型互评求解系统 —— 让多个 AI 互相审查、质疑、修订，最终输出高质量的综合回答。

灵感来自《新世纪福音战士》中的 MAGI 超级计算机系统。

## ✨ 特性

- **多模型互评**：多个 AI 独立回答 → 交叉互评 → 基于批评修订 → 综合最终回答
- **实时流式输出**：通过 SSE 实时展示每个模型的思考过程
- **语义分歧图谱**：自动提炼各模型观点的共识与分歧维度
- **灵活的模型配置**：支持 OpenAI / Anthropic / 任何 OpenAI 兼容 API（硅基流动、DeepSeek 等）
- **EVA 风格 UI**：致敬《新世纪福音战士》的 MAGI 系统界面

## 🚀 快速开始

### 环境要求

- **Python** 3.9+
- **Node.js** 18+

### 安装与启动

**Windows：**
首先
```
双击 setup.bat
```
等待安装依赖完成

然后
```
双击 start.bat
```
---

**Mac/Linux：**
```bash
chmod +x setup.sh && ./setup.sh
```
（未测试mac/linux环境）

```bash
chmod +x start.sh && ./start.sh
```

启动后浏览器会自动打开 `http://localhost:3000`。
---

### ⚙️ 首次配置

1. 打开页面后点击 **⚡ 快速配置**
2. 选择 API 服务商（默认硅基流动）
3. 输入你的 API Key
4. 点击 **一键配置**

完成！系统会自动创建所有需要的 AI Actor 和语义分析模型。

> 💡 **硅基流动**注册地址：https://cloud.siliconflow.cn/
> 注册后在「API 密钥」页面创建一个 Key 即可。
>

### ⚙️ 手动配置

如果不使用快速配置，你可以手动管理：

- **Actor 管理**：点击顶部导航的 `Actors` 创建/编辑模型
- **提示词编辑**：点击右上角 ⚙️ Settings，可编辑所有工作流提示词和 Actor 预设
- **语义分析模型**：在 Settings → 语义分析模型中单独配置

### 支持的 API 格式

| 服务商 | Provider 类型 | 说明 |
|--------|-------------|------|
| OpenAI | `openai` | 官方 API |
| Anthropic | `anthropic` | Claude 系列 |
| 硅基流动 | `custom` | Base URL: `https://api.siliconflow.cn/v1` |
| DeepSeek | `custom` | Base URL: `https://api.deepseek.com/v1` |
| 其他兼容 API | `custom` | 任何 OpenAI 格式兼容的 API |

## 📖 使用方法

1. 在主页输入你的问题
2. 选择 2-3 个参与互评的 Actor（模型）
3. 选择 1 个总结模型
4. 点击「开始互评」
5. 观看各模型实时输出、互相质疑、修订回答
6. 最终获得经过多轮审查的高质量综合回答

## 🏗 项目结构

```
MAGI/
├── backend/          # FastAPI 后端
│   ├── app/
│   │   ├── api/      # API 路由
│   │   ├── models/   # 数据模型
│   │   └── services/ # 业务逻辑
│   └── pyproject.toml
├── frontend/         # Next.js 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── stores/      # Zustand 状态管理
│   │   └── lib/         # 工具函数
│   └── package.json
├── setup.bat         # Windows 安装脚本
├── setup.sh          # Mac/Linux 安装脚本
├── start.bat         # Windows 启动脚本
├── start.sh          # Mac/Linux 启动脚本
└── stop.bat          # Windows 停止脚本
```



## 📝 License

MIT
