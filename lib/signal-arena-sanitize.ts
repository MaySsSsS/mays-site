import type {
  SignalArenaActionType,
  SignalArenaCandidateAction,
  SignalArenaDataConfidence,
  SignalArenaDataSource,
  SignalArenaDashboard,
  SignalArenaDecisionTrace,
  SignalArenaEquityPoint,
  SignalArenaHolding,
  SignalArenaMarket,
  SignalArenaMarketSummary,
  SignalArenaMetric,
  SignalArenaOperations,
  SignalArenaOperationsTone,
  SignalArenaPublicData,
  SignalArenaRank,
  SignalArenaRankEntry,
  SignalArenaRejectedAction,
  SignalArenaRunLog,
  SignalArenaRunStatus,
  SignalArenaSnapshotState
} from "@/types/signal-arena";

const MARKETS = new Set<SignalArenaMarket>(["CN", "HK", "US"]);
const RUN_STATUSES = new Set<SignalArenaRunStatus>(["executed", "held", "blocked", "skipped", "failed"]);
const ACTION_TYPES = new Set<SignalArenaActionType>(["buy", "sell", "hold"]);
const SIGNAL_TYPES = new Set<SignalArenaDecisionTrace["signalContext"][number]["signalType"]>([
  "pullback_entry",
  "momentum_watch",
  "take_profit_watch",
  "stop_loss_watch",
  "position_rebalance"
]);
const SIGNAL_RISKS = new Set<SignalArenaDecisionTrace["signalContext"][number]["risk"]>(["low", "medium", "high"]);
const METRIC_TONES = new Set<SignalArenaMetric["tone"]>(["neutral", "positive", "negative", "warning"]);
const RISK_LEVELS = new Set<SignalArenaRunLog["riskLevel"]>(["low", "medium", "high", "unknown"]);
const SOURCE_STATUSES = new Set<SignalArenaDashboard["sourceStatus"]>(["live", "stale", "fallback", "error"]);
const TRIGGERS = new Set<SignalArenaRunLog["trigger"]>(["cron", "manual"]);
const OPERATIONS_TONES = new Set<SignalArenaOperationsTone>(["healthy", "watch", "quiet", "attention"]);
const DATA_SOURCES = new Set<SignalArenaDataSource>(["live", "imported"]);
const DATA_CONFIDENCES = new Set<SignalArenaDataConfidence>(["high", "medium", "low"]);
const EQUITY_STATUSES = new Set<SignalArenaEquityPoint["status"]>([
  "executed",
  "held",
  "blocked",
  "skipped",
  "failed",
  "snapshot"
]);

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

function nullableStringValue(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" ? value : fallback;
}

function nullableNumberValue(value: unknown, fallback: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return arrayValue(value).filter((item): item is string => typeof item === "string" && item.length > 0);
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

function sanitizeSnapshotState(value: unknown): SignalArenaSnapshotState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    totalAssets: numberValue(value.totalAssets),
    cash: numberValue(value.cash),
    returnRate: numberValue(value.returnRate),
    currentRank: nullableNumber(value.currentRank),
    holdingsCount: numberValue(value.holdingsCount)
  };
}

function sanitizeRejectedAction(value: unknown): SignalArenaRejectedAction {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, ACTION_TYPES, "hold"),
    shares: numberValue(record.shares),
    reason: stringValue(record.reason)
  };
}

function sanitizeTradingSignal(value: unknown): SignalArenaDecisionTrace["signalContext"][number] {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    signalType: enumValue(record.signalType, SIGNAL_TYPES, "momentum_watch"),
    suggestedAction: enumValue(record.suggestedAction, ACTION_TYPES, "hold"),
    confidence: numberValue(record.confidence),
    risk: enumValue(record.risk, SIGNAL_RISKS, "medium"),
    changeRate: nullableNumber(record.changeRate),
    price: nullableNumber(record.price),
    reason: stringValue(record.reason)
  };
}

function sanitizeDecisionTrace(value: unknown): SignalArenaDecisionTrace | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    beforeStateSummary: stringValue(value.beforeStateSummary),
    decisionRoute: stringArray(value.decisionRoute),
    marketAssessment: stringArray(value.marketAssessment),
    portfolioAssessment: stringArray(value.portfolioAssessment),
    signalContext: arrayValue(value.signalContext).map(sanitizeTradingSignal),
    rejectedActions: arrayValue(value.rejectedActions).map(sanitizeRejectedAction),
    publicExplanation: stringValue(value.publicExplanation)
  };
}

