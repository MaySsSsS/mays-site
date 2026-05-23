# Signal Arena 行情终端与决策追踪设计

## 1. 背景

当前 `/signal-arena` 已经能展示公开总览、决策日志和竞技排名，但视觉更接近浅色纸面仪表盘，不够像股票行情终端。当前 AI 决策 prompt 也较轻，只要求模型给出候选动作 JSON，无法支撑“点击收益曲线点位后查看完整决策路线”的体验。

本次升级目标是把 Signal Arena 做成更像 A 股行情软件的公开只读看板，并补齐每次 AI Runner 决策后的收益曲线与可追溯决策详情。

主要参考来源：

- 项目现有 Signal Arena Worker、D1、KV 和公开页面实现。
- `/tools/style-prompt` 中更贴近该主题的 `Sci-Fi HUD`、`Industrial Design`、`Dark Mode` 风格。最终选择吸收其深色数据界面特点，但不采用过度科幻装饰。
- `https://signal.coze.com/skill.md` 对策场接口、交易规则、推荐决策循环和策略维度的说明。

## 2. 目标

- 将 `/signal-arena` 页面视觉升级为 A 股行情终端风：深色盘面、红涨绿跌、密集但克制的数据布局。
- 新增收益曲线，默认展示最近 7 天账户快照。
- 曲线支持 `7D / 30D / ALL` 范围切换。
- 曲线使用红涨绿跌分段线：相邻快照上升为红色，下降为绿色。
- 曲线点位支持 hover tooltip 和 click detail modal。
- 点击点位后展示该次 AI Runner 的公开决策链路。
- 升级 AI prompt，使每次决策输出可展示、可审计、可追溯的结构化 trace。
- 扩展 Worker 数据层，把每次 run 后的账户状态与决策 trace 保存下来。

## 3. 非目标

- 不做真实投资建议。
- 不做股票 K 线或 OHLC 蜡烛图。账户收益曲线不是单只股票行情，不能伪装成 K 线。
- 不在公开页面暴露 API key、原始 provider 响应、完整私密上游 payload 或敏感订单字段。
- 不一次性支持港股、美股交易决策。第一版继续以 A 股为主。
- 不引入新的图表库。项目已有 `echarts`，收益曲线使用 ECharts 实现。

## 4. 页面体验

### 4.1 总体视觉

页面从浅色纸面仪表盘改为深色行情终端：

- 背景：接近黑色的深灰，配细网格线。
- 卡片：低亮度深色面板，细边框，少阴影。
- 数字：使用等宽数字或 tabular numbers，方便快速扫描。
- 涨跌：A 股语义，红色表示上涨/盈利，绿色表示下跌/亏损。
- 信息密度：比当前页面更高，但保持留白，避免 Bloomberg 式过载。

默认页面结构：

1. 顶部状态栏：标题、更新时间、数据状态、默认范围切换。
2. 核心指标：总资产、累计收益率、当前排名、可用现金。
3. 收益曲线：页面主视觉。
4. A 股核心持仓：紧凑表格。
5. 最近 AI 动作：摘要卡片。
6. 市场分布：保留但视觉降级，不抢曲线主视图。

### 4.2 收益曲线

默认显示最近 `7D`：

- `7D`：显示较完整的点位交互，横轴保留更多日期/时间提示。
- `30D`：减少横轴标签，只显示关键日期。
- `ALL`：只显示关键月份/日期，必要时下采样渲染，但 hover 仍以原始点为准。

曲线规则：

- 每个点对应一次账户快照。
- 点与点之间比较 `returnRate`，如果相同则比较 `totalAssets`。
- 上升段红色。
- 下降段绿色。
- 默认不显示所有圆点，避免长期数据拥挤。
- hover 最近点时显示 tooltip。
- 点击点位打开决策详情弹窗。

Tooltip 内容：

- 快照时间。
- 总资产。
- 累计收益率。
- 较上次快照变化。
- 本轮状态：executed / held / blocked / skipped / failed。
- 本轮最终动作摘要。

### 4.3 决策详情弹窗

点击曲线点后打开 modal。弹窗展示与该快照绑定的 run 信息。

内容分区：

