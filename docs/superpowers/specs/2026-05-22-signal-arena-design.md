# Signal Arena 公开看板与云端 AI Trader Runner 设计

日期：2026-05-22  
状态：已确认方向，待 implementation plan  
目标路由：`/signal-arena`、`/signal-arena/logs`、`/signal-arena/rank`

## 1. 背景

用户已经有一个本地 Codex App 定时任务，用于盯盘 A 股并进行模拟 AI 炒股。现在希望把这个能力扩展到个人站点：

1. 在 `maysssss.cn` 新增公开只读页面，用于查看炒股进度。
2. 将本地依赖的交易 Agent 迁移到云端 Runner，让电脑断网或关机时也能继续运行。
3. 使用 Signal Arena｜策场接口作为账户、行情、交易和排行榜数据源。

策场接口基础能力包括：

- `GET /api/v1/arena/home`
- `GET /api/v1/arena/portfolio`
- `GET /api/v1/arena/trades`
- `GET /api/v1/arena/snapshots`
- `GET /api/v1/arena/leaderboard`
- `GET /api/v1/arena/top-movers`
- `POST /api/v1/arena/trade`

所有认证请求使用 `agent-auth-api-key` header。密钥只允许存在于服务端 secret 中，不写入仓库、不进入浏览器。

## 2. 产品范围

### 2.1 页面范围

新增 `SIGNAL ARENA` 分区，公开访问，只读展示。

- `/signal-arena`：总览 Dashboard。展示总资产、收益率、排名、现金、冻结资金、最后更新时间、A 股核心持仓、最近动作、港股/美股轻量概览。
- `/signal-arena/logs`：AI 决策日志。展示每轮 Runner 的市场判断、候选动作、风控结果、实际下单结果、被拦截原因。
- `/signal-arena/rank`：竞技排名 Scoreboard。展示排行榜、当前 Agent 附近对手、与第一名差距、收益率位置。

首页 `MAYS UNIVERSE` 新增一个真实入口卡片：

- eyebrow：`ARENA`
- title：`SIGNAL ARENA`
- href：`/signal-arena`

必须保留现有 `CLASSIFIED / 未完待续` sealed panel。

### 2.2 Runner 范围

新增云端 AI Trader Runner：

- 第一版只允许交易 A 股。
- 港股和美股只做账户概览或观察信号，不自动下单。
- A 股交易时段内每 15 分钟触发一次。
- 同一时间只允许一个 Runner 实例执行。
- 每轮 AI 可提出多条候选动作，但程序风控最多放行 1 笔订单。

### 2.3 非目标

- 不做真实证券交易。
- 不在页面提供手动买入、卖出或调仓按钮。
- 不把 API key、模型 key、内部推理过程或完整上游响应暴露给浏览器。
- 第一版不追求三市场自动交易。
- 第一版不做高并发决策；账户级交易必须串行执行。

## 3. 数据架构

公开页面使用“服务端实时读取 + 短缓存”的方式。

浏览器访问 `/signal-arena` 时，Next.js 服务端读取策场接口并生成公开 snapshot。服务端缓存 60-180 秒，缓存命中时直接返回最近 snapshot，缓存过期才重新请求上游。这个方案避免了 AI Daily 那种“更新数据必须重新部署前端”的问题。

页面数据分两类：

1. 策场实时状态：从 `arena/home`、`portfolio`、`trades`、`snapshots`、`leaderboard` 等接口读取，短缓存后渲染。
2. Runner 决策日志：由云端 Runner 写入持久化存储，页面读取最近记录和历史记录。

推荐存储：

- D1：保存 Runner runs、AI decisions、risk checks、executed orders、rank snapshots。
- 可选 KV：保存最新 public snapshot，用于快速读取和上游失败兜底。

第一版页面如果存储为空，也必须能展示账户实时状态和空日志状态。

## 4. Runner 架构

部署目标优先选择 Cloudflare Cron Worker，因为当前站点已经在 Cloudflare 体系内。

Cron 配置采用 UTC，并在 Worker 内部用 `Asia/Shanghai` 判断 A 股交易时段：

- 工作日 09:30-11:30
- 工作日 13:00-15:00

实现上可以让 Cron 在北京时间交易相关小时每 15 分钟触发一次，Runner 内部再做精确交易时段 gate。遇到周末、午休、非交易时段、上游返回 `market_closed` 时，只记录 skipped run，不调用 AI、不下单。

每轮执行流程：

1. 获取执行锁；如果已有未过期 running lock，跳过本轮。
2. 拉取 `arena/home`、`portfolio`、`trades`、`top-movers?market=CN`。
3. 对当前持仓和候选标的补充有限数量的 `stock-history`。
4. 组装结构化决策上下文。
5. 调用严格决策模型。
6. 解析结构化 JSON 决策。
7. 执行程序风控。
8. 若有合法动作，提交 `POST /api/v1/arena/trade`。
9. 写入 run、decision、risk、order 日志。
10. 释放锁。

如果 Cloudflare Worker 因 `xhigh` 模型调用超时或运行限制不稳定，后续可把同一套 Runner 脚本迁移到 GitHub Actions 或其他服务器执行。迁移不改变页面、prompt、风控和存储 schema。

## 5. AI Provider 与模型分层

AI 层使用自定义 OpenAI-compatible Responses provider。密钥和端点通过 secret/env 注入，不写明文。

建议环境变量：

```env
SIGNAL_ARENA_AGENT_API_KEY=<secret>
SIGNAL_ARENA_AI_PROVIDER=custom-responses
SIGNAL_ARENA_AI_BASE_URL=<secret-or-var>
SIGNAL_ARENA_AI_API_KEY=<secret>
SIGNAL_ARENA_AI_STRICT_MODEL=gpt-5.5
SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT=xhigh
SIGNAL_ARENA_AI_LIGHT_MODEL=gpt-5.4
SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT=low
SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE=true
```

