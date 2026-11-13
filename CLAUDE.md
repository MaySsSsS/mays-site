> **同步警告**：本文件与 AGENTS.md 内容完全一致。修改本文件时，必须同步更新 AGENTS.md。

# mays-site

主域名路由个人站点：linkmays.com（门户）、`/game`（Steam 游戏库）、`/photos`（照片足迹）。历史 `game.maysssss.cn` / `photo.maysssss.cn` 子域名已停用。

> **会话入口**：先读 `PROGRESS.md` 了解当前状态和下一步，再开始工作。

## Verification

**每次修改后必须逐层通过，未通过上一层不得进入下一层：**

| 层级 | 命令 | 检查内容 |
|------|------|----------|
| L1 类型安全 | `pnpm typecheck` | TypeScript strict 模式无错误 |
| L2 代码规范 | `pnpm lint` | ESLint 无错误 |
| L3 可构建 | `pnpm build` | Next.js 生产构建成功 |

**全量验证**：`make check`（等价于依次执行 typecheck → lint → build，任一失败即停止）

**Definition of Done**：功能完成 = L1-L3 全通过 + 无调试代码残留（console.log / debugger / TODO）

**WIP=1**：任何时刻只做一个功能点，当前功能通过验证后再开始下一个。

## Commands

```bash
# 开发
pnpm dev                              # Next.js 开发服务器 (localhost:3000)

# 验证（按顺序执行）
pnpm typecheck                        # tsc --noEmit
pnpm lint                             # next lint
pnpm build                            # next build

# 预览 & 部署
pnpm preview                          # Cloudflare 本地预览（会先构建）
pnpm deploy                           # 检查工作区 → 构建 → 部署到 Cloudflare
pnpm deploy:only                      # 复用已有 .open-next 产物直接发布

# Workers
pnpm dev:game-api                     # game-api 本地开发
pnpm dev:photo-api                    # photo-api 本地开发
pnpm dev:social-api                   # social-api 本地开发（PSN/任天堂数据）
# 部署 Workers：cd workers/<name> && npm run deploy（即 wrangler deploy -c wrangler.toml）

# 数据脚本
node scripts/fetch-steam-data.js      # 需要 STEAM_API_KEY + STEAM_ID
```

## Architecture

Next.js 15 + React 19 + TypeScript strict + Zustand + CSS Modules。单体应用，Cloudflare Workers 部署。

```
主域名路由（legacy 子域名由 middleware 拦截停用）：
  linkmays.com                     → app/page.tsx                    （门户首页）
  linkmays.com/games               → app/games/page.tsx              （平台传送门）
  linkmays.com/games/steam         → app/games/steam/                （Steam 概览，server component，构建期快照）
  linkmays.com/games/steam/library → app/games/steam/library/        （Steam 游戏库，server component，构建期快照）
  linkmays.com/games/nintendoswitch→ app/games/nintendoswitch/       （Switch 演示页，client）
  linkmays.com/games/playstation   → app/games/playstation/          （PS5 演示页，client）
  linkmays.com/photos              → app/(photo)/photos/             （照片地图，client component）
```

旧 `/game` 路由已取消（无重定向）；`/games` 是唯一的游戏入口。

### Project Layout

```
app/
  layout.tsx                    # 根布局
  page.tsx                      # 门户首页
  games/page.tsx                # 平台传送门（三张大卡片）
  games/steam/layout.tsx        # SteamShell 布局壳（读取 Steam 头像）
  games/steam/page.tsx          # Steam 概览（async server component）
  games/steam/library/page.tsx  # Steam 游戏库（async server component）
  games/nintendoswitch/         # Switch 演示页 + NintendoShell
  games/playstation/            # PS5 演示页 + PlayStationShell
  (photo)/layout.tsx            # PhotoShell 布局壳
  (photo)/photos/page.tsx       # 照片页（client component）
components/
  game/                         # SteamShell/SteamHome, NintendoShell/NintendoHome,
                                # PlayStationShell/PlayStationHome, PlatformPortal,
                                # PlatformAvatar, GameLibrary, GameCard, FeaturedGame
  photo/                        # PhotoShell, PhotosClient, ChinaMap, CitySelector, PhotoAuth, PhotoLightbox, PhotoUploader, PhotoAsset
lib/
  platforms.ts                  # 三个平台的名称/路由/强调色元数据
  demo-games.ts                 # Switch 与 PS 的演示数据（本地静态图）
  steam-data.ts                 # server-only，导入静态 JSON 快照
  game.ts                       # 游戏数据计算函数
  photo.ts                      # 照片工具函数、城市坐标
  photo-api.ts                  # photo-api Worker 客户端（JWT + CRUD）
stores/
  steam-store.ts                # useSteamStore（API 优先，本地 JSON 回退）
  photo-store.ts                # usePhotoStore（localStorage + Worker 双写）
  auth-store.ts                 # useAuthStore（JWT 认证状态）
types/
  steam.ts                      # SteamGame, GameData, GameStats 等
  photo.ts                      # Photo, PhotoGroup, CityCoordinate 等
styles/                         # CSS Modules，按 game/photo/portal 分组
public/data/
  steam-games.json              # Steam 数据快照（CI 每日更新）
  china-geojson.json            # 中国地图 GeoJSON
workers/
  game-api/                     # Cloudflare Worker: R2 存 Steam 数据，GET/POST
  photo-api/                    # Cloudflare Worker: R2 存照片，JWT 认证，完整 CRUD
  social-api/                   # Cloudflare Worker: D1 存加密凭证 + 快照，采集 PSN/任天堂时长
scripts/
  fetch-steam-data.js           # Steam API → R2 + 本地 JSON
```

