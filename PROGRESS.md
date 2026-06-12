# PROGRESS.md

> 每次会话结束前必须更新。新会话开始时首先读取此文件。

## 当前状态

- 分支：codex/deploy-signal-arena
- 最新 commit：见 `git log -1 --oneline`
- 当前里程碑：v1.3 `Word to Markdown`（已完成实现、审计与归档，待开启下一里程碑）
- `make check`：通过（2026-05-04，`/tools/style-prompt` 原始 demo 预览尺寸改为方形后）
- `pnpm test:ai-daily` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-17，将 AI Daily 自动同步时间从北京时间 11:00 改为 12:00；workflow cron 为 `0 4 * * *`）
- `make check` / `pnpm run deploy` 内部 build：通过（2026-05-10，v1.3 Phase 10 完成并归档后；构建仍出现既有 `mays-game-api.mays.workers.dev` 超时警告但最终成功）
- `pnpm test:portal` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，修复首页 `SIGNAL ARENA` 入口恢复为普通可点击 portal 卡片）
- `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，新增 Signal Arena 行情终端与决策追踪设计文档）
- `pnpm test:signal-arena` / `pnpm test:signal-arena-worker` / `pnpm typecheck` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，完成 Signal Arena 行情终端、收益曲线、决策弹窗、D1 快照与增强 prompt）
- `pnpm test:signal-arena` / `pnpm test:signal-arena-worker` / `pnpm typecheck` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，完成 Signal Arena 运行状态、公开 operations、日志筛选与图表文案优化；浏览器已验证本地 `/signal-arena` 与 `/signal-arena/logs`）
- `node --test scripts/signal-arena-history.test.mjs` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，完成 Signal Arena WorkBuddy 历史回填本地融合；本地 `/signal-arena` 显示 97 个曲线点、169 条公开日志、38 天覆盖，未部署线上）
- `pnpm test:signal-arena` / `pnpm test:portal` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm deploy`：通过（2026-05-23，将 Signal Arena 历史回填与公开日志来源筛选部署到 Cloudflare；前端版本 `87fc4ccb-84f9-46b1-af50-b134b0f9384e`，静态资源新增 `/data/signal-arena/history.json`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm exec wrangler deploy --config wrangler.toml`：通过（2026-05-25，修复 Signal Arena Runner 在交易时段解析分组 `top-movers` 返回值失败的问题；Worker 版本 `5af8c926-fdf2-4060-a25b-319e640849e1`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm exec wrangler deploy --config wrangler.toml`：通过（2026-05-25，补强 Signal Arena 上游列表兼容兜底；Worker 版本 `06baecb4-3d8d-4786-8b1c-2ba61dc0ab9d`，线上 health 200，admin dry-run 因北京时间 20:22 收盘写入 `manual / skipped` 且 `error_message=null`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm exec wrangler deploy --config wrangler.toml`：通过（2026-05-25，对齐 Signal Arena Cron 与 A 股连续竞价安全窗口，并补充上游 `market_status=closed` 兜底；Worker 版本 `7ed98ae2-4e52-4724-b69b-05ae51fd94dc`，触发器改为北京时间 09:35-11:20 / 13:05-14:50，线上 health 200，admin dry-run 因北京时间 20:37 收盘写入 `manual / skipped` 且 `error_message=null`）
- `pnpm test:portal` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm deploy`：通过（2026-05-26，修复 Signal Arena 缺少返回首页入口，并恢复首页 cover/header 为完整首屏；前端版本 `c66093b9-8b18-491c-8ef3-855ee4b7bd7d`，线上 `/signal-arena` 已返回 200 且包含 `返回首页`，生产 CSS 已包含 `min-height:100svh`）
- `pnpm test:portal` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm deploy`：通过（2026-05-26，优化首页点击 `SIGNAL ARENA` 后的响应感；入口启用 Next prefetch，`/signal-arena/loading.tsx` 新增即时同步态，前端版本 `13f2e145-a24b-4eb6-9765-afd8f51023e5`，部署资产包含 `app/signal-arena/loading-c021b527fc0abf07.js`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-26，纠正 AI 主动 HOLD/观望被公开展示为 `blocked` 和错误提示 100 股限制的问题；旧 D1 HOLD 记录读取时兼容归一为 `held`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm test:portal` / `pnpm test:ai-daily` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-27，新增 Signal Arena 前置信号生成层；Worker Runner 将 `top-movers` / 持仓 / 近期交易加工为 `decisionTrace.signalContext` 并交给 AI prompt，前端决策弹窗展示“前置信号”；旧日志没有该字段会显示为空数组）
- 部署状态：Signal Arena D1 trace/snapshot migration 已执行，`mays-signal-arena-api` 当前版本 `00ab383b-09ae-4e46-aad4-5a667e649cf5`，公开 API 域名为 `https://signal-arena-api.maysssss.cn`；2026-05-27 前端已部署到版本 `9864fb5a-4ee1-46bb-8ec3-965ebd9c4449`
- 2026-05-27 每日生产巡检：`/`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 均返回 200；`/ai-daily` 页面可访问，但公开索引最新日期仍为 `2026-05-26`，较当天落后一日，需要继续观察当日 GitHub Actions 同步是否补上；未发现公开页面泄漏真实密钥，`/signal-arena/logs` 也未出现 4xx/5xx，只是 HTML 中包含渲染时的 `404` 片段和 loading skeleton 文案
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-27，修复 Signal Arena 卖出可卖数量 / T+1 风控误导；Runner 风控侧 `availableShares` 与 prompt 侧 fallback 对齐，卖出风控原因拆分，prompt 明确 `sell <= availableShares`，日志页去重风控展示，并将旧版合并文案兼容为新版说明；Worker 版本 `54e86075-b62d-427e-bcb5-8016f0e8e9b6`，前端版本 `fe38af8e-edcc-45fd-9a62-04ebe13d601c`，线上 API 抽查旧合并文案 `0` 条、兼容说明 `4` 条）
- 2026-05-28 每日生产巡检：本地 Node/browser 环境无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`（`TypeError: fetch failed`，`curl: Could not resolve host`，in-app browser 无活动窗格），因此线上 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 的实时 200/文案/泄漏检查未完成；本地补充检查显示 `public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-05-28 19:59 CST，工作区快照明显陈旧），源码扫描仅命中预期 env var 名称、脚本日志与测试假密钥，未发现真实密钥字面量。
- `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm deploy`：通过（2026-05-28，将 Signal Arena 收益曲线横轴从真实时间轴改为等距分类轴，点位仍按时间排序与范围过滤，tooltip 和摘要继续显示真实时间；前端版本 `016a8daa-2827-4dfc-a650-0de8f91d86ba`，线上 `/signal-arena` 返回 200，新 chunk `/app/signal-arena/page-1a0018468e03a32c.js` 包含 `category` 且不再包含 `type:"time"`）
- `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm deploy`：通过（2026-05-28，将 Signal Arena 收益曲线范围控制从 `7D / 30D / ALL` 调整为 `近 30 点 / 近 90 点 / 全部`，筛选逻辑改为最近 N 个快照；前端版本 `05feb8a8-abd9-43dd-8157-510953a79695`，线上 `/signal-arena` 返回 200，新 chunk `/app/signal-arena/page-293e38b14ccfefef.js` 包含 `近 30 点` / `近 90 点`，不再包含 `7D` / `30D`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-28，排查 `Runner 执行失败。` 最新记录，根因是 AI provider 返回 `524` 网关超时，不是交易流程或风控错误；新增 `publicRunnerErrorFor()` 将 524 公开归一为 `AI 服务响应超时，本轮未生成交易决策。`，后续 Runner 落库写入准确摘要，旧 D1 记录通过 public API 展示层兼容归一；Worker 版本 `31ea530e-b685-494c-b337-2c9688fb1361`，前端版本 `778c9f70-44a0-49b6-a330-d38a908269d0`，线上 `/api/public/all` 最新日志已显示新文案）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-06-01，排查线上再次出现 `Runner 执行失败。`；根因是新失败类型未被公开归一，包括 `AI provider returned 502`、`Signal Arena request failed: 504`、`Responses API returned no text output`。现已扩展 `publicRunnerErrorFor()` 文案，并让严格 AI 模型遇到短暂 5xx 或空文本时先 fallback 到轻量模型；Worker 部署版本 `9f6c7071-1bab-4f8d-86a3-0bbb2d860ad4`，线上 `/api/public/all` 最新 failed 已显示 `AI 未返回有效决策内容，本轮未生成交易决策。`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-06-12，将 Signal Arena 主决策模型从 `gpt-5.5 / xhigh` 改为 `gpt-5.4 / high`，轻量兜底保持 `gpt-5.4 / low`；fallback 回归测试改为校验 `reasoning.effort`，Worker 部署输出确认新环境变量，部署版本 `df0e9267-e17e-488b-8de6-12402b58866b`）
- `pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm test:portal` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-06-12，将 `/signal-arena` 改造为 Quant Lab；Worker Runner 改用确定性 `Q-Alpha v1` 多因子策略和程序风控，不再让 AI 进入每日下单闭环；新增 market-data 缓存、指标计算、策略 trace、`quant-v1` scope 过滤、D1 migration、首页 `QUANT LAB` 入口、策略日志/弹窗/持仓策略分与入场理由展示；公开页面不再合并旧本地 AI 历史。补充审计后，migration 会把旧行默认保留为 `legacy-ai`，Rank 页展示距前一名/前 10/榜首差距。构建仍出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警但最终成功，未部署。）
- 2026-06-12：新增 Signal Arena 量化实验室路线图 `docs/superpowers/plans/2026-06-12-signal-arena-quant-lab-roadmap.md`；规划新账号从 0 跑确定性量化策略，当前公开体验移除旧 AI 账号历史/对照，采用 `Q-Alpha v1` 多因子趋势动量策略、页面改造、回测版本化、每周 AI 复盘，以及 TradingAgents 作为研究/复盘层参考而非第一版交易闭环依赖。
- 2026-06-12：补充 Signal Arena 量化路线图的策略版本时间表；明确 `Q-Alpha v1-v4` 的最早/稳妥时间、进入下一版的样本量与证据门槛、每版范围边界、回滚/冻结规则，避免把“代码写完”误认为“策略有效”。
- 2026-06-12：补充 Quant Lab 用户参与与调参机制；路线图新增“用户参与与调参机制”，并新增用户向使用指南草稿 `docs/signal-arena-quant-lab-user-guide.md`，覆盖每日查看、每周复盘、参数含义、调参触发条件、候选版本流程和向 Codex 发起调参实验的模板。
- 2026-06-12：扩展 Quant Lab 使用指南的参数说明；`docs/signal-arena-quant-lab-user-guide.md` 第 4 节补齐买入/卖出阈值、趋势/动量/突破/成交量/波动/追高、仓位/现金/持仓数、止损和冷却期等参数的作用、调高/调低影响、何时调整、常见误区和参数联动关系。
- 2026-06-12：整理 Signal Arena / AI Daily 未提交工作区；按前端历史回填、Worker 运行链路、AI Daily 数据与 Quant Lab 文档分组，提交前完成真实密钥字面量扫描，并将旧 AI Daily 计划文档中的真实 key 扫描样本替换为泛化模式。
- 2026-06-04 Signal Arena 信号层巡检：当前执行环境仍无法解析 `signal-arena-api.maysssss.cn` / `maysssss.cn`，浏览器插件导航生产 API 超时重置，Wrangler remote D1 也因 `dash.cloudflare.com` DNS/auth fetch 失败无法查询，因此未能确认最近 A 股交易时段线上 run 的 `decisionTrace.signalContext` 是否非空，也未能确认线上 `/signal-arena/logs` 最新渲染内容。代码路径复核显示 Runner 仍会生成 `signals` 并写入 `decisionTrace.signalContext`，public-data 与前端 sanitizer 会保留结构化信号，决策弹窗会展示“前置信号”；`pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` 均通过。未改业务代码，未部署。
- 2026-06-05 Signal Arena 信号层巡检：当前执行环境仍无法解析 `signal-arena-api.maysssss.cn` / `maysssss.cn` / `api.cloudflare.com` / `dash.cloudflare.com`，`curl` 返回 `Could not resolve host`，Python `getaddrinfo` 返回 `nodename nor servname provided`，因此未能读取线上 `/api/public/all` 或 `/signal-arena/logs`，不能确认最近 A 股交易时段线上 run 的 `decisionTrace.signalContext` 是否非空，也不能确认日志页最新渲染内容或 5xx 状态。代码路径复核显示 Runner 生成 `signals`、传入 AI prompt 并写入 `decisionTrace.signalContext`，public-data 和前端 sanitizer 保留结构化信号，弹窗展示“前置信号”；`pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` 均通过，build 仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警。未改业务代码，未部署。
- 2026-06-06 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn` / `mays-game-api.mays.workers.dev`，`curl` 对 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt`、`/data/ai-daily/index.json` 和 Signal Arena public API 均返回 `Could not resolve host`，Python `socket.getaddrinfo` 返回 `nodename nor servname provided`，系统 web 搜索/open 也未返回可用生产页面内容。因此本轮未能完成线上实时 200/关键文案/动态数据/泄漏检查，不能据此判断生产故障。本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，build 仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成目标路由产物；公开产物包含目标页面关键文案，密钥形态扫描未发现真实密钥字面量。本地无部署变量构建仍包含 AI Daily `频道尚未校准` 文案，属于 `NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH` 未注入的本地构建表现；线上配置和日报新鲜度仍需网络恢复后复核。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-06-06 13:27 CST，工作区快照陈旧）。未改业务代码，未部署。
- 2026-06-07 每日生产巡检：线上 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 均返回 200，关键文案命中，未发现公开密钥形态或 AI Daily 配置缺失提示。`/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`，但上游 `hex2077.dev/zh-cn/docs` 从 2026-05-27 至 2026-06-07 对应日报 URL 全部 404；GitHub Actions `Update AI Daily` 仍每日成功运行并记录 `source unavailable: 404`，因此当前陈旧原因是上游停更/迁移而非本站同步脚本失败。Signal Arena public API 为 `sourceStatus=live`，`updatedAt=2026-06-07T01:16:27.658Z`，但 D1 显示 2026-06-04 一条失败 run 的原始错误为 SSE `data:` 流被当作 JSON 解析；已修复 Worker AI provider 兼容 `text/event-stream`，并将旧错误公开归一为 `AI 返回格式暂不可用，本轮未生成交易决策。`。D1 日期分布显示最近 run 停在 2026-06-04 UTC、没有 2026-06-05 UTC run；本次部署已重新发布 cron triggers，需下个 A 股交易窗口继续确认调度恢复。`pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过；已部署 Worker 版本 `c9432a5b-64db-400b-b8dd-521df59fea6b`，线上 public API 已确认不再包含 `Runner 执行失败。`，未部署前端。
- 2026-05-29 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 返回 `Could not resolve host`，in-app browser 访问生产首页超时，因此线上 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 的实时 200/文案/泄漏检查未完成；本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警；本地 `public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-05-29 09:15 CST，工作区快照陈旧），源码/构建产物扫描未发现真实密钥字面量或公开配置缺失提示。
- 2026-05-29 Signal Arena 信号层巡检：当前执行环境仍无法完成线上读取，`curl` 无法解析 `signal-arena-api.maysssss.cn` / `maysssss.cn`，Wrangler remote D1 无法解析 `api.cloudflare.com`，in-app browser 按策略拒绝打开 `maysssss.cn`，系统 web 读取 `https://signal-arena-api.maysssss.cn/api/public/all` 超时；因此未能确认最近 A 股交易时段线上 run 的 `decisionTrace.signalContext` 是否非空，也未能确认线上 `/signal-arena/logs` 最新渲染内容。代码路径复核显示 Runner 会生成 `signals` 并写入 `decisionTrace.signalContext`，public-data 与前端 sanitizer 会保留结构化信号；`pnpm --dir workers/signal-arena-api test` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` 均通过，未改业务代码，未部署。
- 2026-05-30 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 返回 `Could not resolve host`，系统 web 搜索未返回可用页面内容，因此线上 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 的实时 200/文案/泄漏检查未完成；本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功。本地构建产物包含首页、AI Daily、Game、Photos、Style Prompt 的关键文案，静态 HTML 未发现真实密钥形态或公开配置缺失提示；动态 `/signal-arena` 本地 `next start` 被沙箱 `listen EPERM` 阻止，未能通过 localhost 补测。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-05-30 16:35 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。
- 2026-05-31 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 返回 `Could not resolve host`，`dig` / `nslookup` 受沙箱 `bind EPERM` 限制，系统 web 搜索未返回可用页面内容，因此线上 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 的实时 200/关键文案/泄漏检查未完成，不能据此判断生产故障；本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成目标路由产物。源码/构建产物扫描仅命中预期环境变量名与测试假密钥，未发现真实密钥字面量；`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-05-31 09:17 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。
- 2026-06-01 Signal Arena 信号层巡检：当前执行环境仍无法完成线上读取，`curl` 无法解析 `signal-arena-api.maysssss.cn` / `maysssss.cn`，DoH 直连 `dns.google` / `cloudflare-dns.com` 被阻断，in-app browser 无可用 `iab` 窗格；系统 web 通道也未返回可解析的 `/api/public/all` JSON 或 `/signal-arena/logs` 页面内容。因此本轮不能确认最近 A 股交易时段线上 `cron/manual` run 的 `decisionTrace.signalContext` 是否非空，也不能确认线上日志页最新渲染内容或 5xx 状态。代码路径复核显示 Runner 会生成 `signals` 并写入 `decisionTrace.signalContext`，public-data 会兼容 camel/snake case 并公开输出，前端 sanitizer 与决策弹窗会保留并展示结构化信号；`pnpm typecheck` / `pnpm lint` / `pnpm --dir workers/signal-arena-api test` / `pnpm test:signal-arena` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm build` 均通过，未改业务代码，未部署。
- 2026-06-01 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 对 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt`、`/data/ai-daily/index.json` 和 Signal Arena public API 均返回 `Could not resolve host`；系统 web 通道未返回可用页面内容，Browser 插件也无可用 `iab` 实例。因此本轮未能完成线上实时 200/关键文案/动态数据/泄漏检查，不能据此判断生产故障。本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成目标路由产物；构建产物关键文案覆盖首页、AI Daily、Game、Photos、Style Prompt 与 Signal Arena 动态页面代码，公开产物扫描未发现真实密钥形态或公开配置缺失提示。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-06-01 21:34 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。
- 2026-06-02 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 对 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt`、`/data/ai-daily/index.json` 和 Signal Arena public API 均返回 `Could not resolve host`，系统 web 通道也未返回可用页面内容。因此本轮未能完成线上实时 200/关键文案/动态数据/泄漏检查，不能据此判断生产故障。本地补充验证 `pnpm test:portal` / `pnpm test:ai-daily` / `pnpm test:signal-arena` / `pnpm --dir workers/signal-arena-api test` / `pnpm typecheck` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成目标路由产物。公开产物扫描未发现真实密钥形态；本地无环境变量构建会显示 AI Daily `频道尚未校准` 提示，部署 workflow 已配置注入 `NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH`，但线上是否正常仍需网络恢复后复核。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-06-02 09:17 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。
- 2026-06-02 Signal Arena 信号层巡检：当前执行环境仍无法完成线上读取，Node `fetch` / `curl` 无法解析 `signal-arena-api.maysssss.cn` / `maysssss.cn`，Wrangler remote D1 查询也因 `dash.cloudflare.com` DNS/auth fetch 失败而未能读取远端 runs。因此本轮不能确认最近 A 股交易时段线上 `cron/manual` run 的 `decisionTrace.signalContext` 是否非空，也不能确认线上 `/signal-arena/logs` 最新日志或 5xx 状态。代码路径复核显示 Runner 生成 `signals`、交给 AI prompt，并写入 `decisionTrace.signalContext`；public-data 兼容 `signalContext` / `signal_context`，前端 sanitizer 与弹窗保留结构化信号；`pnpm --dir workers/signal-arena-api test` / `pnpm test:signal-arena` / `pnpm typecheck` / `pnpm lint` / `pnpm build` 均通过，未改业务代码，未部署。
- 2026-06-04 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 对 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt`、`/data/ai-daily/index.json` 和 Signal Arena public API 均返回 `Could not resolve host`，Python `socket.getaddrinfo` 对主域名、Signal Arena API 与 game-api Worker 也返回 `nodename nor servname provided`；系统 web 通道未返回可用站点内容。因此本轮未能完成线上实时 200/关键文案/动态数据/泄漏检查，不能据此判断生产故障。本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成目标路由产物；公开产物/源码扫描未发现真实密钥形态。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-06-04 09:15 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。
- 2026-06-05 每日生产巡检：当前执行环境仍无法解析 `maysssss.cn` / `signal-arena-api.maysssss.cn`，`curl` 对 `/`、`/ai-daily`、`/signal-arena` 和 Signal Arena public API 返回 `Could not resolve host`，Python `socket.getaddrinfo` 对主域名、Signal Arena API 与 game-api Worker 返回 `nodename nor servname provided`；系统 web 通道未返回可用站点内容。因此本轮未能完成线上实时 200/关键文案/动态数据/泄漏检查，不能据此判断生产故障。本地补充验证 `pnpm typecheck` / `pnpm lint` / `pnpm build` 通过，构建仅出现既有 `mays-game-api.mays.workers.dev` DNS fallback 告警且成功生成 `/`、`/ai-daily`、`/signal-arena`、`/signal-arena/logs`、`/game`、`/photos`、`/tools/style-prompt` 等目标路由产物；源码/公开产物扫描只命中预期环境变量名、测试假密钥和本地无环境变量构建下的 AI Daily 缺配置提示，未发现真实密钥形态。`public/data/ai-daily/index.json` 仍为 `latestDate=2026-05-26`（当前 2026-06-05 11:32 CST，工作区快照陈旧），需下次能访问生产后继续确认线上日报是否已更新。

