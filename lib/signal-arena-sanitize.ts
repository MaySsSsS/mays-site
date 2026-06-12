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
  SignalArenaStrategy,
  SignalArenaStrategyParameters,
  SignalArenaStrategyTrace,
  SignalArenaSnapshotState
} from "@/types/signal-arena";

const DEFAULT_STRATEGY_PARAMETERS: SignalArenaStrategyParameters = {
  buyThreshold: 70,
  sellScoreThreshold: 45,
  targetPositionRate: 0.12,
  maxPositionRate: 0.2,
  rebalancePositionRate: 0.15,
  minCashRate: 0.2,
  maxHoldings: 6,
  stopLossRate: -0.08,
  takeProfitRate: 0.12,
  recentSellPenaltyDays: 7,
  maxHistorySymbolsPerRun: 24,
  maxDailyBuys: 1
};

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

function numericRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
  );
}

function sanitizeStrategyParameters(value: unknown): SignalArenaStrategyParameters {
  const record = numericRecord(value);

  return {
    buyThreshold: numberValue(record.buyThreshold, DEFAULT_STRATEGY_PARAMETERS.buyThreshold),
    sellScoreThreshold: numberValue(record.sellScoreThreshold, DEFAULT_STRATEGY_PARAMETERS.sellScoreThreshold),
    targetPositionRate: numberValue(record.targetPositionRate, DEFAULT_STRATEGY_PARAMETERS.targetPositionRate),
    maxPositionRate: numberValue(record.maxPositionRate, DEFAULT_STRATEGY_PARAMETERS.maxPositionRate),
    rebalancePositionRate: numberValue(record.rebalancePositionRate, DEFAULT_STRATEGY_PARAMETERS.rebalancePositionRate),
    minCashRate: numberValue(record.minCashRate, DEFAULT_STRATEGY_PARAMETERS.minCashRate),
    maxHoldings: numberValue(record.maxHoldings, DEFAULT_STRATEGY_PARAMETERS.maxHoldings),
    stopLossRate: numberValue(record.stopLossRate, DEFAULT_STRATEGY_PARAMETERS.stopLossRate),
    takeProfitRate: numberValue(record.takeProfitRate, DEFAULT_STRATEGY_PARAMETERS.takeProfitRate),
    recentSellPenaltyDays: numberValue(record.recentSellPenaltyDays, DEFAULT_STRATEGY_PARAMETERS.recentSellPenaltyDays),
    maxHistorySymbolsPerRun: numberValue(record.maxHistorySymbolsPerRun, DEFAULT_STRATEGY_PARAMETERS.maxHistorySymbolsPerRun),
    maxDailyBuys: numberValue(record.maxDailyBuys, DEFAULT_STRATEGY_PARAMETERS.maxDailyBuys)
  };
}

function sanitizeStrategyCandidate(value: unknown): SignalArenaStrategyTrace["candidateRanking"][number] {
  const record = isRecord(value) ? value : {};
  const factorScore = numericRecord(record.factorScore);
  const allowedFactors = new Set(["trend", "momentum", "breakout", "volume", "portfolioFit", "penalties", "total"]);

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    score: numberValue(record.score),
    source: stringArray(record.source),
    factorScore: Object.fromEntries(Object.entries(factorScore).filter(([key]) => allowedFactors.has(key))),
    rejectionReasons: stringArray(record.rejectionReasons),
    entryReasons: stringArray(record.entryReasons)
  };
}

function sanitizeStrategyTrace(value: unknown): SignalArenaStrategyTrace | null {
  if (!isRecord(value)) {
    return null;
  }

  const coverage = isRecord(value.historyCoverage) ? value.historyCoverage : {};

  return {
    strategyName: stringValue(value.strategyName, "Q-Alpha"),
    strategyVersion: stringValue(value.strategyVersion, "Q-Alpha v1"),
    accountScope: stringValue(value.accountScope, "quant-v1"),
    runMode: value.runMode === "dry-run" ? "dry-run" : "live",
    parameters: sanitizeStrategyParameters(value.parameters),
    candidateCount: numberValue(value.candidateCount),
    historyCoverage: {
      requestedSymbols: numberValue(coverage.requestedSymbols),
      coveredSymbols: numberValue(coverage.coveredSymbols),
      insufficientSymbols: stringArray(coverage.insufficientSymbols)
    },
    candidateRanking: arrayValue(value.candidateRanking).map(sanitizeStrategyCandidate),
    rejectedReasons: stringArray(value.rejectedReasons),
    finalRule: stringValue(value.finalRule),
    marketRegime: stringValue(value.marketRegime, "unknown")
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
    accountScope: stringValue(record.accountScope, "quant-v1"),
    strategyVersion: nullableString(record.strategyVersion) ?? "Q-Alpha v1",
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
    strategyTrace: sanitizeStrategyTrace(record.strategyTrace),
    cashPlan: nullableString(record.cashPlan),
    watchlist: stringArray(record.watchlist),
    afterSnapshot: sanitizeSnapshotState(record.afterSnapshot),
    accountScope: stringValue(record.accountScope, "quant-v1"),
    strategyVersion: nullableString(record.strategyVersion) ?? "Q-Alpha v1",
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
    previousGap: nullableNumber(value.previousGap),
    topTenGap: nullableNumber(value.topTenGap),
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

function sanitizeStrategy(value: unknown): SignalArenaStrategy {
  const record = isRecord(value) ? value : {};

  return {
    name: stringValue(record.name, "Q-Alpha"),
    version: stringValue(record.version, "Q-Alpha v1"),
    accountScope: stringValue(record.accountScope, "quant-v1"),
    runMode: "live",
    parameters: sanitizeStrategyParameters(record.parameters)
  };
}

function sanitizeAccount(value: unknown): SignalArenaPublicData["account"] {
  const record = isRecord(value) ? value : {};

  return {
    scope: stringValue(record.scope, "quant-v1"),
    strategyVersion: stringValue(record.strategyVersion, "Q-Alpha v1"),
    displayName: stringValue(record.displayName, "Quant Lab")
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
    equityHistory: arrayValue(value.equityHistory).map(sanitizeEquityPoint),
    strategy: sanitizeStrategy(value.strategy),
    account: sanitizeAccount(value.account)
  };

  return {
    ...sanitizedData,
    operations: sanitizeOperations(
      value.operations,
      buildFallbackOperations(sanitizedData.dashboard, sanitizedData.logs, sanitizedData.equityHistory)
    )
  };
}
