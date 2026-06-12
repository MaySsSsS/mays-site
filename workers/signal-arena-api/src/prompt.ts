import type { AiDecision, DecisionPromptContext } from "./types";

const MARKET_VIEWS = new Set<AiDecision["market_view"]>(["cautious", "neutral", "aggressive"]);
const RISK_LEVELS = new Set<AiDecision["risk_level"]>(["low", "medium", "high"]);
const ACTIONS = new Set<AiDecision["candidates"][number]["action"]>(["buy", "sell", "hold"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nonEmptyStringValue(value: unknown, field: string): string {
  const result = stringValue(value).trim();
  if (!result) {
    throw new Error(`AI decision JSON is missing ${field}`);
  }

  return result;
}

function numberValue(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`AI decision JSON field ${field} must be a number`);
  }

  return value;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArrayValue(value: unknown): string[] {
  return arrayValue(value)
    .map((item) => stringValue(item).trim())
    .filter((item) => item.length > 0);
}

function enumValue<T extends string>(value: unknown, values: Set<T>, field: string): T {
  if (typeof value !== "string" || !values.has(value as T)) {
    throw new Error(`AI decision JSON field ${field} is invalid`);
  }

  return value as T;
}

function parseCandidate(value: unknown): AiDecision["candidates"][number] {
  const record = isRecord(value) ? value : {};

  return {
    symbol: nonEmptyStringValue(record.symbol, "candidates[].symbol"),
    action: enumValue(record.action, ACTIONS, "candidates[].action"),
    shares: numberValue(record.shares, "candidates[].shares"),
    priority: numberValue(record.priority, "candidates[].priority"),
    confidence: numberValue(record.confidence, "candidates[].confidence"),
    reason: nonEmptyStringValue(record.reason, "candidates[].reason")
  };
}

function parseRejectedAction(value: unknown): AiDecision["rejected_actions"][number] {
  const record = isRecord(value) ? value : {};

  return {
    symbol: nonEmptyStringValue(record.symbol, "rejected_actions[].symbol"),
    action: enumValue(record.action, ACTIONS, "rejected_actions[].action"),
    shares: numberValue(record.shares, "rejected_actions[].shares"),
    reason: nonEmptyStringValue(record.reason, "rejected_actions[].reason")
  };
}

function parseNullableCandidate(value: unknown): AiDecision["final_action"] {
  return isRecord(value) ? parseCandidate(value) : null;
}

function parseDecision(value: unknown): AiDecision {
  if (!isRecord(value)) {
    throw new Error("AI decision JSON must be an object");
  }

  const candidates = arrayValue(value.candidates).map(parseCandidate);
  const watchlist = stringArrayValue(value.watchlist);
  const summary = nonEmptyStringValue(value.summary, "summary");

  return {
    market_view: enumValue(value.market_view, MARKET_VIEWS, "market_view"),
    risk_level: enumValue(value.risk_level, RISK_LEVELS, "risk_level"),
    summary,
    before_state_summary: stringValue(value.before_state_summary).trim() || summary,
    decision_route: stringArrayValue(value.decision_route),
    market_assessment: stringArrayValue(value.market_assessment),
    portfolio_assessment: stringArrayValue(value.portfolio_assessment),
    candidates,
    rejected_actions: arrayValue(value.rejected_actions).map(parseRejectedAction),
    final_action: parseNullableCandidate(value.final_action),
    cash_plan: nonEmptyStringValue(value.cash_plan, "cash_plan"),
    watchlist,
    public_explanation: stringValue(value.public_explanation).trim() || summary
  };
}

export function buildDecisionPrompt(context: DecisionPromptContext): { system: string; user: string } {
  return {
    system: [
      "你是 Signal Arena 的 A 股模拟交易 Agent。",
      "目标是在严格风险控制下提升虚拟账户长期收益率，而不是追求单次高风险收益。",
      "你必须基于输入数据做决策，不得编造未提供的行情、新闻或财务信息。",
      "你只输出 JSON，不输出 Markdown、代码块或额外解释。",
      "你的决策会被公开展示，因此每个动作必须有清晰、可追溯、可审计的理由。"
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "根据账户、持仓、市场信号和约束，提出本轮 A 股模拟交易候选动作。",
        decision_process: [
          "1. 复盘操作前账户状态，包括现金、总资产、收益率、排名和持仓集中度。",
          "2. 判断市场状态和可交易信号，只使用输入里提供的前置信号、行情、涨跌幅、交易记录和快照。",
          "3. 检查现有持仓是否触发止盈、止损、减仓或继续持有条件。",
          "4. 生成候选动作，并说明被放弃动作的原因。",
          "5. 在候选动作中选择一个最终动作；如果没有足够置信度，final_action 必须为 null。",
          "6. 输出可公开展示的解释，避免泄露密钥、私有 token 或内部系统细节。"
        ],
        strategy_rules: [
          "只交易 A 股标的，买卖股数必须是 100 的整数倍。",
          "卖出动作必须小于或等于对应持仓的 availableShares；availableShares 为 0 时不要给 sell final_action。",
          "signals 是前置信号，用来提示可审计的市场机会或风险，不是强制交易指令。",
          "单一持仓不应过度集中，现金不足或置信度不足时优先持有。",
          "不要为了交易而交易；没有明确胜率时保持现金和观察名单。",
          "风险等级 high 时必须给出更保守的 final_action 或 null。"
        ],
        output_schema: {
          market_view: "cautious|neutral|aggressive",
          risk_level: "low|medium|high",
          summary: "string",
          before_state_summary: "string",
          decision_route: ["string"],
          market_assessment: ["string"],
          portfolio_assessment: ["string"],
          candidates: [
            {
              symbol: "sh600519",
              action: "buy|sell|hold",
              shares: 100,
              priority: 1,
              confidence: 0.7,
              reason: "string"
            }
          ],
          rejected_actions: [
            {
              symbol: "sh600519",
              action: "buy|sell|hold",
              shares: 100,
              reason: "string"
            }
          ],
          final_action: {
            symbol: "sh600519",
            action: "buy|sell|hold",
            shares: 100,
            priority: 1,
            confidence: 0.7,
            reason: "string"
          },
          cash_plan: "string",
          watchlist: ["sh600519"],
          public_explanation: "string"
        },
        context
      },
      null,
      2
    )
  };
}

export function extractDecisionJson(text: string): AiDecision {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI decision JSON not found");
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
  return parseDecision(parsed);
}