## 已完成

- [x] Vue 3 monorepo → Next.js 15 单体应用重构
- [x] Harness 基建：CLAUDE.md / AGENTS.md（同步）、Makefile（make check）、HARNESS-TODO.md
- [x] HARNESS-TODO P0（指令子系统）、P1（反馈子系统）已完成
- [x] 2026-05-01：生成 `.planning/codebase/` 代码库地图（STACK / INTEGRATIONS / ARCHITECTURE / STRUCTURE / CONVENTIONS / TESTING / CONCERNS）
- [x] 2026-05-01：完成 `$gsd-new-project` 需求构思，初始化 `MAYS UNIVERSE` Portal 规划文档（PROJECT / REQUIREMENTS / ROADMAP / STATE / config）
- [x] 2026-05-01：完成 `$gsd-autonomous --interactive`，实现 `MAYS UNIVERSE` 美漫封面入口页并完成 Phase 1-3 验证
- [x] 2026-05-01：修复 in-app browser 注入 `data-cursorstyle` 导致的根节点 hydration warning
- [x] 2026-05-01：修复游戏页数据陈旧问题，服务端优先读取 game-api Worker，失败时回退静态快照
- [x] 2026-05-02：完成 v1.1 `Signal Lab` 里程碑规划初始化，确定 `/tools` 工具箱入口、`QR Studio` 首个工具，以及主页 `Tools` 分格入口范围
- [x] 2026-05-03：完成 v1.1 `Signal Lab` 实现，新增 `/tools` hub、`/tools/qr` 二维码生成器，并将主页一个 sealed panel 升级为 `Tools` 入口
- [x] 2026-05-03：主页 `Game` / `Photos` 面板文案改为站内路由形式，和当前实际跳转保持一致
- [x] 2026-05-03：退役 `game.maysssss.cn` / `photo.maysssss.cn` 访问，只保留主域名路由入口
- [x] 2026-05-03：Cloudflare 控制台已移除 legacy `game.maysssss.cn` / `photo.maysssss.cn` Worker 绑定；`game` 的 DNS CNAME 删除也已提交，剩余结果等待 DNS/证书传播
- [x] 2026-05-03：新增 `/tools/style-prompt`，将 UI-Prompt styles 数据整理为本地静态 JSON，支持搜索、分类筛选、模板选择和中英文 prompt 复制
- [x] 2026-05-03：修复 `/tools/style-prompt` 搜索/分类筛选后右侧详情仍停留在旧 family 的联动问题，并补齐 generated 目录中未进入 registry 的 style 数据
- [x] 2026-05-03：为 `/tools/style-prompt` 增加每个 style family 的轻量 CSS 示意图，避免直接执行上游 compiled JSX 预览代码
- [x] 2026-05-04：将 `/tools/style-prompt` 的示意图替换为 UI-Prompt 上游 `demo.html/demo.css` iframe 预览，保留 sandbox 与 CSP 安全边界
- [x] 2026-05-04：修正 `/tools/style-prompt` 原始 demo 预览比例，family 卡片与详情预览均改为方形视口，避免被横向裁切成条形图
- [x] 2026-05-05：对照 UI-Prompt 原站 grid card 方案，优化 `/tools/style-prompt` catalog 为更宽的卡片画廊，放大 demo preview 并移除受限内部滚动
- [x] 2026-05-05：修复 `/tools/style-prompt` family 卡片 hover 时边框/预览高光突兀闪亮的问题，改为柔和 hover 状态
- [x] 2026-05-05：将 `/tools/style-prompt` family 卡片点击交互改为打开 prompt 弹框，弹框内支持语言/类型/模板切换与复制
- [x] 2026-05-05：修复 `/tools/style-prompt` family 卡片模板数徽标压住上游 demo 自带角标的问题，并确认 headless Chrome 可正常渲染
- [x] 2026-05-05：修复 `/tools/style-prompt` catalog 大玻璃高光与全页氛围光穿透半透明卡片，形成竖向白线/竖带的问题，并降低卡片边框亮度
- [x] 2026-05-05：全量核查 `/tools/style-prompt` 数据，按 UI-Prompt 原站公开 styles index 收敛为 73 families / 130 templates，新增审计脚本并为 Tailwind-only demo 片段补充 iframe 运行时兜底
- [x] 2026-05-05：将 `/tools/style-prompt` family / detail 预览改为静态 PNG 优先、`iframe srcdoc` 兜底，并生成 73 张预览图，解决页面内部分 style demo 空白而独立渲染正常的问题
- [x] 2026-05-05：将 `/tools/style-prompt` 主页面收敛为单一 card gallery，移除右侧详情面板，改为卡片点击后仅在弹框内查看与复制 prompt
- [x] 2026-05-05：修复 `/tools/style-prompt` 弹框内模板选择导致 `0 chars` 空白的问题；当模板无独立 prompt 时回退到 family base prompt，并将模板区改为自适应两列，解决窄视口文字挤出
- [x] 2026-05-05：将 `/tools/style-prompt` 视觉层重构为更克制的极简主义 + 瑞士设计混合工具页，去掉高存在感彩膜氛围；保留现有 gallery + modal 结构、筛选/复制逻辑不变，并通过 headless Chrome 截图确认卡片已重新进入首屏
- [x] 2026-05-05：将 `/tools/style-prompt` 的框架层文案改为中文优先，覆盖标题、导航、筛选、空态、弹框按钮、复制反馈与异常兜底提示，保留中英文 prompt 数据本身不变
- [x] 2026-05-05：进一步收敛 `/tools/style-prompt` 首屏 hero 文案，改为更直接的工具页表达，避免中文口号感过强、读起来别扭
- [x] 2026-05-05：修正 `/tools/style-prompt` 首屏 hero 在单列视口下的标题布局；移除中等宽度断点下对标题的收窄限制，解决中文标题被硬挤换行、右侧留白过大的问题
- [x] 2026-05-05：为 `/tools/style-prompt` 的少数留白过大的 preview 卡片增加定向缩放能力，先修正 `Fluent Design 2.0` 与同类居中小组件预览，避免示意图显得过小
- [x] 2026-05-05：重构 `/tools/style-prompt` 弹框信息层级，改为“主示意图 + 场景预设 + 提示词内容”；明确当前仅有 family 级预览，避免把 `Fluent 2 生产力应用 / 设定页面` 误解为独立示意图，并通过 headless Chrome 实际打开 `Fluent Design 2.0` 弹框验证新结构
- [x] 2026-05-05：重新审计 `/tools/style-prompt` 的预览资源有效性，确认 `visual-organic / Modern Organic` 的 PNG 虽存在但为纯空白图；列表层过滤这类无效预览 family，并通过 headless Chrome 确认页面从 73 收敛为 72 个可用卡片
- [x] 2026-05-05：收紧 `/tools/style-prompt` 的场景预设规则，只显示会切换到不同提示词内容的预设；与 family base prompt 或彼此重复的模板不再展示，并确认 `Ink Wash（水墨）` 这类重复场景已回退为仅显示基础提示词
- [x] 2026-05-05：扩展 `scripts/audit-ui-prompt-data.mjs` 为全量数据审计脚本，新增对预生成 preview PNG 空白图、模板 prompt 签名去重、以及“全部模板回退到基础 prompt”的检查；本轮全量审计确认数据为 73 families / 130 raw templates / 74 个真实不同的场景预设，重复场景 56 个，纯空白 preview 仅 `visual-organic`
- [x] 2026-05-05：将 `/tools/style-prompt` 的场景预设去重升级为“按当前提示词类型分别判断”；`风格提示词` 与 `自定义提示词` 各自独立计算可见场景数量，避免 `平面设计系统` 这类仅在 custom prompt 有差异、却在 style prompt 下看似有两个场景的误导
- [x] 2026-05-06：补齐 `.planning` 中缺失的 `v1.2 Style Prompt Index` 里程碑/Phase 7 文档，新增 07 计划、总结、验证与 UAT 会话
- [x] 2026-05-06：完成 Phase 7 手工 UAT，`/tools/style-prompt` 的入口、筛选、弹框预览、模板回退与复制动作共 5 项检查全部通过
- [x] 2026-05-06：完成 `$gsd-secure-phase 7`，为 `Style Prompt Index` 补建 `07-SECURITY.md`；确认本地静态数据渲染、sandbox iframe fallback 与外链边界已有对应缓解/接受风险记录，`threats_open: 0`
- [x] 2026-05-06：完成 `$gsd-audit-milestone` 前置审计并生成 `.planning/v1.2-MILESTONE-AUDIT.md`；确认里程碑功能链路本身可用，但归档前仍有 git 与验证证据缺口
- [x] 2026-05-10：提交 `Style Prompt Index` 实现文件，并补齐 Phase 4/5 验证文档与 Phase 7 UAT 状态；`.planning/v1.2-MILESTONE-AUDIT.md` 已更新为 `passed`
- [x] 2026-05-10：执行 `$gsd-complete-milestone`，归档 v1.2 roadmap / requirements / audit，并更新 `MILESTONES.md`、`ROADMAP.md`、`PROJECT.md`、`STATE.md`
- [x] 2026-05-10：启动 v1.3 `Word to Markdown`，完成 research 与 requirements 定义；roadmap 拆为 Phase 8-10
- [x] 2026-05-10：完成 v1.3 Phase 8 `Hidden Converter Foundation`，新增隐藏 `/tools/word-to-markdown` 路由、文件选择/拖拽、`.docx` 校验和本地处理说明
- [x] 2026-05-10：完成 v1.3 Phase 9 `Markdown Conversion Core`，新增浏览器本地 `.docx` 转 Markdown、结果查看、复制、`.md` 下载、状态与 warning 展示
- [x] 2026-05-10：完成 v1.3 Phase 10 `Image Assets And Verification`，新增内嵌图片提取、`./assets/image-N.ext` Markdown 路径、ZIP 导出和最终验证
- [x] 2026-05-10：完成 v1.3 milestone audit，结果 `passed`，并归档 v1.3 ROADMAP / REQUIREMENTS / AUDIT
- [x] 2026-05-10：归档 v1.3 Phase 8-10 目录到 `.planning/milestones/v1.3-phases/`，创建 `v1.3` tag，并部署当前站点版本到 Cloudflare
- [x] 2026-05-10：将 `Word to Markdown` 公开加入 `/tools` 工具箱入口，并重新部署到 Cloudflare
- [x] 2026-05-10：修正 `/tools/word-to-markdown` 公开页文案与窄屏标题布局，移除隐藏验证页和 Privacy Boundary 残留说明，并重新部署到 Cloudflare
- [x] 2026-05-10：将 `/tools/word-to-markdown` 改为选择 `.docx` 后自动转换，移除手动“开始本地转换”按钮，并重新部署到 Cloudflare
- [x] 2026-05-10：按 `superpowers:brainstorming` 完成 `AI Daily` 宇宙子页面设计文档，范围为首页入口、密码保护、每日 9:30 GitHub Actions 抓取、智谱 Coding Plan 总结与镜像 fallback
- [x] 2026-05-10：按 `superpowers:writing-plans` / `executing-plans` 完成 `AI Daily` 实现计划与首版功能：新增 `/ai-daily` 卡片索引、`/ai-daily/[date]` 详情页、客户端密码门禁、静态 JSON 数据、每日 09:30 GitHub Actions 更新脚本、智谱 Coding Plan 默认端点与镜像 fallback，并将首页 `CLASSIFIED` 面板升级为 `AI DAILY`
- [x] 2026-05-10：修复首页 issues：根布局补充 `data-scroll-behavior="smooth"` 消除 Next 路由切换告警；收紧小屏 portal 面板宽度、边框、阴影和 `OPEN` 按钮位置，避免入口卡片在窄视口贴边/裁切；新增 `pnpm test:portal` 回归测试
- [x] 2026-05-10：撤销误改 `/tools/style-prompt` 的包豪斯视觉提交；将包豪斯视觉范围收束到 `/ai-daily` 与 `/ai-daily/[date]`，新增 AI Daily 视觉回归测试覆盖三原色、硬边几何与旧暗色信号风格移除
- [x] 2026-05-10：使用临时 `ZHIPU_API_KEY` 环境变量重新生成 `2026-05-10` AI Daily 数据，页面模式从 `mirror_fallback` 切换为 `ai_summary`，未将 API key 写入仓库
- [x] 2026-05-10：执行 `pnpm run deploy` 发布 AI Daily 包豪斯视觉与智谱 AI 总结数据到 Cloudflare，版本 `2cf24188-cc7e-4cec-8a40-28eae726cda8`
- [x] 2026-05-10：同步 AI Daily 最近 30 天数据（2026-04-11 至 2026-05-10），归档页共 30 张卡片；29 天为 `ai_summary`，`2026-04-19` 因智谱接口返回 400 保留 `mirror_fallback`
- [x] 2026-05-11：修复线上 AI Daily 门禁未校准问题；根因是 Cloudflare 部署构建未注入 `NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH`，已用构建期环境变量重新部署并验证线上 `passwordHash` 非空
- [x] 2026-05-11：恢复首页待开发区域 sealed panel；根因是新增 `AI DAILY` 首页入口时将原 `CLASSIFIED / 未完待续` 卡片直接替换，现已在保留 AI Daily 入口的同时重新渲染未来子站占位，并补充 `pnpm test:portal` 回归断言
- [x] 2026-05-11：将 AI Daily GitHub Actions 自动同步时间从北京时间 09:30 调整为 11:00；workflow cron 从 `30 1 * * *` 改为 `0 3 * * *`，并补充 `pnpm test:ai-daily` 断言锁定 UTC 换算
- [x] 2026-05-14：修复 AI Daily 未自动更新问题；根因是 AI Daily workflow 和相关代码只存在于本地 `codex/rebuild-nextjs` 分支，未进入 GitHub 默认分支 `main`，导致 GitHub Actions 未注册该定时任务；已配置 GitHub Secret `ZHIPU_API_KEY` 与变量 `NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH`，补齐 deploy workflow 构建期 env，并将 2026-05-11 至 2026-05-14 全部补为 `ai_summary`
- [x] 2026-05-14：修复 GitHub `Deploy Frontend` 首次触发失败；根因是部署构建期 `/games` 页面等待远程 game-api 超过 Next 静态生成超时，已新增 `STEAM_DATA_SOURCE=static` 让 GitHub 部署构建直接使用本地 Steam 快照
- [x] 2026-05-14：手动触发 `Update AI Daily` 验证正式链路，workflow 成功拉取 `2026-05-14` 并提交 `chore(data): update AI Daily`；随后确认 `GITHUB_TOKEN` 推送不会触发独立 `Deploy Frontend`，已将 Cloudflare 部署步骤接入 AI Daily workflow 的数据变更分支
- [x] 2026-05-14：补充 AI Daily 重跑防降级保护；如果当天已有 `ai_summary`，后续同日重跑遇到智谱接口 400/不可用时保留既有 AI 总结，不再覆盖为 `mirror_fallback`
- [x] 2026-05-17：将 AI Daily GitHub Actions 自动同步时间从北京时间 11:00 调整为 12:00；workflow cron 从 `0 3 * * *` 改为 `0 4 * * *`，并更新 `pnpm test:ai-daily` 调度断言
- [x] 2026-05-22：完成 `SIGNAL ARENA` 公开看板与云端 AI Trader Runner 设计及 implementation plan；范围包括三页公开只读看板、Cloudflare Cron Worker、自定义 Responses provider、A 股风控、dry-run 与部署 secret 清单
- [x] 2026-05-23：完成 `SIGNAL ARENA` 的 AI provider、A 股风控、Runner、D1 日志接入、公开页验证与部署文档收尾；本地已通过 `pnpm test:signal-arena`、`pnpm test:portal`、`pnpm test:signal-arena-worker`、`pnpm typecheck`、`pnpm lint`、`pnpm build`
- [x] 2026-05-23：修复首页 `SIGNAL ARENA` 入口不易发现的问题；将入口提升为门户第一张卡片，并缩短封面高度，让当前本地浏览器首屏可见入口标题与 `OPEN` 按钮
- [x] 2026-05-23：完成 Signal Arena 线上部署；创建并绑定 Cloudflare D1 `signal-arena` 与 KV `SIGNAL_ARENA_KV`，部署 Worker 到 `signal-arena-api.maysssss.cn`，配置 `SIGNAL_ARENA_AGENT_API_KEY` / `SIGNAL_ARENA_AI_API_KEY` / `SIGNAL_ARENA_ADMIN_TOKEN` secrets，并用 `dryRun=true` 写入一条周六非交易时段 `skipped` 日志
- [x] 2026-05-23：修复 Signal Arena 真实上游字段映射；策场当前返回 `portfolio.total_value`、`holdings.avg_cost`、`holdings.profit_loss`、`leaderboard[].total_value` 等字段，Worker 已兼容并重新部署，线上 `/signal-arena` 已显示真实总资产与 A 股持仓，不再显示 fallback 数据
- [x] 2026-05-23：修复首页 `SIGNAL ARENA` 入口卡片布局回归；去掉全宽 `grid-column`，保持它和其他 portal 卡片同尺寸、同完整卡片跳转结构，并补充 `pnpm test:portal` 回归断言
- [x] 2026-05-23：完成 Signal Arena 行情终端视觉、红绿分段收益曲线、曲线点决策弹窗与增强交易 prompt 的设计文档；实现尚未开始，下一步按 Superpowers 写 implementation plan
- [x] 2026-05-23：完成 Signal Arena 行情终端实现；新增 `7D / 30D / ALL` ECharts 收益曲线、红涨绿跌分段、单点/点位决策弹窗、公开 decision trace / before-after snapshot / equity history 类型与 sanitizer、D1 快照持久化、Runner richer context、top-movers/snapshots 上游读取，以及可审计 AI prompt；本地浏览器已验证 `/signal-arena` 图表渲染、范围按钮与弹窗打开
- [x] 2026-05-23：部署 Signal Arena 行情终端；远端 D1 成功执行 4 条迁移语句，`mays-signal-arena-api` 已部署到版本 `51fbd253-5893-49e1-9647-0a182e93aac7`，前端 `main` push 后 GitHub `Deploy Frontend` 成功，线上 API 已返回 `equityHistory` 首个 dashboard 快照
- [x] 2026-05-23：完成 Signal Arena 运营可靠性与看盘体验补强；Worker public data 新增安全 `operations` 状态对象，前端新增 `运行状态` 面板、日志摘要/筛选、快照累积文案，并补充公开字段白名单与 secret 防泄漏回归测试
- [x] 2026-05-23：完成 Signal Arena WorkBuddy 历史回填本地融合；新增本地解析/同步脚本、`public/data/signal-arena/history.json`、来源/置信度字段、日志来源筛选和收益点位摘要兜底；从 `automation-7` 导入 169 条历史日志、96 个历史收益点，与 fallback/live 点合并后本地页面显示 97 个曲线点、38 天覆盖；本轮按用户要求仅本地开发，未部署线上
- [x] 2026-05-23：已将 Signal Arena WorkBuddy 历史回填正式部署到 Cloudflare；`pnpm deploy` 上传 6 个新/变更静态资源，其中包含 `/_next/static/chunks/app/signal-arena/*.js` 与 `/data/signal-arena/history.json`，当前前端版本 `87fc4ccb-84f9-46b1-af50-b134b0f9384e`
- [x] 2026-05-25：修复 Signal Arena Worker 在交易时段的连续失败；根因是上游 `/api/v1/arena/top-movers` 返回按市场分组对象时，`runner.ts` 仍把 `movers` 当平铺数组直接 `.slice()`，导致 2026-05-25 北京时间 09:30-15:00 的 18 次交易时段 cron 全部失败。现已补齐 grouped payload 回归测试、兼容数组/分组对象两种结构，并部署 Worker 版本 `5af8c926-fdf2-4060-a25b-319e640849e1`
- [x] 2026-05-25：重置并验证 `SIGNAL_ARENA_ADMIN_TOKEN`；线上 `POST /api/admin/run?dryRun=true` 返回 200，远端 D1 最新日志写入 `manual / skipped`，当前因北京时间 20:08 已收盘，跳过为预期行为
- [x] 2026-05-25：补强 Signal Arena 上游列表兼容兜底；新增统一 `arenaList` 归一化 helper，Runner 兼容 `holdings/trades/top-movers/snapshots` 的数组、`items/records` 包装与分组对象，公开看板兼容 `holdings/trades/leaderboard` 包装列表；本地先确认新增回归测试红灯，再实现并部署 Worker 版本 `06baecb4-3d8d-4786-8b1c-2ba61dc0ab9d`
- [x] 2026-05-25：对齐 Signal Arena Cron 与 A 股连续竞价时间；根因是旧 cron `*/15 1-7 * * 1-5` 对应北京时间 09:00-15:45，会命中 09:00/09:15 未开盘、午休和 15:15 后收盘，且代码把 11:30 与 15:00 边界仍算作可交易。现已将代码交易判断改为 09:30-11:30、13:00-14:57（右开区间），将 Cron 收缩到更保守的 09:35-11:20、13:05-14:50，并在安全窗口内先读取上游 `/home` 的 `market_status`，若显示 closed / not_open / 休市则直接跳过 AI 与下单；部署 Worker 版本 `7ed98ae2-4e52-4724-b69b-05ae51fd94dc`
- [x] 2026-05-26：修复 Signal Arena 与首页 UI 回归；Signal Arena 共用 Shell 右侧新增 `返回首页` 链接，首页 portal cover 从 58svh 恢复为 100svh，使第一屏重新被 MAYS UNIVERSE header 填满；本地浏览器验证返回链接可跳回 `/`、cover 高度等于视口高度，并部署前端版本 `c66093b9-8b18-491c-8ef3-855ee4b7bd7d`
- [x] 2026-05-26：优化从首页进入 Signal Arena 的点击反馈；根因是 `/signal-arena` 动态服务端页面需要等待 worker 数据，路由切换期间没有即时视觉反馈。现已给首页入口启用 prefetch，并新增 `/signal-arena/loading.tsx` 复用 Signal Arena Shell 展示同步态；通过回归测试、类型检查、lint、生产构建，并部署前端版本 `13f2e145-a24b-4eb6-9765-afd8f51023e5`
- [x] 2026-05-26：纠正 Signal Arena 的 HOLD/观望展示语义；根因是风险层忽略 `final_action` 并对 `hold` 的 `shares=0` 错误执行整手校验，Runner 又将“不下单”统一落为 `blocked`，让完整 AI 分析看起来像没有决策。现已以 `final_action` 为最终执行依据，将 HOLD/观望记录为 `held`，公开读取层兼容修正今日已写入的旧 HOLD 日志，并部署 Worker 版本 `5827967d-187d-48f6-98c6-e869495ed911`
- [x] 2026-05-27：完成 Signal Arena 前置信号生成层；新增 `generateTradingSignals()`，把 A 股涨跌幅、持仓盈亏、现金比例与近期交易加工为 `pullback_entry` / `momentum_watch` / `take_profit_watch` / `stop_loss_watch` / `position_rebalance` 等可审计信号，再交给 AI 做最终决策。Worker 已部署版本 `00ab383b-09ae-4e46-aad4-5a667e649cf5`，前端已部署版本 `9864fb5a-4ee1-46bb-8ec3-965ebd9c4449`；线上旧 run 的 `signalContext=[]` 属于部署前历史数据，需等 2026-05-27 开盘后的新 run 验证非空信号。
- [x] 2026-05-27：创建生产巡检自动化；`Signal Arena 信号层巡检` 每个 A 股工作日北京时间 10:20 检查最近交易运行是否带有非空 `decisionTrace.signalContext`，若失败则定位、测试并部署修复；`mays-site 每日巡检` 每天北京时间 09:10 检查首页、AI Daily、Signal Arena、Game、Photos 与 Style Prompt 的线上健康状态。
- [x] 2026-05-27：修复 Signal Arena 卖出风控提示误导；旧实现 prompt 侧把缺失 `available_shares` fallback 为 `shares`，风控侧却 fallback 为 `0`，导致同一持仓被 AI 判断可卖、风控判断不可卖。现已对齐 fallback、拆分“暂无可卖/T+1”和“超过可卖数量”，并兼容旧 D1 日志的合并提示展示。
- [x] 2026-05-28：将 Signal Arena 收益曲线改为等距点位分布；解决一天内多个 Runner 时间接近时点位挤在一段时间里的问题，真实时间保留在 tooltip 与点位摘要中。
- [x] 2026-05-28：同步调整收益曲线范围控制为点位数量语义；默认展示近 30 个点，可切换近 90 点或全部。
- [x] 2026-05-28：修正 Signal Arena AI provider 超时的公开用语；`AI provider returned 524` 不再展示为笼统的 `Runner 执行失败。`，而是说明 AI 服务响应超时且本轮未生成交易决策，旧日志也会在公开 API / 页面读取时兼容归一。
- [x] 2026-06-01：补齐 Signal Arena failed 用语与 AI 兜底；`AI provider returned 502`、`Signal Arena request failed: 504`、`Responses API returned no text output` 会分别展示为 AI 服务暂不可用、上游响应超时、AI 未返回有效决策内容；严格模型遇到这些短暂异常时会先尝试轻量模型，减少直接 failed。
- [x] 2026-06-12：调整 Signal Arena AI 决策模型；主决策改用 `gpt-5.4` + `high` reasoning，兜底仍为 `gpt-5.4` + `low` reasoning，并重新部署 Worker。
- [x] 2026-06-04：执行 Signal Arena 信号层巡检；生产域名/API/D1 读取仍被当前环境 DNS 与 Wrangler auth fetch 阻塞，未取得线上最新 run 的 live JSON 证据。已复核 Worker Runner、public-data sanitizer、前端 sanitizer 与弹窗展示链路，并完成 Worker 测试、Worker typecheck、Signal Arena 前端回归、根目录 typecheck、lint、build；未发现需要修复的本地链路问题，未部署。