模型分层：

- 严格决策链路：`gpt-5.5` + `xhigh`。只用于交易判断和候选动作生成。
- 轻量辅助链路：`gpt-5.4` + `low`。只用于非关键任务，例如日志标题、公开摘要、UI 文案式总结。

第一版不启用并发 review model。交易安全由程序风控兜底，而不是依赖第二个模型投票。

## 6. Prompt 与结构化输出

Runner 不把接口原文直接丢给模型，而是先整理成固定 JSON：

- 账户状态：总资产、现金、冻结资金、收益率、排名。
- A 股持仓：代码、名称、成本、现价、盈亏、仓位占比、可卖数量。
- 最近交易：订单方向、股数、成交状态、理由。
- A 股市场信号：top movers、持仓相关历史摘要。
- 规则约束：T+1、100 股整数倍、单股仓位上限、现金储备、每轮最多执行 1 笔。

严格模型必须返回 JSON，不允许自由文本作为执行依据。目标结构：

```json
{
  "market_view": "cautious|neutral|aggressive",
  "risk_level": "low|medium|high",
  "summary": "本轮判断摘要",
  "candidates": [
    {
      "symbol": "sh600519",
      "action": "buy|sell|hold",
      "shares": 100,
      "priority": 1,
      "confidence": 0.72,
      "reason": "结构化交易理由"
    }
  ],
  "cash_plan": "现金管理说明",
  "watchlist": ["sh600519"]
}
```

程序只读取 `candidates`，并在风控通过后执行最高优先级的一条合法交易。`hold` 和非法动作只记录，不下单。

## 7. 风控规则

第一版硬性风控：

- 只允许 A 股代码：`sh` 或 `sz` + 6 位数字。
- 买入和卖出股数必须是 100 的整数倍。
- 单轮最多执行 1 笔订单。
- 单只股票目标仓位不超过总资产 20%。
- 保留至少 20% 现金，除非卖出。
- 卖出数量不得超过可卖数量。
- A 股 T+1 限制：当天买入不可卖时必须拦截。
- 非 A 股交易时段不下单。
- 上游返回 `market_closed` 时不重试下单。
- 模型输出 JSON 解析失败、字段缺失、理由为空时不下单。

所有被拦截的建议都要写入日志，供 `/signal-arena/logs` 查看。

## 8. 页面体验

视觉上应延续 `MAYS UNIVERSE` 的强入口感，但 Signal Arena 内页更偏交易仪表盘：信息密度高、结构清楚、少装饰。

`/signal-arena` 首屏：

- 总资产
- 收益率
- 当前排名
- 可用现金
- 最后更新时间
- Runner 状态
- A 股核心持仓表
- 最近一轮 AI 动作

`/signal-arena/logs`：

- 按时间倒序展示 Runner run。
- 每条记录包含：触发时间、市场状态、AI 摘要、候选动作、风控结果、订单结果。
- 用状态标识区分：executed、held、blocked、skipped、failed。

`/signal-arena/rank`：

- 当前排名和收益率。
- 排行榜前列。
- 当前 Agent 附近名次。
- 与第一名差距。

页面必须明确显示数据更新时间。上游失败时，展示最近缓存时间和错误状态，不显示密钥相关信息。

## 9. 错误处理

- 策场读取失败：页面展示 stale cache 或错误空态。
- AI provider 失败：Runner 不下单，记录 failed run。
- AI JSON 无法解析：Runner 不下单，记录 parse failure。
- 风控拦截：Runner 不下单，记录 blocked reason。
- 下单接口失败：记录 order failure，不做无限重试。
- 锁冲突：记录 skipped run，避免并发交易。

## 10. 测试与验证

实现阶段需要补充：

- Provider 配置测试：确认 key 不进入 public bundle、日志或静态数据。
- Prompt schema 测试：模型输出解析只接受合法 JSON。
- 风控单元测试：A 股代码、100 股整数倍、现金、仓位、可卖数量、T+1、每轮最多 1 笔。
- Runner dry-run 测试：可在不真实下单的情况下生成 run log。
- 页面渲染测试：三个路由能在空数据、正常数据、错误数据下渲染。
- Portal 回归测试：新增 `SIGNAL ARENA` 后仍保留 `CLASSIFIED / 未完待续`。
- 项目验证：`pnpm typecheck`、`pnpm lint`、`pnpm build`。

## 11. 待实施顺序

1. 定义类型和公共 snapshot schema。
2. 实现 Signal Arena 服务端 API 客户端和短缓存。
3. 实现三条公开页面路由和首页入口。
4. 实现 Runner 存储 schema 与日志读取。
5. 实现 AI provider、prompt、结构化解析。
6. 实现 A 股风控与 dry-run。
7. 接入 Cloudflare Cron Worker。
8. 配置 secrets 并做一次手动 dry-run。
9. 部署并观察首个交易时段运行。

## 12. 已确认决策

- 页面公开访问。
- 页面只读，不提供手动交易入口。
- 分区名使用 `SIGNAL ARENA`。
- 首页新增真实入口，不替换 sealed panel。
- 三个页面分开：Dashboard、Logs、Rank。
- Runner 第一版只交易 A 股。
- Runner A 股交易时段每 15 分钟运行。
- AI provider 使用自定义 Responses provider。
- 严格交易决策用 `gpt-5.5` + `xhigh`。
- 非关键摘要可用 `gpt-5.4` + `low`。
- 第一版不做并发 AI 决策，不启用并发 review model。
