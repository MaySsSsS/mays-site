# Deployment

## 1. 当前 GitHub 和 Cloudflare 的联动方式

仓库里现在有三条相关链路：

### 1.1 Steam 数据自动更新

- GitHub Actions workflow: [`.github/workflows/deploy.yml`](/Volumes/KIOXIA+MAIWO/projects/mays-site/.github/workflows/deploy.yml)
- 触发方式：
  - 每天 UTC `02:00`
  - `workflow_dispatch` 手动触发
- 依赖的 GitHub Secrets：
  - `STEAM_API_KEY`
  - `STEAM_ID`
  - `GAME_UPLOAD_SECRET`

执行流程：

1. GitHub Actions 运行 [`scripts/fetch-steam-data.js`](/Volumes/KIOXIA+MAIWO/projects/mays-site/scripts/fetch-steam-data.js)
2. 脚本从 Steam Web API 拉取玩家和游戏库数据
3. 脚本把数据上传到 `mays-game-api` Worker 的 `/api/upload`
4. 脚本把快照写回 [`public/data/steam-games.json`](/Volumes/KIOXIA+MAIWO/projects/mays-site/public/data/steam-games.json)
5. Workflow 将更新后的 JSON 提交回 GitHub

### 1.2 Cloudflare Worker API

现有两个 Worker 仍然独立部署：

- [`workers/game-api`](/Volumes/KIOXIA+MAIWO/projects/mays-site/workers/game-api)
  - Worker 名称：`mays-game-api`
  - R2 bucket：`my-games`
  - 主要接口：`GET /api/steam-games`、`POST /api/upload`
- [`workers/photo-api`](/Volumes/KIOXIA+MAIWO/projects/mays-site/workers/photo-api)
  - Worker 名称：`mays-photo-api`
  - R2 bucket：`my-photos`
  - 主要接口：`POST /api/auth`、`GET/POST /api/groups`、`POST /api/upload`

前端默认直接请求：

- `https://mays-game-api.mays.workers.dev`
- `https://mays-photo-api.mays.workers.dev`

### 1.3 前端 Cloudflare Workers 部署配置

仓库现在已经包含前端部署所需的基础文件：

- [wrangler.jsonc](/Volumes/KIOXIA+MAIWO/projects/mays-site/wrangler.jsonc)
- [open-next.config.ts](/Volumes/KIOXIA+MAIWO/projects/mays-site/open-next.config.ts)
- [public/_headers](/Volumes/KIOXIA+MAIWO/projects/mays-site/public/_headers)
- [`.github/workflows/deploy-frontend.yml`](/Volumes/KIOXIA+MAIWO/projects/mays-site/.github/workflows/deploy-frontend.yml)

对应脚本：

- `pnpm preview`
- `pnpm deploy`
- `pnpm upload`

## 2. 前端部署建议

当前前端已经是 Next.js 14，并且使用了 [`middleware.ts`](/Volumes/KIOXIA+MAIWO/projects/mays-site/middleware.ts) 来根据域名把：

- `game.*` 根路径映射到 `/game`
- `photo.*` 根路径映射到 `/photos`

这意味着前端不只是“静态导出页面”，还依赖 middleware 行为。

基于 Cloudflare 当前官方文档，推荐这样部署：

- 前端主站：使用 **Cloudflare Workers + OpenNext adapter**
- API：继续保留现有两个独立 Worker
- 域名：
  - `maysssss.cn`
  - `game.maysssss.cn`
  - `photo.maysssss.cn`

## 3. 推荐的 Cloudflare 配置

### 3.1 前端

推荐创建一个新的前端 Worker 项目，例如：

- `mays-site-web`

然后把当前 GitHub 仓库连接到这个 Worker 的 **Workers Builds**。

推荐理由：

- Cloudflare 当前对 Next.js 的官方推荐是 **Workers**，不是 Pages 静态导出
- App Router、SSG、SSR、Middleware 都在 Workers 文档里标明受支持
- 你当前项目的子域名入口逻辑依赖 middleware，Workers 更契合

当前状态说明：

