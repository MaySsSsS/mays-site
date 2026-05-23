# Signal Arena 运营可靠性与看盘体验优化设计

## 1. 背景

`/signal-arena` 已经完成行情终端视觉、收益曲线、决策弹窗、D1 快照和增强 AI prompt。下一阶段最值得做的不是继续扩大交易能力，而是让这个公开页更像一个可以长期离线观察的“运行状态中心”。

当前仍有几个使用层面的缝隙：

- 公开页能看到最新资产，但很难一眼判断 Runner 是否健康、数据是否新鲜、曲线覆盖了几天。
- 日志页随数据增多会变成长列表，缺少按状态筛选和摘要统计。
- 收益曲线在历史点不足、点位很密或旧缓存数据不完整时，需要更稳定的降级体验。
- Worker 公开 API 已经做了 sanitizer，但没有给前端直接可用的公开 `operations` 状态对象。

本次优化把 Signal Arena 从“能看结果”推进到“能看运行是否可靠”。

## 2. 目标

- 在公开 API 中新增 `operations` 对象，展示不含 secrets 的运行状态。
- 在 `/signal-arena` 总览页新增运营状态面板，显示数据新鲜度、最近 Runner、快照覆盖、曲线点数和观察结论。
- 在 `/signal-arena/logs` 新增日志摘要与状态筛选。
- 增强收益曲线空历史和单点历史体验，避免历史不足时用户误以为图表坏了。
- 补充测试，锁定公开 API 不泄露敏感字段，且旧缓存仍兼容。

## 3. 非目标

- 不新增公开手动触发交易按钮。
- 不改变 AI provider、模型、推理强度或下单规则。
- 不引入新数据库表。
- 不把 admin token、API key、上游原始响应、订单 id 等敏感内容暴露到公开 API。
- 不改首页、AI Daily、Tools、Game、Photos 页面。

## 4. 用户体验

### 4.1 总览页运营状态面板

在收益曲线下方、核心指标上方新增 `运行状态` 面板。面板使用当前深色行情终端风格，采用紧凑指标行。

显示字段：

- 数据状态：`live / stale / fallback / error`，沿用 dashboard 的 sourceStatus。
- 数据年龄：当前时间与 `dashboard.updatedAt` 的差值，展示为 `刚刚 / N 分钟前 / N 小时前`。
- 最近 Runner：状态、触发方式、完成时间。
- 最近可执行结果：如果最新 run 是 `executed / held / blocked / skipped / failed`，用中文文案解释。
- 快照覆盖：收益曲线最早点到最新点的跨度。
- 快照点数：`equityHistory.length`。
- 日志点数：公开 logs 数量。

运营结论规则：

- `healthy`：sourceStatus 为 `live`，数据年龄不超过 15 分钟，且 API 有 dashboard 数据。
- `watch`：sourceStatus 为 `stale`，或数据年龄超过 15 分钟但不超过 2 小时。
- `quiet`：最新 run 是 `skipped` 且摘要包含非交易时段。
- `attention`：sourceStatus 为 `fallback/error`，或最新 run 是 `failed`。

前端展示不使用夸张告警，只用 `正常 / 观察 / 休市 / 注意` 四个标签。

### 4.2 日志页摘要与筛选

日志页顶部新增摘要条：

- 全部日志数。
- 已执行/持有数量。
- 被拦截数量。
- 跳过数量。
- 失败数量。

新增状态筛选按钮：

- `全部`
- `执行/持有`
- `拦截`
- `跳过`
- `失败`

筛选仅在客户端完成，不请求新接口。默认显示全部。筛选后如果没有日志，展示空态文案。

### 4.3 收益曲线韧性

收益曲线保留 `7D / 30D / ALL`。新增行为：

- 没有 equityHistory 时，用当前 dashboard 生成一个临时展示点。
- 只有一个点时，图表区域点击即可打开快照弹窗。
- 有多个点时继续使用 ECharts 点位点击。
- 面板文案明确“曲线会随 Runner 快照累积变长”，避免用户误解历史少是错误。

## 5. 数据模型

前端公共类型新增：

```ts
export type SignalArenaOperationsTone = "healthy" | "watch" | "quiet" | "attention";

export type SignalArenaOperations = {
  tone: SignalArenaOperationsTone;
  label: string;
  dataAgeSeconds: number | null;
  latestRunStatus: SignalArenaRunStatus | null;
  latestRunFinishedAt: string | null;
  latestRunSummary: string | null;
  equityPointCount: number;
  equityCoverageDays: number;
  logCount: number;
};
```

`SignalArenaPublicData` 新增：

```ts
operations: SignalArenaOperations;
```

Worker 内部 public-data 生成 `operations`，前端 sanitizer 也会白名单复制该对象。旧 KV 缓存没有 `operations` 时，前端 sanitizer 基于 dashboard/logs/equityHistory 生成安全默认值。

## 6. Worker 数据流

`getPublicData` 在合并 cached/upstream data、D1 runs 和 D1 snapshots 后生成 `operations`。

生成逻辑只依赖已经公开的数据：

- `dashboard.updatedAt`
- `dashboard.sourceStatus`
- `dashboard.latestRun`
- `logs`
- `equityHistory`

因此不会新增上游请求，也不会增加交易风险。

## 7. 前端组件

新增组件：

- `components/signal-arena/SignalArenaOperationsPanel.tsx`
  - 只负责渲染 operations。
  - 接受 `operations` 和 `dashboard`，不直接拉数据。

修改组件：

- `SignalArenaDashboard.tsx`
  - 接受 `operations`。
  - 在曲线和核心指标之间渲染运营状态面板。

- `SignalArenaLogs.tsx`
  - 改为 client component。
  - 增加摘要统计、筛选按钮和筛选空态。

- `SignalArenaEquityChart.tsx`
  - 文案更新为“快照会随 Runner 累积”。
  - 保持单点点击兜底。

CSS 仍使用 `styles/signal-arena.module.css`，不引入 Tailwind 或全局 CSS。

## 8. 测试

新增或扩展现有测试：

- `scripts/signal-arena-layout.test.mjs`
  - 断言 public types 暴露 `SignalArenaOperations`。
  - 断言 sanitizer 白名单复制 operations。
  - 断言 dashboard 使用 `SignalArenaOperationsPanel`。
  - 断言 logs 有筛选按钮文案。

- `workers/signal-arena-api/src/public-data.test.ts`
  - 断言 public data 返回 operations。
  - 断言 operations 不包含 secret/order id。
  - 断言旧 cache 没有 operations 时仍能生成默认 operations。

验证命令：

- `pnpm test:signal-arena`
- `pnpm test:signal-arena-worker`
- `pnpm typecheck`
- `pnpm --dir workers/signal-arena-api typecheck`
- `pnpm lint`
- `pnpm build`

## 9. 部署

部署顺序：

1. 运行完整验证。
2. 部署 Signal Arena API Worker。
3. 推送 `main` 触发前端部署。
4. 验证 `https://signal-arena-api.maysssss.cn/api/public/all` 返回 `operations`。
5. 验证 `https://maysssss.cn/signal-arena` 页面包含运行状态面板。

## 10. 自检

- 无新增交易能力。
- 无新增 secret 暴露面。
- 变更范围只在 Signal Arena。
- 旧缓存兼容。
- 前端空历史不空屏。
- 日志数据增多后仍可快速筛选。
