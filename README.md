# Portrait（暂定代号）

一个会"采访"人的 AI 求职平台：学生和 agent 聊天，得到一页独一无二、每句话都有出处的个人画像（`{domain}/@handle`）；startup 用自然语言描述想要的人，agent 找到、解释并帮双方通过聊天和 coffee chat 连接起来。另有可匿名发布的动态广场，以及 startup 定期举办的线上宣讲与论坛。

> 当前阶段：产品定义。代码尚未开始。

## 文档

| 文档 | 内容 | 主要读者 |
|---|---|---|
| [docs/PRD.md](docs/PRD.md) | 产品需求：假设、用户、原则、功能需求（P0/P1/P2）、流程、指标、里程碑、风险 | 全员 |
| [docs/agent-design.md](docs/agent-design.md) | Agent 如何理解一个求职者：画像模型、证据机制、访谈策略、独特性合成、Page Spec、匿名化、企业端 agent、匹配引擎、评测 | 产品、AI 工程 |
| [docs/design-brief.md](docs/design-brief.md) | 交给 Claude Design 的设计简报（视觉方向、屏幕清单、组件、提示词）和 Impeccable 设计把关流程 | 设计、前端 |
| [docs/architecture.md](docs/architecture.md) | MVP 技术栈（Vercel + Supabase + Claude）、数据模型、接口协议、规模化演进路线、成本模型 | 工程 |

## 下一步

1. 评审 PRD 第 14 节的待决问题（界面语言、品牌名、startup 准入标准、定价等）；已确认的决定见第 16 节。
2. 把 `docs/design-brief.md` 交给 Claude Design，先做设计系统与风格样张，再按顺序出 P0 页面。
3. 并行搭建 agent 原型与评测集（见 `docs/agent-design.md` 第 10 节）。
4. 按 `docs/architecture.md` 第 5 节初始化单仓，并安装 Impeccable（`npx impeccable install`）。
