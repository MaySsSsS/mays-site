> **同步警告**：本文件与 CLAUDE.md 内容完全一致。修改本文件时，必须同步更新 CLAUDE.md。

# mays-site

三域名个人站点：maysssss.cn（门户）、game.maysssss.cn（Steam 游戏库）、photo.maysssss.cn（照片足迹）。

## Verification

**每次修改后必须逐层通过，未通过上一层不得进入下一层：**

| 层级 | 命令 | 检查内容 |
|------|------|----------|
| L1 类型安全 | `pnpm typecheck` | TypeScript strict 模式无错误 |
| L2 代码规范 | `pnpm lint` | ESLint 无错误 |
| L3 可构建 | `pnpm build` | Next.js 生产构建成功 |

**全量验证**：`pnpm typecheck && pnpm lint && pnpm build`

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
pnpm preview                          # Cloudflare 本地预览（需先 build）
pnpm deploy                           # 构建并部署到 Cloudflare

# Workers
pnpm dev:game-api                     # game-api 本地开发
pnpm dev:photo-api                    # photo-api 本地开发
# 部署 Workers：cd workers/<name> && npx wrangler deploy

# 数据脚本
node scripts/fetch-steam-data.js      # 需要 STEAM_API_KEY + STEAM_ID
```

## Architecture

Next.js 15 + React 19 + TypeScript strict + Zustand + CSS Modules。单体应用，Cloudflare Workers 部署。

```
三域名路由（middleware.ts 按 Host 重写）：
  maysssss.cn       → app/page.tsx          （门户首页）
  game.maysssss.cn  → app/(game)/game/      （游戏仪表盘，server component + ISR 1h）
  photo.maysssss.cn → app/(photo)/photos/   （照片地图，client component）
```

### Project Layout

```
app/
  layout.tsx                    # 根布局
  page.tsx                      # 门户首页
  (game)/layout.tsx             # GameShell 布局壳
  (game)/game/page.tsx          # 游戏仪表盘（async server component）
  (game)/games/page.tsx         # 游戏库（async server component）
  (photo)/layout.tsx            # PhotoShell 布局壳
  (photo)/photos/page.tsx       # 照片页（client component）
components/
  game/                         # GameShell, GameHome, GameLibrary, GameCard, FeaturedGame
  photo/                        # PhotoShell, PhotosClient, ChinaMap, CitySelector, PhotoAuth, PhotoLightbox, PhotoUploader, PhotoAsset
lib/
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
scripts/
  fetch-steam-data.js           # Steam API → R2 + 本地 JSON
```

## Hard Constraints

1. **Game 页用 server component + ISR**，Photo 页用 client component — 不混用
2. **状态管理只用 Zustand**（`stores/`），纯函数放 `lib/`
3. **Workers 有独立 tsconfig**，不引用根目录 `@/` alias
4. **所有 Worker API 端点必须有 CORS 配置**
5. **middleware.ts 只做子域名路由重写**，不含业务逻辑
6. **CSS Modules only** — 不用 Tailwind / styled-components / 全局 CSS-in-JS
7. **重型组件必须 dynamic import + ssr: false**：ChinaMap、PhotoLightbox、PhotoUploader
8. **TypeScript strict mode**，禁止 `any`
9. **Photo 数据双写**：写操作先 localStorage 再推 Worker API
10. **Steam 数据读取**：server component 读静态 JSON，client store 可从 Worker API 回退

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

## Data Flows

**Steam 数据**：GitHub Actions（每日 UTC 02:00）→ fetch-steam-data.js → Steam API → Worker R2 + 本地 JSON → 前端 server component 读 JSON / client store 从 API 回退

**照片数据**：浏览器 localStorage（主）+ photo-api Worker（从）双写。前端为唯一数据源，每次写操作同时推两端

## Deployment

- 前端：推 main 自动触发 GitHub Actions → `pnpm deploy` → Cloudflare Workers
- Workers：`cd workers/<name> && npx wrangler deploy`
- Secrets：game-api 需 `UPLOAD_SECRET`，photo-api 需 `AUTH_PASSWORD`（可选 `JWT_SECRET`）
- GitHub Secrets：`STEAM_API_KEY`, `STEAM_ID`, `GAME_UPLOAD_SECRET`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
