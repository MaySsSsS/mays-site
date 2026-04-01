# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # 安装依赖（monorepo 根目录）
pnpm dev:game             # 启动 Game 站开发服务器
pnpm dev:photo            # 启动 Photo 站开发服务器
pnpm build                # 构建所有应用
pnpm build:game           # 仅构建 Game 站
pnpm build:photo          # 仅构建 Photo 站
pnpm preview:game         # 预览 Game 站生产构建

# Workers
cd workers/game-api && npx wrangler dev      # game-api 本地开发
cd workers/game-api && npx wrangler deploy   # 部署 game-api
cd workers/photo-api && npx wrangler dev     # photo-api 本地开发
cd workers/photo-api && npx wrangler deploy  # 部署 photo-api

# 数据脚本（需 STEAM_API_KEY + STEAM_ID 环境变量）
node scripts/fetch-steam-data.js
```

## Architecture

pnpm monorepo，两个独立 Vue 3 SPA + 两个 Cloudflare Workers。

```
apps/game/      → @mays/game   → game.maysssss.cn   赛博朋克风 Steam 游戏库
apps/photo/     → @mays/photo  → photo.maysssss.cn  旅游风照片足迹
packages/shared → @mays/shared → 共享组件/stores/types/API
workers/game-api → Cloudflare Worker, R2 存 Steam 数据
workers/photo-api → Cloudflare Worker, R2 存照片, JWT 认证
```

### apps/game & apps/photo

各自是独立的 Vite + Vue 3 + Pinia + Vue Router 应用，结构相同：
- `src/main.ts` → `App.vue` → `router/index.ts` → `views/` → `layouts/`
- Vite 配置中 `@mays/shared` alias 指向 `../../packages/shared`，`@` 指向 `./src`

Game 站路由：`/`（首页）、`/games`（游戏库）
Photo 站路由：`/`（照片地图）

### packages/shared

通过 workspace 依赖被两个 app 引用（`"@mays/shared": "workspace:*"`）。

导出路径（见 `package.json` exports）：
- `@mays/shared` → `index.ts`（统一 re-export）
- stores: `useSteamStore`（游戏数据，优先从 game-api Worker 加载，回退本地 JSON）、`usePhotoStore`（照片分组，localStorage + photo-api Worker 双写）
- types: `GameData`, `SteamPlayerSummary`, `GameStats`, `PhotoGroup`, `Photo` 等
- api: `photoApi.ts` — JWT 认证 + 照片 CRUD
- components: `common/`（CursorEffect, HeroBackground, FeaturedGame）、`game/GameCard`、`photos/`（ChinaMap, ChinaMapEcharts, CitySelector, PhotoAuth, PhotoLightbox, PhotoUploader）

### Workers

**game-api**（`workers/game-api/src/index.ts`）:
- R2 bucket: `GAME_BUCKET` → `my-games`，存储 `steam-games.json`
- `GET /api/steam-games` — 读取数据（公开，缓存 1h）
- `POST /api/upload` — 上传数据（需 Bearer token = `UPLOAD_SECRET`）
- GitHub Actions 调用上传接口更新数据

**photo-api**（`workers/photo-api/src/index.ts`）:
- R2 bucket: `PHOTO_BUCKET` → `my-photos`，存储 `metadata/groups.json` + `images/*`
- 密码认证 → JWT（7天过期），所有接口需认证
- `POST /api/auth` → `GET/POST /api/groups` → `POST /api/upload` → `GET/DELETE /api/image/:key`

### 数据流

**Steam 数据**: GitHub Actions（每天 UTC 2:00）→ `scripts/fetch-steam-data.js` → Steam API → Worker API 上传到 R2 + 本地 JSON 备份 → 前端优先从 Worker 加载，回退本地 JSON

**照片数据**: 浏览器 localStorage（`mays_photo_groups`）+ Worker API 双写，前端为唯一数据源，写操作同时推两端

### 部署

- 两个前端站点部署到 **Cloudflare Pages**（推 main 自动触发），非 GitHub Pages
- Worker 通过 `wrangler deploy` 部署
- `scripts/fetch-steam-data.js` 同时保存数据到 `public/data/` 和 `apps/game/public/data/`，并上传到 Worker R2

## Key Details

- TypeScript strict mode，Vue 3 Composition API
- ECharts（photo 应用）用于中国地图可视化，GeoJSON 异步加载
- Vite config 中 `base: "/"` 用于 Cloudflare Pages
- Worker secrets 通过 `wrangler secret put` 设置：game-api 需 `UPLOAD_SECRET`，photo-api 需 `AUTH_PASSWORD`（可选 `JWT_SECRET`）
- GitHub Secrets: `STEAM_API_KEY`, `STEAM_ID`, `GAME_UPLOAD_SECRET`