## 本地数据产物

- `public/data/signal-arena/history.json`：由 `node scripts/sync-signal-arena-history.mjs` 从 `~/.workbuddy/workbuddy.db` 的 `automation-7` 生成；当前包含 169 条清洗后的公开日志、96 个历史收益点

## 进行中

- [ ] Harness P3 — 状态子系统（PROGRESS.md 已创建，待实际使用验证）

## 已知问题

- `README.md` / `DEPLOYMENT.md` 仍有 Next.js 14 / React 18 的旧描述，实际版本以 `package.json` 和 AGENTS/CLAUDE 为准
- Worker TypeScript 目前不在根目录 `make check` 覆盖范围内
- 自动化测试框架尚未引入
- 曾因 `CLOUDFLARE_API_TOKEN` 缺失导致 Wrangler 非交互部署受阻；该阻塞已在 2026-05-05 部署时解除
- 本地若长期保留旧的 `pnpm dev` 进程，再执行 `pnpm build` 覆盖 `.next`，可能触发 `Cannot find module './<chunk>.js'`；恢复方式是停止旧 dev server、删除 `.next`、重新执行 `pnpm dev`
- 当前 Signal Arena 开发分支的本地 AI Daily 静态快照落后于 `main`；发布 Signal Arena 前端改动前须先同步最新日报数据或经 `main` 合并部署，避免覆盖线上最新日报

