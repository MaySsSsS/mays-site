# PROGRESS.md

> 每次会话结束前必须更新。新会话开始时首先读取此文件。

## 当前状态

- 分支：codex/rebuild-nextjs
- 最新 commit：见 `git log -1 --oneline`
- 当前里程碑：v1.3 `Word to Markdown`（已完成实现、审计与归档，待开启下一里程碑）
- `make check`：通过（2026-05-04，`/tools/style-prompt` 原始 demo 预览尺寸改为方形后）
- `pnpm test:ai-daily` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-17，将 AI Daily 自动同步时间从北京时间 11:00 改为 12:00；workflow cron 为 `0 4 * * *`）
- `make check` / `pnpm run deploy` 内部 build：通过（2026-05-10，v1.3 Phase 10 完成并归档后；构建仍出现既有 `mays-game-api.mays.workers.dev` 超时警告但最终成功）
- `pnpm test:portal` / `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，修复首页 `SIGNAL ARENA` 入口恢复为普通可点击 portal 卡片）
- `pnpm typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，新增 Signal Arena 行情终端与决策追踪设计文档）
- `pnpm test:signal-arena` / `pnpm test:signal-arena-worker` / `pnpm typecheck` / `pnpm --dir workers/signal-arena-api typecheck` / `pnpm lint` / `pnpm build`：通过（2026-05-23，完成 Signal Arena 行情终端、收益曲线、决策弹窗、D1 快照与增强 prompt）
- 部署状态：2026-05-23 已发布 Signal Arena 前端与 Worker 到 Cloudflare；手工部署与 `main` push 后的 GitHub `Deploy Frontend` 均已通过，`mays-signal-arena-api` 当前版本 `ee95f8a0-f5cf-4c1e-9d96-5305f7bf387a`，公开 API 域名为 `https://signal-arena-api.maysssss.cn`

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

## 进行中

- [ ] Harness P3 — 状态子系统（PROGRESS.md 已创建，待实际使用验证）

## 已知问题

- `README.md` / `DEPLOYMENT.md` 仍有 Next.js 14 / React 18 的旧描述，实际版本以 `package.json` 和 AGENTS/CLAUDE 为准
- Worker TypeScript 目前不在根目录 `make check` 覆盖范围内
- 自动化测试框架尚未引入
- 曾因 `CLOUDFLARE_API_TOKEN` 缺失导致 Wrangler 非交互部署受阻；该阻塞已在 2026-05-05 部署时解除

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

1. 部署 Signal Arena 行情终端 Worker 与前端后，线上确认 `https://maysssss.cn/signal-arena` 的收益曲线、范围切换和决策弹窗
2. 观察 2026-05-25 周一 A 股交易时段内 Signal Arena cron 是否从 `skipped` 进入 `executed` / `held`，并确认 `/signal-arena/logs` 展示真实 AI 决策日志
3. 观察 AI Daily 每天北京时间 12:00 的 GitHub Actions 自动同步是否稳定产出 `ai_summary`
4. 观察 legacy `game.maysssss.cn` / `photo.maysssss.cn` 的 DNS/证书传播结果，确认最终对外状态
5. 如需长期同步 UI-Prompt 上游数据，再把当前 `scripts/audit-ui-prompt-data.mjs` 扩展为可手动运行的数据同步脚本
6. P2.1 — 冷启动测试（验证新 agent 能否仅靠仓库内容回答五个基本问题）