- 仓库已经补上了 `wrangler` / OpenNext 配置
- GitHub Actions 也已经补了前端部署 workflow
- 你还需要在 GitHub 和 Cloudflare 控制台里补 secrets、account、域名绑定

### 3.2 API

继续保留：

- `mays-game-api`
- `mays-photo-api`

它们已经各自绑定了 R2 bucket 和 CORS 域名，不需要因为前端重构而合并。

### 3.3 自定义域名

建议把域名分配成：

- `maysssss.cn` -> 前端 Worker
- `game.maysssss.cn` -> 前端 Worker
- `photo.maysssss.cn` -> 前端 Worker
- `mays-game-api.mays.workers.dev` 或自定义 API 域名 -> `mays-game-api`
- `mays-photo-api.mays.workers.dev` 或自定义 API 域名 -> `mays-photo-api`

这样一个前端 Worker 就能通过 middleware 识别访问域名并分发到正确页面。

## 4. 控制台里的实际操作顺序

### 4.1 连接 GitHub 到 Cloudflare

1. 在 Cloudflare Dashboard 打开 `Workers & Pages`
2. 创建或选择前端 Worker 项目
3. 进入 `Settings` -> `Builds`
4. 连接这个 GitHub 仓库
5. 确保 Cloudflare 有这个仓库的访问权限

### 4.2 绑定前端域名

1. 在前端 Worker 项目中打开 `Settings` -> `Domains & Routes`
2. 添加：
   - `maysssss.cn`
   - `game.maysssss.cn`
   - `photo.maysssss.cn`
3. 等待证书和 DNS 生效

### 4.3 保持 API Worker 独立

如果你已经在 Cloudflare 上部署过下面两个 Worker，则保持不变：

- `mays-game-api`
- `mays-photo-api`

只需要确认它们的 secrets 和 R2 绑定仍然存在。

## 5. 必要的 Secrets / Variables

### GitHub Secrets

- `STEAM_API_KEY`
- `STEAM_ID`
- `GAME_UPLOAD_SECRET`

### game-api Worker Secrets / Vars

- `UPLOAD_SECRET`
- `GAME_BUCKET`
- `CORS_ORIGIN`

### photo-api Worker Secrets / Vars

- `AUTH_PASSWORD`
- `JWT_SECRET`（可选，但建议显式设置）
- `PHOTO_BUCKET`
- `CORS_ORIGIN`

## 6. 当前仓库的一个重要结论

如果你继续沿用“Cloudflare Pages + GitHub 自动构建”的旧前端思路，需要非常谨慎。

我根据 Cloudflare 当前官方文档做出的判断是：

- **静态导出的 Next.js** 可以放在 Pages
- **包含 middleware 的 Next.js 应用** 更适合走 Workers + OpenNext

这个结论是从官方文档推出来的，不是仓库里显式写死的规则。

## 7. 下一步落地

如果你要把这套 Next 前端真正部署到 Cloudflare，下一步应当做的是：

1. 在 Cloudflare 上创建一个新的前端 Worker 项目，名称与 `wrangler.jsonc` 中的 `name` 保持一致
2. 为 GitHub 仓库设置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`
3. 选择：
   - 用仓库里的 GitHub Actions workflow 直接部署
   - 或在 Cloudflare 上启用 Workers Builds 连接这个仓库
4. 绑定 `maysssss.cn`、`game.maysssss.cn`、`photo.maysssss.cn`

## 8. 官方文档

- Cloudflare Pages Git integration:
  [https://developers.cloudflare.com/pages/configuration/git-integration/](https://developers.cloudflare.com/pages/configuration/git-integration/)
- Cloudflare Pages custom domains:
  [https://developers.cloudflare.com/pages/configuration/custom-domains/](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- Cloudflare Next.js on Pages:
  [https://developers.cloudflare.com/pages/framework-guides/nextjs/](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- Cloudflare static Next.js on Pages:
  [https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- Cloudflare Next.js on Workers:
  [https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- Cloudflare Workers Builds:
  [https://developers.cloudflare.com/workers/ci-cd/builds/](https://developers.cloudflare.com/workers/ci-cd/builds/)
- Cloudflare Worker custom domains:
  [https://developers.cloudflare.com/workers/configuration/routing/custom-domains/](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