- 操作前账户状态：总资产、现金、收益率、排名、持仓数量。
- AI 决策路线：模型按步骤给出的判断链路。
- 市场判断：市场强弱、可交易机会、风险倾向。
- 持仓判断：止盈、止损、继续持有、加仓风险。
- 候选动作：每个候选动作的标的、方向、股数、优先级、置信度、理由。
- 被拒绝动作：被 AI 自己拒绝或被程序风控拦截的动作及原因。
- 最终动作：buy / sell / hold，以及是否实际提交订单。
- 执行结果：成交、排队、失败、跳过或 dry-run。
- 操作后快照：该点对应的总资产与收益率。

没有绑定 run 的历史点仍可点击，但弹窗显示“该快照没有可公开决策日志”，并只展示账户快照。

## 5. 数据模型

前端公共类型新增：

```ts
type SignalArenaEquityPoint = {
  id: string;
  runId: string | null;
  capturedAt: string;
  totalAssets: number;
  returnRate: number;
  currentRank: number | null;
  status: SignalArenaRunStatus | "snapshot";
  actionSummary: string | null;
};

type SignalArenaDecisionTrace = {
  beforeStateSummary: string;
  decisionRoute: string[];
  marketAssessment: string[];
  portfolioAssessment: string[];
  rejectedActions: Array<{
    symbol: string;
    action: SignalArenaActionType;
    shares: number;
    reason: string;
  }>;
  publicExplanation: string;
};
```

`SignalArenaRunLog` 扩展：

- `beforeState`
- `decisionTrace`
- `cashPlan`
- `watchlist`
- `afterSnapshot`

`SignalArenaPublicData` 扩展：

- `equityHistory: SignalArenaEquityPoint[]`

Worker D1 扩展：

- 继续使用已有 `signal_arena_snapshots` 表保存公开快照。
- 给 `signal_arena_runs` 增加 `before_state_json`、`decision_trace_json`、`after_snapshot_json` 字段。
- 给 `signal_arena_snapshots` 增加 `run_id` 字段，便于曲线点和 run modal 互相跳转。

## 6. Worker 数据流

每次 Runner 执行：

1. 判断交易时段。非交易时段仍记录 skipped run，但不调用 AI。
2. 交易时段内拉取决策上下文：
   - `/api/v1/arena/home`
   - `/api/v1/arena/portfolio`
   - `/api/v1/arena/trades`
   - `/api/v1/arena/top-movers`
   - `/api/v1/arena/snapshots`
3. 根据需要对候选标的拉取 `/api/v1/arena/stock-history`。
4. 构造增强版 prompt。
5. 调用 strict AI model。
6. 解析结构化 JSON。
7. 程序风控二次校验。
8. 最多提交一笔交易。
9. 保存 run log、decision trace 和账户快照。
10. 更新 KV `public:all` 缓存。

公开 API `/api/public/all` 返回：

- dashboard
- logs
- rank
- recentTrades
- equityHistory

## 7. Prompt 升级

### 7.1 System Prompt

新版 system prompt：

```text
你是 Signal Arena 的 A 股模拟交易 Agent。
目标是在严格风险控制下提升虚拟账户长期收益率，而不是追求单次高风险收益。
你必须基于输入数据做决策，不得编造未提供的行情、新闻或财务信息。
你只输出 JSON，不输出 Markdown、代码块或额外解释。
你的决策会被公开展示，因此每个动作必须有清晰、可追溯、可审计的理由。
```

### 7.2 User Payload

新版 user payload 使用 JSON：

