# Signal Arena 历史回填本地融合设计

## 1. 目标

把 WorkBuddy `automation-7` 的历史运行记录回填到本地 `/signal-arena` 页面，用来补足收益曲线和日志时间线。回填数据只能作为“历史导入 / 文本解析”层展示，不覆盖现有实时 Runner 的总览、持仓和最新状态。

## 2. 范围

- 新增本地解析脚本，从 `~/.workbuddy/workbuddy.db` 读取 `automation_runs`。
- 输出清洗后的 `public/data/signal-arena/history.json`。
- Next.js server data client 读取远端公开 Worker 数据后，和本地历史 JSON 合并。
- 页面显示来源标识：`实时 Runner`、`历史导入`、`文本解析`。
- 收益曲线、日志页、运行状态计数都能包含历史记录。
- 点击历史曲线点时，弹窗显示历史报告摘要，而不是伪装成完整实时决策 trace。

## 3. 非目标

- 不把历史数据写入线上 D1。
- 不部署前端或 Worker。
- 不展示原始 `runs_json`、本地路径、工具调用、agent 内部推理、API key、请求头或 order id。
- 不把 pending / attempted 操作声明为已成交，除非历史文本明确说“成交/执行成功”。
- 不尝试重建完整候选池、订单结果或精确 before/after 状态。

## 4. 数据模型

公共类型新增可选字段：

- `source`: `live` | `imported`
- `sourceLabel`: 展示文案，例如 `实时 Runner` 或 `历史导入`
- `confidence`: `high` | `medium` | `low`
- `rawSummary`: 清洗后的历史报告摘要，只允许出现在公开摘要字段中

这些字段可出现在：

- `SignalArenaEquityPoint`
- `SignalArenaRunLog`

历史导入日志使用现有 `SignalArenaRunLog` 形状填充：

- `status`: 成功且有操作用 `executed`，成功无交易用 `held`，失败用 `failed`
- `trigger`: `cron`
- `marketView`: 从“市场状态”文本解析
- `summary`: 从“今日操作/操作”文本解析
- `decisionTrace`: 只填公开摘要、市场状态、持仓摘要、文本解析路线
- `riskResult`: 文本解析默认 `allowed=false`，原因写明“历史文本解析，不含程序风控结果”
- `beforeState` / `afterSnapshot`: 只填能解析出的总资产、现金、收益率、排名，缺失现金时为 0

## 5. 数据流

1. `scripts/sync-signal-arena-history.mjs` 查询：
   `SELECT created_at, result_success, runs_json FROM automation_runs WHERE automation_id=? ORDER BY created_at ASC`
2. 每条记录从 `runs_json[0].output` 提取公开报告文本。
3. 解析：
   - 时间：优先 `created_at`
   - 排名：`排名: X/Y`
   - 总值：`总值: ¥XX万`
   - 收益率：`收益率: ±XX%`
   - 市场状态
   - 今日操作 / 操作
   - 持仓
   - 现金
4. 生成：
   - `logs`: 最多保留 200 条，按新到旧展示
   - `equityHistory`: 只保留有总资产和收益率的点，按旧到新展示
   - `meta`: 总条数、可解析条数、生成时间、时间范围
5. `lib/signal-arena-data.ts` 读取 `history.json`，与实时数据合并：
   - dashboard / rank 保持实时数据
   - logs 去重后按时间倒序合并
   - equityHistory 去重后按时间升序合并
   - operations 重新计算计数和覆盖天数

## 6. 页面规则

- 图表 tooltip 显示来源和置信度。
- 日志列表增加来源筛选：全部 / 实时 / 历史。
- 日志卡片显示来源徽标。
- 历史弹窗标题仍用点位时间，但 eyebrow 显示 `HISTORICAL REPORT`。
- 历史弹窗保留账户快照、文本解析路线、市场/组合摘要、最终操作摘要。
- 如果某条历史记录没有完整字段，页面显示“历史文本未包含该字段”，不补编。

## 7. 测试

- `scripts/signal-arena-history.test.mjs` 覆盖解析函数：
  - 能从典型报告解析资产、收益率、排名、市场、操作、持仓。
  - 能去除本地路径、API key 字样和工具噪声。
  - 失败记录会生成 `failed` 日志但不会生成曲线点。
- `scripts/signal-arena-layout.test.mjs` 覆盖前端契约：
  - 类型包含来源字段。
  - sanitizer 白名单复制来源字段。
  - data client 合并本地历史。
  - 日志 UI 有来源筛选。
  - 弹窗有历史报告摘要入口。

## 8. 本地验收

- 运行 `pnpm test:signal-arena`
- 运行 `node scripts/signal-arena-history.test.mjs`
- 运行 `node scripts/sync-signal-arena-history.mjs`
- 确认 `public/data/signal-arena/history.json` 生成且不含敏感原始内容。
- 运行 `pnpm typecheck && pnpm lint && pnpm build`
- 本地打开 `/signal-arena` 和 `/signal-arena/logs`，确认历史曲线和日志融合正常。
