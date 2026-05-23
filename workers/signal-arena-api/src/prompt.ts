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

function parseDecision(value: unknown): AiDecision {
  if (!isRecord(value)) {
    throw new Error("AI decision JSON must be an object");
  }

  const candidates = arrayValue(value.candidates).map(parseCandidate);
  const watchlist = arrayValue(value.watchlist).map((item) => nonEmptyStringValue(item, "watchlist[]"));

  return {
    market_view: enumValue(value.market_view, MARKET_VIEWS, "market_view"),
    risk_level: enumValue(value.risk_level, RISK_LEVELS, "risk_level"),
    summary: nonEmptyStringValue(value.summary, "summary"),
    candidates,
    cash_plan: nonEmptyStringValue(value.cash_plan, "cash_plan"),
    watchlist
  };
}

export function buildDecisionPrompt(context: DecisionPromptContext): { system: string; user: string } {
  return {
    system: [
      "你是 Signal Arena 的模拟交易 Agent。",
      "目标是在严格风险控制下提升虚拟账户收益率。",
      "你只提供模拟交易决策，不提供真实投资建议。",
      "你必须只输出 JSON，不要输出 Markdown、代码块、解释性前后缀或额外文本。"
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "根据账户、持仓、市场信号和约束，提出本轮 A 股模拟交易候选动作。",
        output_schema: {
          market_view: "cautious|neutral|aggressive",
          risk_level: "low|medium|high",
          summary: "string",
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
          cash_plan: "string",
          watchlist: ["sh600519"]
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