## 决策记录

| 日期 | 决策 | 原因 | 否决方案 |
|------|------|------|----------|
| 2026-04-19 | CLAUDE.md 与 AGENTS.md 内容完全一致 | 两个 agent 并用，避免信息分裂 | 各自独立维护 + CI 同步检查 |
| 2026-04-19 | Makefile 统一验证入口 | agent 只需 `make check` 一条命令 | 依赖 CLAUDE.md 中的命令说明 |
| 2026-05-01 | `maysssss.cn` 新入口页定位为 `MAYS UNIVERSE` 美漫封面 + 分格目录 | 用户希望主站第一眼足够惊艳，像真正的美漫，同时仍作为 Game / Photos / Coming Soon 的入口 | 普通导航页、个人介绍首页、展示型内容首页 |
| 2026-05-01 | Coming Soon 入口使用封印分格按钮，不跳转 | 保留未来扩张感，同时避免暴露未定子页面 | 命名未来栏目、创建占位页、完全不响应 |
| 2026-05-01 | 根 `<html>` 使用 `suppressHydrationWarning` | in-app browser/扩展可能在 React hydration 前注入属性，需避免误报 | 为注入属性写客户端逻辑、忽略红屏 |
| 2026-05-01 | 游戏页服务端数据读取改为 Worker 优先、静态 JSON 兜底 | Worker R2 数据已更新到 2026-05-01，但线上静态快照仍停在 2026-04-19，首屏不应被旧构建快照锁死 | 仅依赖每日提交静态 JSON、仅在客户端发现空数据时再拉 Worker |
| 2026-05-02 | 新工具分支放在 `maysssss.cn/tools` 而非新子域名 | Tools 是主站能力扩展，不需要单独域名边界 | `tools.maysssss.cn` |
| 2026-05-02 | 首个工具选择公开可用的二维码生成器 `QR Studio` | 风险低、实现清晰、适合全息彩膜视觉，也不需要存储/认证 | API 发送器、代码执行器、Word 转 Markdown |
| 2026-05-02 | 主页新增 `Tools` 真实入口，同时保留一个 sealed panel | 既能暴露新能力，也保留宇宙仍在扩张的叙事感 | 增加第五块面板、一次性取消所有 sealed panel |
| 2026-05-03 | 主页仅暴露 `Tools / Signal Lab` 分支入口，不暴露 `QR Studio` 等具体工具名 | 主页仍是宇宙级导航，具体工具发现发生在 `/tools` 内部 | 在主页直接写具体工具卡片 |
| 2026-05-03 | `Game` / `Photos` 首页入口优先使用站内路由文案 | 当前打开行为本来就是 `/game`、`/photos`，先统一表达，保留子域名兼容但不在主页强调 | 把主页文案继续写成 `game.maysssss.cn` / `photo.maysssss.cn` |
| 2026-05-03 | `Game` / `Photos` 以后仅通过主域名路由访问 | 统一信息架构，避免主页、路由与 legacy 子域名长期并存 | 保留子域名兼容、子域名跳转到路由、继续双入口 |
| 2026-05-03 | Cloudflare 控制台侧同步清理 legacy Worker 绑定 | 避免旧子域名继续命中 `mays-site-web` 或残留错误的自定义域映射 | 仅在应用层返回 410，控制台保持旧绑定不动 |
| 2026-05-03 | UI-Prompt 数据先作为静态 JSON 放在 `public/data/ui-prompt-styles.json` | 数据量约 3.5MB，适合前端按需 fetch；当前不需要 R2、数据库或认证 | 接入 R2、复制原站完整前端、只放外链索引 |
| 2026-05-04 | Style Prompt Index 使用 UI-Prompt 上游 `demo.html/demo.css` 以 sandbox iframe 渲染原始预览 | 用户需要原站那套预览画面；上游并没有静态截图，主要靠 demo HTML/CSS 渲染；不执行 compiled JSX，并用 CSP + iframe sandbox 限制权限 | 继续使用本地 CSS 仿图、直接执行 compiled JSX、只显示文字列表 |
| 2026-05-05 | Style Prompt Index 改为静态预览图优先，保留 `iframe srcdoc` 作为缺图回退 | 已确认数据与 demo 源文件完整，但实际页面上下文里的运行时预览仍会出现空白；预生成 PNG 更稳定，也更适合 catalog 批量展示 | 继续只依赖运行时 iframe、回退到纯文字占位 |
| 2026-05-05 | Style Prompt Index 主页面不再同时保留右侧详情和弹框，只保留 card gallery + modal | 右侧详情与弹框职责重复，会让浏览与查看形成两套交互；当前信息量更适合索引页 + 弹框详情 | 保留右侧详情与弹框并存、立即拆成独立详情路由 |
| 2026-05-05 | 模板无独立 prompt 时在弹框内明确回退到 family base prompt，并显示提示说明 | 上游 130 个 templates 里有 56 个本身没有 prompt 文本；如果仍按模板优先读取会出现 `0 chars` 空白，且用户无法判断是数据缺失还是页面 bug | 继续让空模板返回空白、隐藏模板选择、强制所有模板共享同一标题 |
| 2026-05-05 | Style Prompt Index 页面本身采用低存在感的极简主义 + 瑞士设计混合风格 | 该页本质是“提示词索引工具”，如果页面自身视觉过强，会和它所索引的 UI 风格内容互相抢注意力；因此让页面退后一步、让 prompt 与 preview 成为主角 | 继续沿用高饱和全息彩膜风格、把该页做成视觉 showcase |
| 2026-05-06 | 先补 `.planning` 再执行 `$gsd-verify-work` | 当前实际工作已到 `v1.2`，但 GSD 文档仍停在 `v1.1`；若不先补 phase，`verify-work` 无法对新页面生成正式 UAT 会话 | 直接沿用 `v1.1` phase 做验收、跳过 GSD 状态同步 |
| 2026-05-06 | 将 fallback iframe 的第三方静态资源请求记为 accepted risk，而非继续扩展实现关闭它 | 当前主路径已经是本地 PNG 预览；fallback 只在预览图失效时触发，且 sandbox/CSP/`no-referrer` 已把能力压到很低，继续为此引入更重的代理或重写逻辑不划算 | 为 fallback 追加代理层、彻底禁用 demo fallback、引入 R2/后端中转 |
| 2026-05-06 | 里程碑审计先按 `gaps_found` 记录，而不是直接放行归档 | 当前功能链路虽通过，但 git 工作区仍包含未提交的 `Style Prompt Index` 实现文件，且 Phase 4/5 缺少验证文档；此时打 tag 会让版本标签与实际 shipped 代码不一致 | 忽略仓库状态直接 complete milestone、把证据缺口当成已通过 |

