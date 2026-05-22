import type {
  SignalArenaActionType,
  SignalArenaCandidateAction,
  SignalArenaDashboard,
  SignalArenaHolding,
  SignalArenaMarket,
  SignalArenaMarketSummary,
  SignalArenaMetric,
  SignalArenaPublicData,
  SignalArenaRank,
  SignalArenaRankEntry,
  SignalArenaRunLog,
  SignalArenaRunStatus
} from "@/types/signal-arena";

const MARKETS = new Set<SignalArenaMarket>(["CN", "HK", "US"]);
const RUN_STATUSES = new Set<SignalArenaRunStatus>(["executed", "held", "blocked", "skipped", "failed"]);
const ACTION_TYPES = new Set<SignalArenaActionType>(["buy", "sell", "hold"]);
const METRIC_TONES = new Set<SignalArenaMetric["tone"]>(["neutral", "positive", "negative", "warning"]);
const RISK_LEVELS = new Set<SignalArenaRunLog["riskLevel"]>(["low", "medium", "high", "unknown"]);
const SOURCE_STATUSES = new Set<SignalArenaDashboard["sourceStatus"]>(["live", "stale", "fallback", "error"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function enumValue<T extends string>(value: unknown, options: Set<T>, fallback: T): T {
  return typeof value === "string" && options.has(value as T) ? (value as T) : fallback;
}

function sanitizeMetric(value: unknown): SignalArenaMetric {
  const record = isRecord(value) ? value : {};

  return {
    label: stringValue(record.label),
    value: stringValue(record.value),
    tone: enumValue(record.tone, METRIC_TONES, "neutral")
  };
}

function sanitizeHolding(value: unknown): SignalArenaHolding {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    market: enumValue(record.market, MARKETS, "CN"),
    shares: numberValue(record.shares),
    availableShares: numberValue(record.availableShares),
    costPrice: numberValue(record.costPrice),
    currentPrice: numberValue(record.currentPrice),
    marketValue: numberValue(record.marketValue),
    profit: numberValue(record.profit),
    profitRate: numberValue(record.profitRate),
    positionRate: numberValue(record.positionRate)
  };
}

function sanitizeMarketSummary(value: unknown): SignalArenaMarketSummary {
  const record = isRecord(value) ? value : {};

  return {
    market: enumValue(record.market, MARKETS, "CN"),
    label: stringValue(record.label),
    totalValue: numberValue(record.totalValue),
    profit: numberValue(record.profit),
    profitRate: numberValue(record.profitRate),
    holdingsCount: numberValue(record.holdingsCount)
  };
}

function sanitizeCandidateAction(value: unknown): SignalArenaCandidateAction {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, ACTION_TYPES, "hold"),
    shares: numberValue(record.shares),
    priority: numberValue(record.priority),
    confidence: numberValue(record.confidence),
    reason: stringValue(record.reason)
  };
}

function sanitizeRunLog(value: unknown): SignalArenaRunLog {
  const record = isRecord(value) ? value : {};
  const riskResult = isRecord(record.riskResult) ? record.riskResult : {};
  const orderResult = isRecord(record.orderResult) ? record.orderResult : {};

  return {
    id: stringValue(record.id),
    startedAt: stringValue(record.startedAt),
    finishedAt: nullableString(record.finishedAt),
    status: enumValue(record.status, RUN_STATUSES, "skipped"),
    trigger: enumValue(record.trigger, new Set(["cron", "manual"]), "manual"),
    marketView: stringValue(record.marketView),
    riskLevel: enumValue(record.riskLevel, RISK_LEVELS, "unknown"),
    summary: stringValue(record.summary),
    candidates: arrayValue(record.candidates).map(sanitizeCandidateAction),
    selectedAction: isRecord(record.selectedAction) ? sanitizeCandidateAction(record.selectedAction) : null,
    riskResult: {
      allowed: typeof riskResult.allowed === "boolean" ? riskResult.allowed : false,
      reasons: arrayValue(riskResult.reasons).map((reason) => stringValue(reason))
    },
    orderResult: {
      status: nullableString(orderResult.status),
      message: nullableString(orderResult.message)
    }
  };
}

function sanitizeRankEntry(value: unknown): SignalArenaRankEntry {
  const record = isRecord(value) ? value : {};

  return {
    rank: numberValue(record.rank),
    nickname: stringValue(record.nickname),
    totalAssets: numberValue(record.totalAssets),
    returnRate: numberValue(record.returnRate),
    isCurrentAgent: typeof record.isCurrentAgent === "boolean" ? record.isCurrentAgent : false
  };
}

function sanitizeRank(value: Record<string, unknown>): SignalArenaRank {
  return {
    currentRank: nullableNumber(value.currentRank),
    returnRate: numberValue(value.returnRate),
    leaderGap: nullableNumber(value.leaderGap),
    leaders: arrayValue(value.leaders).map(sanitizeRankEntry),
    nearby: arrayValue(value.nearby).map(sanitizeRankEntry),
    updatedAt: stringValue(value.updatedAt)
  };
}

function sanitizeDashboard(value: Record<string, unknown>): SignalArenaDashboard {
  return {
    updatedAt: stringValue(value.updatedAt),
    sourceStatus: enumValue(value.sourceStatus, SOURCE_STATUSES, "error"),
    totalAssets: numberValue(value.totalAssets),
    initialCapital: numberValue(value.initialCapital),
    cash: numberValue(value.cash),
    frozenCash: numberValue(value.frozenCash),
    returnRate: numberValue(value.returnRate),
    currentRank: nullableNumber(value.currentRank),
    metrics: arrayValue(value.metrics).map(sanitizeMetric),
    cnHoldings: arrayValue(value.cnHoldings).map(sanitizeHolding),
    marketSummaries: arrayValue(value.marketSummaries).map(sanitizeMarketSummary),
    latestRun: isRecord(value.latestRun) ? sanitizeRunLog(value.latestRun) : null
  };
}

export function toSignalArenaPublicData(value: unknown): SignalArenaPublicData | null {
  if (!isRecord(value) || !isRecord(value.dashboard) || !isRecord(value.rank)) {
    return null;
  }

  const { dashboard, logs, rank } = value;

  if (
    typeof dashboard.updatedAt !== "string" ||
    typeof dashboard.sourceStatus !== "string" ||
    !SOURCE_STATUSES.has(dashboard.sourceStatus as SignalArenaDashboard["sourceStatus"]) ||
    !Array.isArray(dashboard.metrics) ||
    !Array.isArray(dashboard.cnHoldings) ||
    !Array.isArray(dashboard.marketSummaries) ||
    !Array.isArray(logs) ||
    typeof rank.updatedAt !== "string" ||
    !Array.isArray(rank.leaders) ||
    !Array.isArray(rank.nearby)
  ) {
    return null;
  }

  return {
    dashboard: sanitizeDashboard(dashboard),
    logs: logs.map(sanitizeRunLog),
    rank: sanitizeRank(rank)
  };
}
