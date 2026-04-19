# Mays Site

当前仓库已经直接切换为单一的 Next.js 应用，不再保留旧的 Vue 前端目录。主站 `/` 作为入口页，Game 与 Photos 保持独立子站语义。

## 项目结构

```text
mays-site/
├── app/                   # Next.js App Router 页面
├── components/            # React 组件
├── lib/                   # 数据与工具函数
├── stores/                # Zustand 状态管理
├── styles/                # CSS Modules
├── types/                 # 类型定义
├── public/                # 静态资源与本地数据快照
├── workers/
│   ├── game-api/          # Steam 数据 Worker
│   └── photo-api/         # 照片管理 Worker
└── scripts/               # 数据抓取脚本
```

## 当前重构状态

- `Game` 首页、`/games` 游戏库与主站入口页已迁移到 Next.js App Router。
- `/photos` 页面已迁移到 React + Zustand，继续复用现有 Photo Worker。
- 旧版 Vue 前端目录已删除，仓库以单一 Next.js 应用为准。

## 本地开发

```bash
pnpm install

pnpm dev

# 类型检查与构建
pnpm typecheck
pnpm lint
pnpm build

# Cloudflare Workers 本地预览 / 部署
pnpm preview
pnpm deploy
```

## 路由

- `/`：主站入口页
- `/game`：Game 仪表盘首页
- `/games`：游戏库
- `/photos`：照片与足迹

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Zustand
- ECharts
- Cloudflare Workers

## 备注

- `public/data/steam-games.json` 和中国地图 GeoJSON 来自原项目快照。
- 照片和游戏接口仍然复用当前 Workers，不影响线上 API。
- `middleware.ts` 会在 `game.*` 和 `photo.*` 子域名下把根路径分别映射到 Game 首页和照片页。
- GitHub 与 Cloudflare 的联动说明见 [DEPLOYMENT.md](/Volumes/KIOXIA+MAIWO/projects/mays-site/DEPLOYMENT.md)。
- 前端 Cloudflare 配置见 [wrangler.jsonc](/Volumes/KIOXIA+MAIWO/projects/mays-site/wrangler.jsonc) 和 [open-next.config.ts](/Volumes/KIOXIA+MAIWO/projects/mays-site/open-next.config.ts)。
