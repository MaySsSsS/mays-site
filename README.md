# 🎮 Steam Gaming Blog

一个展示 Steam 游戏收藏和游玩时长的个人博客网站。

## ✨ 功能特点

- 📊 展示 Steam 游戏库和游玩统计
- 🎯 游戏时长排行
- 🕐 最近游玩的游戏
- 🔍 游戏搜索和筛选
- 📱 响应式设计，支持移动端
- 🌙 暗色主题，游戏风格 UI

## 🛠️ 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全
- **Pinia** - 状态管理
- **Vue Router** - 路由管理
- **Vite** - 构建工具
- **GitHub Pages** - 静态托管
- **GitHub Actions** - 自动化部署

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 获取真实 Steam 数据

1. 设置环境变量：

```bash
export STEAM_API_KEY="你的Steam API Key"
export STEAM_ID="你的Steam ID"
```

2. 运行数据获取脚本：

```bash
node scripts/fetch-steam-data.js
```

## 📦 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

将项目推送到 GitHub 仓库。

### 2. 配置 Secrets

在仓库的 `Settings > Secrets and variables > Actions` 中添加：

- `STEAM_API_KEY`: 你的 Steam Web API Key
- `STEAM_ID`: 你的 Steam 64 位 ID

### 3. 启用 GitHub Pages

在 `Settings > Pages` 中：

- Source 选择 `GitHub Actions`

### 4. 触发部署

推送代码到 `main` 分支，或手动触发 Actions 工作流。

## 🔑 获取 Steam API Key

1. 访问 [Steam API Key 页面](https://steamcommunity.com/dev/apikey)
2. 登录你的 Steam 账号
3. 填写域名（可以填任意域名）
4. 获取 API Key

## 🆔 获取 Steam ID

1. 访问你的 Steam 个人资料页面
2. URL 中的数字就是你的 Steam ID
3. 或者使用 [SteamID Finder](https://steamidfinder.com/)

## 📁 项目结构

```
steam-blog/
├── .github/workflows/    # GitHub Actions 配置
├── public/
│   └── data/            # Steam 数据 JSON
├── scripts/             # 数据获取脚本
├── src/
│   ├── components/      # Vue 组件
│   ├── layouts/         # 布局组件
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia Store
│   ├── types/           # TypeScript 类型
│   └── views/           # 页面组件
└── ...
```

## 📄 许可证

MIT License
