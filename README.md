# Mays Site

当前仓库已经直接切换为单一的 Next.js 应用，不再保留旧的 Vue 前端目录。主站 `/` 作为入口页，Game 与 Photos 统一通过主域名路由访问。

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

- `/games` 平台传送门、Steam 概览与游戏库、Switch/PS 演示页、主站入口页都已在 Next.js App Router 内。
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
# 复用已有构建直接发布（快速重发）
pnpm deploy:only
```

## 路由

- `/`：主站入口页
- `/games`：游戏平台传送门（Steam / Nintendo Switch / PlayStation 三张大卡片）
- `/games/steam`：Steam 概览（真实数据与头像）
- `/games/steam/library`：Steam 游戏库
- `/games/nintendoswitch`：Switch 2 主界面风格演示页
- `/games/playstation`：PS5 主界面风格演示页
- `/photos`：照片与足迹

> 旧 `/game` 路由已取消，游戏入口统一为 `/games`。

## 技术栈

- Next.js 15.5
- React 19
- TypeScript
- Zustand
- ECharts
- Cloudflare Workers

## 备注

- `public/data/steam-games.json` 和中国地图 GeoJSON 来自原项目快照。
- 照片和游戏接口仍然复用当前 Workers，不影响线上 API。
- `middleware.ts` 会拦截已退役的 `game.*` 和 `photo.*` 子域名，并提示改用主域名路由。
- 部署流程、域名与版本基线见 [DEPLOYMENT.md](./DEPLOYMENT.md)。
- 前端 Cloudflare 配置见 [wrangler.jsonc](./wrangler.jsonc) 和 [open-next.config.ts](./open-next.config.ts)。
