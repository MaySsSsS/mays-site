# Deployment

> 本文件是部署相关的唯一权威文档。旧的 `docs/DEPLOYMENT.md`（GitHub Pages + 子域名方案）已废弃并删除。

## 1. 线上架构

| 组件 | 平台 | 名称 | 入口 | 配置 |
| --- | --- | --- | --- | --- |
| 前端 | Cloudflare Workers | `mays-site-web` | `https://linkmays.com` | `wrangler.jsonc` + `open-next.config.ts` |
| 游戏 API | Cloudflare Workers | `mays-game-api` | `https://mays-game-api.mays.workers.dev` | `workers/game-api/wrangler.toml` |
| 照片 API | Cloudflare Workers | `mays-photo-api` | `https://mays-photo-api.mays.workers.dev` | `workers/photo-api/wrangler.toml` |

- 前端是单个 Next.js 应用，经 OpenNext 适配器跑在 Worker 上；`middleware.ts` 负责把已退役的 `game.*` / `photo.*` 子域名返回 410。
- 路由：`/` 门户、`/game` 游戏仪表盘、`/games` 游戏库、`/photos` 照片地图、`/tools` 工具集。
- 存储：game-api → R2 `my-games`；photo-api → R2 `my-photos`。没有 D1 / KV。
- `wrangler.jsonc` 里没有 `routes` / `custom_domain`，`linkmays.com` 目前是控制台手工绑定的。若要让部署自动维护域名，可在 `wrangler.jsonc` 增加（要求 zone 与 Worker 在同一账号）：
  ```jsonc
  "routes": [{ "pattern": "linkmays.com", "custom_domain": true }]
  ```

## 2. 前端发布

```bash
pnpm preview      # 本地 OpenNext 预览（会先构建）
pnpm deploy       # 部署前检查 → 构建 → 发布到 mays-site-web
pnpm deploy:only  # 复用已有 .open-next 产物，直接发布（快速重发 / 回滚同一构建）
pnpm upload       # 只上传新版本，不切流量
```

- 自动化：push 到 `main` 触发 `.github/workflows/deploy-frontend.yml`（Node 22 + pnpm 10，带 Next 构建缓存）。
- 手动发布默认走「先提交，再发布」：`scripts/predeploy-check.mjs` 会打印分支/提交/版本，并在工作区有未提交改动时**阻止部署**。确实要发布当前工作区时用 `ALLOW_DIRTY_DEPLOY=1 pnpm deploy`。
- 部署读取的是本地工作区，不是 Git 远端。`deploy` 前请确认 `git status` 干净，否则线上内容无法对应到某个提交。
- `STEAM_DATA_SOURCE=static` 只由 CI 设置：CI 构建时直接使用仓库里的 `public/data/steam-games.json`，避免构建期请求 API；本地发布默认走 API + 快照回退。

## 3. Workers 发布

```bash
cd workers/game-api   && npm run deploy  # wrangler deploy -c wrangler.toml
cd workers/photo-api  && npm run deploy
cd workers/social-api && npm run deploy
npm run typecheck                        # 每个 Worker 各自独立 tsconfig

# 本地没有 Cloudflare 凭证时，用 GitHub Actions 手动发布：
gh workflow run deploy-workers.yml -f worker=social-api
```

注意：wrangler 4 默认开启 autoconfig，在 Worker 子目录里裸跑 `npx wrangler deploy` 可能向上找到根目录的 `wrangler.jsonc` 而误发 `mays-site-web`。所以脚本里始终显式带 `-c wrangler.toml`，不要省略。

Secrets（`wrangler secret put` 设置，不进仓库）：

| Worker | Secret / Var | 说明 |
| --- | --- | --- |
| game-api | `UPLOAD_SECRET` | `/api/upload` 的 Bearer 密钥 |
| game-api | `CORS_ORIGIN`（var） | `https://linkmays.com` |
| photo-api | `AUTH_PASSWORD` | 照片页登录密码 |
| photo-api | `JWT_SECRET` | 可选，签发 7 天 JWT |
| photo-api | `CORS_ORIGIN`（var） | `https://linkmays.com` |
| social-api | `ADMIN_TOKEN` | `/api/link/*`、`/api/collect` 的 Bearer 密钥 |
| social-api | `TOKEN_ENC_KEY` | 32 字节随机值的 base64，AES-GCM 加密 PSN/任天堂凭证；丢了只能重新登录 |
| social-api | D1 `SOCIAL_DB` | 库名 `mays-social-db`，表结构见 `workers/social-api/schema.sql` |

GitHub Secrets：`STEAM_API_KEY`、`STEAM_ID`、`GAME_UPLOAD_SECRET`、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；GitHub Variables：`NEXT_PUBLIC_GAME_API_URL`、`NEXT_PUBLIC_PHOTO_API_URL`。

## 4. 版本基线

| 项 | 版本 | 备注 |
| --- | --- | --- |
| Next.js | 15.5.15 | 已过 2 年支持期（2026-10-21 截止），见下方 flag 说明 |
| React | 19.2.5 | |
| @opennextjs/cloudflare | 1.19.1 | peer 支持 next ≥15.5.15、wrangler ^4.65 |
| wrangler | 4.81.1 | 前端与两个 Worker 一致 |
| TypeScript | 5.9.3 | 前端与两个 Worker 一致 |
| @cloudflare/workers-types | 4.20260702.1 | 两个 Worker 一致 |
| compatibility_date | 2026-04-12 | 前端与两个 Worker 一致 |
| CI Node | 22 | 本地开发 Node 24 |

`--dangerouslyUseUnsupportedNextVersion` 只跳过 OpenNext 的「Next 大版本已过官方支持期」日期检查，不代表忽略不兼容；当前因为没有升级到 Next 16 才必须保留。迁移到 Next 16 后可移除该 flag。

## 5. 数据新鲜度

- Steam 数据：GitHub Actions 每天 UTC 02:00 运行 `scripts/fetch-steam-data.js`，写入 R2 并提交 `public/data/steam-games.json`；该 workflow **不触发前端部署**。
- 因此：R2 / `mays-game-api` 的数据立即变新，但页面是构建期快照（`STEAM_DATA_SOURCE=static`，且 `wrangler.jsonc` 里也用 `vars` 固定为 static），要重新部署前端才会更新页面。
- **不要给页面加 `revalidate`**：OpenNext 默认 `incrementalCache: "dummy"`，运行时重渲染既不会真正刷新缓存，又会在 Cloudflare 上把请求挂住（`error code: 1101`，Workers 报 `code had hung and would never generate a response`）。2026-11-13 的 `/games/steam`、`/games/steam/library` 500 就是这个原因，改为纯静态预渲染后恢复。
- 若要「不部署也更新页面」，需改成客户端始终从 game-api 取数，或配置 R2 增量缓存并去掉 `STEAM_DATA_SOURCE=static`。
- 照片数据：浏览器 localStorage 为主、photo-api 为从，双写。

## 6. 回滚与排障

- 查看版本：Cloudflare 控制台 Worker → Deployments，或 `npx wrangler deployments list`。
- 回滚：控制台把流量切回旧版本；或 `git checkout <commit> && pnpm deploy`。
- 页面 410：命中了 legacy 子域名，改用主域名路由。
- API 报 CORS：检查 Worker 的 `CORS_ORIGIN` var 与请求 Origin。
- 部署失败：先看 `predeploy-check` 输出，再确认 GitHub Secrets / Variables 是否齐全。

## 7. 参考

- Next.js on Workers：<https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/>
- OpenNext Cloudflare：<https://opennext.js.org/cloudflare>
- Workers 自定义域名：<https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>