```json
{
  "task": "根据账户状态、持仓、近期交易、资产快照、市场涨跌榜和交易规则，完成本轮 A 股模拟交易决策。",
  "decision_process": [
    "总结操作前账户状态",
    "评估当前仓位风险和现金安全垫",
    "检查持仓中需要止盈、止损或继续持有的标的",
    "结合市场涨跌榜判断是否有强势机会",
    "应用交易规则和风控约束",
    "给出最多一个最终可执行动作"
  ],
  "strategy_rules": [
    "A 股买卖必须是 100 股整数倍",
    "每轮最多执行一笔订单",
    "买入后至少保留 20% 现金",
    "单只股票目标仓位不得超过总资产 20%",
    "盈利超过 15% 可以考虑部分止盈",
    "亏损超过 8% 必须评估是否止损",
    "如果数据不足或没有高置信机会，优先 hold"
  ],
  "output_schema": {
    "market_view": "cautious|neutral|aggressive",
    "risk_level": "low|medium|high",
    "before_state_summary": "string",
    "decision_route": ["string"],
    "market_assessment": ["string"],
    "portfolio_assessment": ["string"],
    "candidates": [
      {
        "symbol": "sh600519",
        "action": "buy|sell|hold",
        "shares": 100,
        "priority": 1,
        "confidence": 0.7,
        "reason": "string"
      }
    ],
    "rejected_actions": [
      {
        "symbol": "sh600519",
        "action": "buy|sell|hold",
        "shares": 100,
        "reason": "string"
      }
    ],
    "final_action": {
      "symbol": "sh600519",
      "action": "buy|sell|hold",
      "shares": 100,
      "reason": "string"
    },
    "cash_plan": "string",
    "watchlist": ["sh600519"],
    "public_explanation": "string"
  },
  "context": {}
}
```

如果不应交易，`final_action` 可以为 `null`，但必须解释原因。

### 7.3 Prompt Guardrails

- 不允许模型选择非 A 股标的。
- 不允许模型要求超过 1 笔最终订单。
- 不允许模型绕过现金、仓位、T+1、100 股整数倍等规则。
- 模型输出只是候选，程序风控仍是最终下单 gate。
- JSON parse 失败时不下单，记录 failed run。

## 8. 前端组件

新增或调整组件：

- `SignalArenaDashboard`
  - 重排为行情终端布局。
- `SignalArenaEquityChart`
  - client component。
  - 使用 ECharts。
  - 支持 `7D / 30D / ALL`。
  - 渲染红绿分段线。
  - 处理 hover tooltip 和 click point。
- `SignalArenaDecisionModal`
  - client component。
  - 展示点位对应 run 的决策详情。
- `SignalArenaMetricStrip`
  - 复用核心指标行。

页面保持公开只读，不需要登录。

## 9. 错误与空态

- 没有历史快照：显示当前总资产的单点状态和“等待下一次 Runner 快照”。
- 快照没有 run：曲线仍展示，modal 只展示账户快照。
- AI provider 失败：不下单，保存 failed run，曲线点展示失败状态。
- 上游不可用：前端继续显示 stale cache，并在页面状态栏标记 stale。
- ECharts 加载失败：显示简化表格版历史点列表。

## 10. 测试计划

Worker tests：

- Prompt builder 包含增强字段、策略规则和 JSON schema。
- Prompt parser 校验 `decision_route`、`rejected_actions`、`public_explanation`。
- Runner 在交易时段后写入 run log 和 equity snapshot。
- Public data sanitizer 不泄露 private fields。
- `/api/public/all` 返回 `equityHistory`，并按 `capturedAt` 从旧到新稳定输出，方便曲线直接渲染。

Frontend tests：

- Signal Arena public types 包含 `equityHistory` 和 `decisionTrace`。
- Dashboard 引入 `SignalArenaEquityChart`。
- Chart 默认范围为 `7D`。
- Chart 支持 `7D / 30D / ALL` 文案。
- Decision modal 包含操作前状态、决策路线、候选动作、风控结果、执行结果。
- 页面不引用 secret env。

Manual verification：

- 本地 `/signal-arena` 能看到深色行情终端视觉。
- 默认显示 7D 曲线。
- hover 曲线点显示 tooltip。
- 点击点打开弹窗。
- 30D 和 ALL 不出现横轴文字严重重叠。
- 移动端曲线和表格不溢出。

## 11. 部署与迁移

第一步先完成代码和本地 fallback 数据，保证无线上数据时页面可渲染。

Worker 部署时需要：

- D1 migration 增加必要字段或新表。
- Wrangler 部署 Worker。
- 前端部署读取新 public API shape。

如果线上已有旧缓存，sanitizer 要兼容缺少 `equityHistory` 和 `decisionTrace` 的旧数据，并回退为空数组或 null。

## 12. 已确认决策

- 默认范围：`7D`。
- 可选范围：`7D / 30D / ALL`。
- 曲线颜色：A 股红涨绿跌分段线。
- 不做柱状图。
- 不做 K 线。
- 点击曲线点打开 AI 决策详情弹窗。
- Prompt 需要升级为可公开审计的交易决策链路 prompt。
