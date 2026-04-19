# Harness Engineering 改造清单

> 项目：mays-site | 日期：2026-04-19 | 分支：codex/rebuild-nextjs
> 原则：CLAUDE.md 与 AGENTS.md 内容完全一致，双 agent 通用

---

## P0 — 指令子系统

### 0.1 重写 CLAUDE.md / AGENTS.md ✅

- [x] 删除所有过时的 Vue 3 monorepo 描述
- [x] 反映真实架构：Next.js 15 + React 19 + Zustand + Cloudflare Workers
- [x] 控制总行数 ≤ 150 行（路由式，非百科全书）
- [x] 必须包含的区块：
  - [x] **Commands** — 开发/构建/验证/部署命令
  - [x] **Architecture** — 单体 Next.js App Router，三域名路由，子目录结构
  - [x] **Hard Constraints** — 10 条硬约束
  - [x] **Verification** — 三层验证 + Definition of Done + WIP=1
  - [x] **Project Layout** — 当前真实目录树
- [x] 两个文件内容完全一致，顶部同步警告互相指向对方

### 0.2 建立指令维护纪律 ✅

- [x] 文件顶部已添加同步警告，修改任一文件必须同步更新另一个
- [ ] 每条硬约束标明来源（为什么加）和适用条件（什么时候需要）— 待细化
- [ ] 定期审计：删掉过时的、冗余的、矛盾的条目 — 持续进行

---

## P1 — 反馈子系统

### 1.1 创建 Makefile ✅

- [x] 统一验证入口 `make check` = typecheck + lint + build
- [x] CLAUDE.md / AGENTS.md 已更新为 `make check`

### 1.2 定义完成标准 ✅

- [x] CLAUDE.md / AGENTS.md 中已写明三层验证（L1-L3）
- [x] 完成定义：功能完成 = L1-L3 全通过 + 无调试代码残留
- [x] WIP=1 原则已写入指令文件

### 1.3 错误消息面向 agent 设计

- [ ] ESLint 自定义规则或注释中包含修复指导（不只说"错了"，还说"怎么改"）

---

## P2 — 环境子系统

### 2.1 冷启动测试

- [ ] 全新 agent 会话，仅读仓库内容，能否回答：
  1. 这是什么系统？（三域名 Next.js 站点）
  2. 怎么组织的？（App Router 路由组 + 子域名中间件）
  3. 怎么运行？（`pnpm dev` / `make dev`）
  4. 怎么验证？（`make check`）
  5. 当前进度如何？（→ 需要 P3 的 PROGRESS.md）
- [ ] 答不上来的问题 = harness 缺口，针对性补强

### 2.2 环境自描述

- [ ] `.dev.vars.example` 补全所有必需环境变量（含说明）
- [ ] Workers 的 `wrangler.toml` / `wrangler.jsonc` 中注释说明每个 binding 的用途

---

## P3 — 状态子系统

### 3.1 创建 PROGRESS.md 模板

- [ ] 包含区块：
  - **当前状态** — 最新 commit、构建/测试状态
  - **已完成** — 功能列表 + commit hash
  - **进行中** — 当前任务 + 完成百分比
  - **已知问题** — bug / 阻塞项
  - **下一步** — 排好优先级
- [ ] 每次会话结束前必须更新

### 3.2 决策日志

- [ ] 在 PROGRESS.md 中追加决策记录（或单独 DECISIONS.md）
  - 格式：`日期 | 决策 | 原因 | 否决方案`
- [ ] 防止跨会话反复做同样的架构决策

### 3.3 会话交接协议

- [ ] 在 CLAUDE.md / AGENTS.md 中写明：
  - 会话开始：读 PROGRESS.md → 跑 `make check` → 从"下一步"继续
  - 会话结束：更新 PROGRESS.md → 跑 `make check` → 确认清洁状态

---

## P4 — 测试基础（长期基建）

### 4.1 引入测试框架

- [ ] 安装 Vitest + @testing-library/react + @vitejs/plugin-react
- [ ] 配置 `vitest.config.ts`（兼容 Next.js + TypeScript）
- [ ] 至少一个示例测试通过（验证框架本身配对）

### 4.2 优先覆盖

- [ ] `stores/` — Zustand store 单元测试（数据流核心）
- [ ] `lib/` — 纯函数单元测试（buildGameStats, formatPlaytime 等）
- [ ] `middleware.ts` — 子域名路由逻辑测试
- [ ] Workers — API 端点基本测试

### 4.3 端到端（后续）

- [ ] Playwright 基础配置（已有 `.playwright/` 目录）
- [ ] 核心用户路径 E2E：访问首页 → 导航到 Game → 搜索游戏
- [ ] 核心用户路径 E2E：访问 Photo → 登录 → 查看地图

---

## 执行顺序

```
✅ P0.1 指令文件重写（CLAUDE.md + AGENTS.md）
✅ P0.2 同步纪律建立
✅ P1.1 Makefile 创建（make check 全量验证）
✅ P1.2 完成标准定义
⬇️ 当前
P3.1 创建 PROGRESS.md 模板
P3.3 会话交接协议（已写入 CLAUDE.md，待实际使用验证）
⬇️
P2.1 冷启动测试（验证指令文件是否足够）
P2.2 环境自描述
P1.3 错误消息面向 agent 设计
⬇️
P4.x 测试基础（长期基建）
```

---

## 参考来源

- OpenAI: Harness Engineering — 给地图不给说明书、执行不变量不微管实现
- Anthropic: Effective Harnesses for Long-Running Agents — 上下文焦虑、三 agent 架构
- WalkingLabs: Learn Harness Engineering — 五子系统模型、WIP=1、三层终止校验
