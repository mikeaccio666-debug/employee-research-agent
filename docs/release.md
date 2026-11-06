# 发布与回退

一个改动从 PR 到生产的规则，以及出问题时怎么退回去。PR 模板（`.github/pull_request_template.md`）里的风险等级和回退方案都以这里为准。

## 一个改动怎么上线

1. 开 PR。每个 PR 自动跑 CI 的 `check`：类型检查、单元测试、生产构建（`.github/workflows/ci.yml`）。改到 agent 代码时，另外跑 agent 评测（`.github/workflows/agent-evals.yml`）。Vercel 给每个 PR 一个预览网址。
2. 按风险等级做完下表要求的检查。
3. Mike 合并。合并前都要先问 Mike；合并到默认分支就会自动部署生产。
4. 合并后看一眼生产：Vercel Logs 里的报错，`model_calls` 表里的错误和耗时。

## 风险等级

| 等级 | 包括 | 合并前要做到 |
|---|---|---|
| 低 | 文档、文案、测试，或者在关着的 flag 后面的改动 | `check` 通过 |
| 中 | 用户看得到的改动、新的 API 路由、agent 的提示词、工具或模型 | `check` 通过；在预览里实际走一遍；改到 agent 时附上评测前后对比 |
| 高 | 数据库迁移、登录或权限（RLS）、删除数据、涉及钱，或者改环境变量和密钥 | 以上全部；PR 里写清回退方案；迁移遵守下面的规则；挑 Mike 能盯着的时间合并 |

拿不准就往高里算。

## 出错时去哪看

- **Sentry**（填了 `NEXT_PUBLIC_SENTRY_DSN` 之后才工作）：服务器上没接住的错误、浏览器里把页面弄坏的错误，以及我们接住了但需要知道的错误（agent 回合失败、工具失败、连接的应用出错，都走 `lib/observability/report.ts` 的 `reportError`）。新问题会发邮件。只记录哪里坏了，不记录用户写的内容、上传的文件、cookie、网址参数和请求内容，设置在 `lib/observability/sentry-options.ts`。
- **错误页上的 Reference 号码**就是服务器日志和 Sentry 里的 digest。用户报问题时，请他们把这个号码发过来。
- **Vercel Logs**：每个请求的日志，按路径筛，比如 `/api/agent/chat`。
- **`model_calls` 表**：每次 AI 调用的模型、token、耗时和错误。

## 出问题怎么退回去

先止血，再找原因。按生效速度从快到慢：

1. **问题在 flag 后面：关掉 flag。** 几秒生效，不用部署。注意：现在的 `AGENT_PROVIDER`、`OPENAI_MODEL`、`AGENT_MODEL_SWITCHER` 是环境变量，不是 flag，改了要重新部署才生效。
2. **其他问题：Vercel Instant Rollback。** 在 Vercel 项目首页的生产部署上选 Instant Rollback，挑上一个好的部署。命令行是 `vercel rollback <部署网址或 ID>`，不带参数什么也不做。回滚会把环境变量也退回那次构建时的值。Hobby 套餐只能退到上一个生产部署。
3. **Revert 那个 PR**，让默认分支和线上一致。
4. **恢复自动上线。** 回滚后 Vercel 会停止把新部署自动绑到生产域名。修复合并后，点 Undo Rollback 或运行 `vercel promote <部署>`，否则之后的合并都不会上线。
5. **修数据**是最后手段，见下一节。

## 数据库迁移

Vercel 回滚和关 flag 都不会撤销数据库改动，所以每个迁移都要让上一个版本的代码还能正常跑。

- **先加后删。** 先发一个能兼容新结构、但还不用它的版本，再改表结构，最后发真正用新结构的版本。删列、改名放到之后的 PR，等没有代码再用旧结构时再做。
- **回滚别退太远。** 改完表结构后，Instant Rollback 不要退到早于“能兼容当前表结构”的那个部署。
- **已经进了生产的迁移不改文件，**写一个新的迁移向前修复。不要在生产库上跑 `supabase migration down` 或 `supabase db reset --remote`，它们会清空数据库再重建。
- **改列名要手写。** 自动生成的差异可能把改名写成“删列再加列”，会丢数据。
- 画像改坏了可以用 `portrait_versions` 退回，但每人只保留最近 50 个版本。