## Hard Constraints

1. **Steam 概览/游戏库用 server component（构建期读取快照，不要加 `revalidate`：OpenNext 默认 dummy 缓存下运行时重渲染会让 Worker 挂住并返回 1101）**，Switch/PS 演示页与 Photo 页用 client component — 不混用
2. **状态管理只用 Zustand**（`stores/`），纯函数放 `lib/`
3. **Workers 有独立 tsconfig**，不引用根目录 `@/` alias
4. **所有 Worker API 端点必须有 CORS 配置**
5. **middleware.ts 只做 legacy 子域名停用 / Host gating**，不含业务逻辑
6. **CSS Modules only** — 不用 Tailwind / styled-components / 全局 CSS-in-JS
7. **重型组件必须 dynamic import + ssr: false**：ChinaMap、PhotoLightbox、PhotoUploader
8. **TypeScript strict mode**，禁止 `any`
9. **Photo 数据双写**：写操作先 localStorage 再推 Worker API
10. **Steam 数据读取**：server component 读静态 JSON，client store 可从 Worker API 回退
11. **平台页入口收敛**：`/games/*` 子页只保留「传送门 + 主站」返回入口，不链接 `/photos`、`/tools`；不恢复 `/game` 路由
12. **演示平台页只复刻主机主界面**：仅保留图标行 / 背景与账号入口，不加标题、统计、列表等说明性内容；演示图片只用 `public/games/` 本地静态图，不引入远程 CDN

## Session Protocol

### 会话开始

1. 读 `PROGRESS.md`（如存在）了解当前状态
2. 跑 `pnpm typecheck && pnpm lint` 确认仓库处于一致状态
3. 从 PROGRESS.md 的"下一步"继续，或根据任务开始工作

### 会话结束前

1. 更新 `PROGRESS.md`（进度、决策、阻塞项、下一步）
2. 跑全量验证：`pnpm typecheck && pnpm lint && pnpm build`
3. 清理调试代码（console.log / debugger / 临时注释）
4. 提交已完成的工作
5. **把本地预览地址发给用户看效果**：每完成一次可查看的改动，就启动 `pnpm dev` 并给出地址（默认 http://localhost:3000）以及本次改动的具体页面路径；不要只贴截图，用户要自己在浏览器里点。

## Data Flows

**Steam 数据**：GitHub Actions（每日 UTC 02:00）→ fetch-steam-data.js → Steam API → Worker R2 + 本地 JSON → 前端 server component 读 JSON / client store 从 API 回退

**照片数据**：浏览器 localStorage（主）+ photo-api Worker（从）双写。前端为唯一数据源，每次写操作同时推两端

## Deployment

- 前端：推 main 自动触发 GitHub Actions → `pnpm deploy` → Cloudflare Worker `mays-site-web`（域名 linkmays.com）
- 手动发布：`pnpm deploy` 会先跑 `scripts/predeploy-check.mjs`，工作区不干净会被拒绝（`ALLOW_DIRTY_DEPLOY=1` 可强制）；`pnpm deploy:only` 复用已有 `.open-next` 产物
- Workers：`cd workers/<name> && npm run deploy`；必须带 `-c wrangler.toml`，不要裸跑 `npx wrangler`，否则 wrangler 4 的 autoconfig 可能读到根目录配置
- Secrets：game-api 需 `UPLOAD_SECRET`；photo-api 需 `AUTH_PASSWORD`（可选 `JWT_SECRET`）；social-api 需 `ADMIN_TOKEN` + `TOKEN_ENC_KEY`（AES-GCM 加密 PSN/任天堂凭证）
- 链接 PSN/任天堂账号：`POST /api/link/{platform}`（Bearer `ADMIN_TOKEN`），之后每天 4 次 cron 采集，前端只读快照
- GitHub Secrets：`STEAM_API_KEY`, `STEAM_ID`, `GAME_UPLOAD_SECRET`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- 详细流程、版本基线与数据新鲜度见 `DEPLOYMENT.md`
