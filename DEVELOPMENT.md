# Mays Space - 个人博客项目开发计划

> 一个集成了 **个人博客 + 游戏主页 + 照片足迹** 的综合性个人空间

## 📋 项目概述

将原本的纯 Steam 游戏展示站点，改造成一个更有"玩家感"的个人博客，包含：

- 🎮 游戏模块：展示 Steam 游戏库、最爱游戏、游戏时长统计
- 📷 照片模块：按地理位置分组的旅行/日常照片，支持中国地图可视化
- 👤 关于我：个人介绍页面

---

## ✅ 已完成

### 1. 项目基础架构

- [x] Vue 3 + TypeScript + Pinia + Vue Router 项目搭建
- [x] Steam API 数据获取脚本（ES Module 格式）
- [x] GitHub Actions 自动化部署配置
- [x] 响应式布局和暗色主题

### 2. 游戏模块

- [x] Steam 数据 Store（`stores/steam.ts`）
- [x] 游戏卡片组件（`components/game/GameCard.vue`）
- [x] 游戏库页面（`views/Games/index.vue`）
- [x] 首页游戏统计展示

### 3. 首页改造

- [x] 动态游戏封面背景组件（`components/common/HeroBackground.vue`）
  - 轮播展示最常玩的游戏封面（CS2、Apex、赛博朋克 2077、空洞骑士等）
  - 浮动游戏元素装饰动画
- [x] 精选游戏卡片组件（`components/common/FeaturedGame.vue`）
  - 显示游戏时长、最后游玩时间
  - 时长进度条可视化
- [x] 首页布局调整，添加"最爱游戏精选"区域

### 4. 照片模块基础

- 分组管理（增删改）
- 照片管理（增删）
- localStorage 持久化
- 中国 35+ 主要城市坐标数据
- 分组列表侧边栏
- 城市标签筛选
- 中国地图（ECharts 实现，支持真实轮廓与点位、异步加载）
- 照片网格展示

### 5. 导航和品牌调整

### 最近完成的工程化与交互改进（2025-11-28）

- [x] 修复 SPA 刷新 404 问题（已添加 `public/404.html`）
- [x] 修复游戏数据加载路径（使用 `import.meta.env.BASE_URL`，解决 GitHub Pages 下数据无法加载的问题）
- [x] 集成并使用 `echarts` + `vue-echarts` 渲染中国地图（异步加载 GeoJSON，处理加载失败降级）
- [x] 修复中国地图标签溢出与重叠问题（tooltip `confine: true`、`labelLayout`、容器 overflow:hidden）
- [x] 添加全局自定义光标与交互特效（`src/components/common/CursorEffect.vue`）
- [x] 全局样式与组件视觉升级为明亮 Glassmorphism 风格（渐变、毛玻璃、动效）
- [x] 优化游戏卡片与导航栏动画、渐变按钮与文字样式

这些改动均已提交并推送到远端仓库，Actions 会在推送后构建并部署站点。

- [x] 路由配置更新

## 🚧 进行中 / 待完成

- [x] **完整中国地图 SVG**
  - 省份/城市可点击高亮
  - 已去过的城市特殊标记
- [x] **城市选择器弹窗**

  - 可视化选择城市（点击地图或搜索）
  - 支持添加自定义位置

  - 支持拖拽上传
  - 图片压缩和预览
  - 存储方案：Base64 存储到 localStorage

- [x] **照片详情弹窗**
  - 大图预览
- [ ] 时间线（可选）

### 其他功能

- [ ] 深色/浅色主题切换
- [ ] 页面过渡动画
- [ ] SEO 优化
- [ ] PWA 支持（可选）

---

## 📁 项目结构说明

```
src/
├── components/
│   ├── common/           # 通用组件
│   │   ├── HeroBackground.vue   # 首页动态背景
│   │   └── FeaturedGame.vue     # 精选游戏卡片
│   ├── game/
│   │   └── GameCard.vue         # 游戏卡片
│   └── photos/           # 照片模块组件
│       ├── ChinaMap.vue         # 中国地图 SVG 组件
│       ├── CitySelector.vue     # 城市选择器弹窗
│       ├── PhotoUploader.vue    # 照片上传组件
│       └── PhotoLightbox.vue    # 照片详情弹窗
├── stores/
│   ├── steam.ts          # Steam 数据状态管理
│   └── photos.ts         # 照片数据状态管理
├── views/
│   ├── Home/             # 首页
│   ├── Games/            # 游戏库页面
│   ├── Photos/           # 照片足迹页面
│   └── About/            # 关于我页面
├── layouts/
│   └── MainLayout.vue    # 主布局（导航 + 内容 + 页脚）
└── router/
    └── index.ts          # 路由配置
```

---

## 🎨 设计风格

- **主色调**: Steam 蓝 (#66c0f4) + 紫色渐变
- **背景**: 深色系 (#0d1117, #161b22)
- **风格**: 毛玻璃效果、圆角卡片、微动效
- **字体**: 系统字体栈

---

## 🔧 技术栈

| 类别     | 技术                       |
| -------- | -------------------------- |
| 框架     | Vue 3 (Composition API)    |
| 语言     | TypeScript                 |
| 状态管理 | Pinia                      |
| 路由     | Vue Router 4               |
| 构建工具 | Vite                       |
| 样式     | Scoped CSS + CSS Variables |
| 部署     | GitHub Pages + Actions     |
| 数据     | Steam Web API              |

---

## 📝 备注

- Steam API Key 和 Steam ID 配置在 `scripts/fetch-steam-data.js`
- 照片数据存储在浏览器 localStorage，key 为 `mays_photo_groups`
- GitHub Pages 部署需要设置 `vite.config.ts` 中的 `base` 为仓库名（如 `/mays_blog/`）

---

_最后更新: 2025-11_
