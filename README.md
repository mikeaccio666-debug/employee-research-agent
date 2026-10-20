# Portrait（暂定代号）

一个会"采访"人的 AI 求职平台：学生和 agent 聊天，得到一页独一无二、每句话都有出处的个人画像（`{domain}/@handle`）；startup 用自然语言描述想要的人，agent 找到、解释并帮双方通过聊天和 coffee chat 连接起来。另有可匿名发布的动态广场，以及 startup 定期举办的线上宣讲与论坛。

agent 随时能聊，陪求职者持续更新简历、规划成长。找到工作的人可以解锁"在职者"身份，为后来的人提供 coffee chat 和内推；评价机制保证内推网络里的信息真实可信。

> 当前阶段：前端已按 Claude Design 画布「页面 v2」（设计系统 v0.2，身高线 × 晨光）实现，全部是前端与虚构示例数据；agent 后端、数据库和登录还没有接。

## 运行

需要 Node 22 和 pnpm 10。

```bash
pnpm install
pnpm dev        # http://localhost:3000，打开 /design 看所有页面的目录
pnpm build
pnpm typecheck
```

| 目录 | 内容 |
|---|---|
| `apps/web` | Next.js 16（App Router）+ React 19 + Tailwind CSS 4。约定见 [apps/web/README.md](apps/web/README.md)。 |
| `packages/ui` | 设计系统 `@portrait/ui`：画布共享样式表的原样移植（`src/styles/system.css`）和对应的 React 组件。 |

部署到 Vercel：新建项目时把 Root Directory 设为 `apps/web`，框架选 Next.js；Vercel 会识别 pnpm workspace 并安装 `packages/ui`。

## 文档

| 文档 | 内容 | 主要读者 |
|---|---|---|
| [docs/PRD.md](docs/PRD.md) | 产品需求：假设、用户、原则、功能需求（P0/P1/P2）、流程、指标、里程碑、风险 | 全员 |
| [docs/agent-design.md](docs/agent-design.md) | Agent 如何理解一个求职者：画像模型、证据机制、访谈策略、独特性合成、Page Spec、匿名化、企业端 agent、匹配引擎、求职陪伴、内推网络（核验、包装、评价）、评测 | 产品、AI 工程 |
| [docs/design-brief.md](docs/design-brief.md) | 交给 Claude Design 的设计简报（视觉方向、屏幕清单、组件、提示词）和 Impeccable 设计把关流程 | 设计、前端 |
| [docs/architecture.md](docs/architecture.md) | MVP 技术栈（Vercel + Supabase + Claude）、数据模型、接口协议、规模化演进路线、成本模型 | 工程 |

## 设计把关

仓库已安装 [Impeccable](https://impeccable.style) v4.7.0（`.claude/skills/impeccable/`）。用 Claude Code 打开仓库即可使用 `/impeccable` 的各个命令；用法见 `docs/design-brief.md` 第 13 节。

## 下一步

1. 评审 PRD 第 14 节的待决问题（界面语言、品牌名、startup 准入标准、定价等）；已确认的决定见第 16 节。
2. 接后端：按 `docs/architecture.md` 接 Supabase（登录、数据）和 Claude API（对话、画像生成），把 `apps/web/lib/data` 里的示例数据换成真实数据。
3. 并行搭建 agent 原型与评测集（见 `docs/agent-design.md` 第 12 节）。
4. 设计改动继续在 Claude Design 画布里做，再按 `apps/web/README.md` 的方法移植。