## 下一步

1. 部署 Quant Lab 前先执行 `workers/signal-arena-api/migrations/2026-06-12-quant-lab.sql`，并把生产 `SIGNAL_ARENA_AGENT_API_KEY` 切到新的量化账号 key；明文 key 不写入仓库
2. 部署 Worker 后先用 `dryRun=true` 手动运行，确认 `home / portfolio / stocks-list / stock-history` 正常，D1 新 run 写入 `account_scope=quant-v1`、`strategy_version=Q-Alpha v1`、`strategy_trace_json`
3. A 股交易时段内再执行一次非 dry-run，确认公开 `/signal-arena`、`/signal-arena/logs`、`/signal-arena/rank` 只显示新量化账号数据，不再合并旧本地 AI 历史
4. Quant Lab 稳定运行后进入下一阶段：回测脚本、候选策略版本和每周 AI 复盘；同步维护 `docs/signal-arena-quant-lab-user-guide.md`
5. 观察 AI Daily 每天北京时间 12:00 的 GitHub Actions 自动同步是否稳定产出 `ai_summary`
6. 每天北京时间 09:10 通过 `mays-site 每日巡检` 自动检查线上页面是否出现 4xx/5xx、配置缺失、数据异常陈旧或公开密钥泄漏
7. 观察 legacy `game.maysssss.cn` / `photo.maysssss.cn` 的 DNS/证书传播结果，确认最终对外状态
8. 如需长期同步 UI-Prompt 上游数据，再把当前 `scripts/audit-ui-prompt-data.mjs` 扩展为可手动运行的数据同步脚本