function sanitizeSourceMeta(record: Record<string, unknown>) {
  return {
    source: typeof record.source === "string" && DATA_SOURCES.has(record.source as SignalArenaDataSource)
      ? (record.source as SignalArenaDataSource)
      : undefined,
    sourceLabel: typeof record.sourceLabel === "string" ? record.sourceLabel : undefined,
    confidence: typeof record.confidence === "string" && DATA_CONFIDENCES.has(record.confidence as SignalArenaDataConfidence)
      ? (record.confidence as SignalArenaDataConfidence)
      : undefined,
    rawSummary: typeof record.rawSummary === "string" ? record.rawSummary : undefined
  };
}

function sanitizeEquityPoint(value: unknown): SignalArenaEquityPoint {
  const record = isRecord(value) ? value : {};

  return {
    id: stringValue(record.id),
    runId: nullableString(record.runId),
    capturedAt: stringValue(record.capturedAt),
    totalAssets: numberValue(record.totalAssets),
    returnRate: numberValue(record.returnRate),
    currentRank: nullableNumber(record.currentRank),
    status: enumValue(record.status, EQUITY_STATUSES, "snapshot"),
    actionSummary: nullableString(record.actionSummary),
    ...sanitizeSourceMeta(record)
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
    trigger: enumValue(record.trigger, TRIGGERS, "manual"),
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
    },
    beforeState: sanitizeSnapshotState(record.beforeState),
    decisionTrace: sanitizeDecisionTrace(record.decisionTrace),
    cashPlan: nullableString(record.cashPlan),
    watchlist: stringArray(record.watchlist),
    afterSnapshot: sanitizeSnapshotState(record.afterSnapshot),
    ...sanitizeSourceMeta(record)
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

function equityCoverageDays(history: SignalArenaEquityPoint[]): number {
  const timestamps = history.map((point) => Date.parse(point.capturedAt)).filter(Number.isFinite);

  if (timestamps.length < 2) {
    return 0;
  }

  return Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000));
}

function buildFallbackOperations(
  dashboard: SignalArenaDashboard,
  logs: SignalArenaRunLog[],
  equityHistory: SignalArenaEquityPoint[]
): SignalArenaOperations {
  return {
    tone: "watch",
    label: "观察",
    dataAgeSeconds: null,
    latestRunStatus: dashboard.latestRun?.status ?? null,
    latestRunFinishedAt: dashboard.latestRun?.finishedAt ?? null,
    latestRunSummary: dashboard.latestRun?.summary ?? null,
    equityPointCount: equityHistory.length,
    equityCoverageDays: equityCoverageDays(equityHistory),
    logCount: logs.length
  };
}

function sanitizeOperations(value: unknown, fallback: SignalArenaOperations): SignalArenaOperations {
  const record = isRecord(value) ? value : {};

  return {
    tone: enumValue(record.tone, OPERATIONS_TONES, fallback.tone),
    label: stringValue(record.label, fallback.label),
    dataAgeSeconds: nullableNumberValue(record.dataAgeSeconds, fallback.dataAgeSeconds),
    latestRunStatus:
      record.latestRunStatus === null
        ? null
        : typeof record.latestRunStatus === "string" && RUN_STATUSES.has(record.latestRunStatus as SignalArenaRunStatus)
          ? (record.latestRunStatus as SignalArenaRunStatus)
          : fallback.latestRunStatus,
    latestRunFinishedAt: nullableStringValue(record.latestRunFinishedAt, fallback.latestRunFinishedAt),
    latestRunSummary: nullableStringValue(record.latestRunSummary, fallback.latestRunSummary),
    equityPointCount: numberValue(record.equityPointCount, fallback.equityPointCount),
    equityCoverageDays: numberValue(record.equityCoverageDays, fallback.equityCoverageDays),
    logCount: numberValue(record.logCount, fallback.logCount)
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

  const sanitizedData = {
    dashboard: sanitizeDashboard(dashboard),
    logs: logs.map(sanitizeRunLog),
    rank: sanitizeRank(rank),
    equityHistory: arrayValue(value.equityHistory).map(sanitizeEquityPoint)
  };

  return {
    ...sanitizedData,
    operations: sanitizeOperations(
      value.operations,
      buildFallbackOperations(sanitizedData.dashboard, sanitizedData.logs, sanitizedData.equityHistory)
    )
  };
}
