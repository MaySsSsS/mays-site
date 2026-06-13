import {
  fetchArenaHome,
  fetchArenaLeaderboard,
  fetchArenaPortfolio,
  fetchArenaTrades
} from "./signal-api";
import { arenaList } from "./arena-normalize";
import { Q_ALPHA_ACCOUNT_SCOPE, Q_ALPHA_DEFAULT_PARAMETERS, Q_ALPHA_STRATEGY_VERSION } from "./q-alpha-v1";
import { publicRunnerErrorFor } from "./run-error";
import { getCachedPublicData, listRecentRuns, listRecentSnapshots, putCachedPublicData } from "./storage";
import type { SignalArenaSnapshotRow } from "./storage";
import type {
  ArenaHolding,
  ArenaHomeData,
  ArenaLeaderboardData,
  ArenaLeaderboardEntry,
  ArenaPortfolioData,
  ArenaTrade,
  ArenaTradesData,
  Env
} from "./types";

const CACHE_TTL_SECONDS = 120;
const DEFAULT_ACCOUNT_SCOPE = Q_ALPHA_ACCOUNT_SCOPE;
const DEFAULT_STRATEGY_VERSION = Q_ALPHA_STRATEGY_VERSION;
const LEGACY_COMBINED_SELL_LIMIT_REASON = "卖出数量超过可卖数量或触发 T+1 限制。";
const LEGACY_COMBINED_SELL_LIMIT_PUBLIC_REASON =
  "旧版 Runner 将“超出可卖数量”和“T+1”合并提示；新版本已拆分，后续会显示具体原因。";

type PublicMetric = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

type PublicHolding = {
  symbol: string;
  name: string;
  market: "CN" | "HK" | "US";
  shares: number;
  availableShares: number;
  costPrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  positionRate: number;
};

type PublicMarketSummary = {
  market: "CN" | "HK" | "US";
  label: string;
  totalValue: number;
  profit: number;
  profitRate: number;
  holdingsCount: number;
};

type PublicTrade = {
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  status: string;
  reason: string | null;
  createdAt: string | null;
};

type PublicSnapshotState = {
  totalAssets: number;
  cash: number;
  returnRate: number;
  currentRank: number | null;
  holdingsCount: number;
};

type PublicDecisionTrace = {
  beforeStateSummary: string;
  decisionRoute: string[];
  marketAssessment: string[];
  portfolioAssessment: string[];
  signalContext: PublicTradingSignal[];
  rejectedActions: Array<{
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    reason: string;
  }>;
  publicExplanation: string;
};

type PublicStrategyTrace = {
  strategyName: string;
  strategyVersion: string;
  accountScope: string;
  runMode: "dry-run" | "live";
  parameters: Record<string, unknown>;
  candidateCount: number;
  historyCoverage: {
    requestedSymbols: number;
    coveredSymbols: number;
    insufficientSymbols: string[];
  };
  candidateRanking: Array<{
    symbol: string;
    name: string;
    score: number;
    source: string[];
    factorScore: Record<string, number>;
    indicators: Record<string, number | null> | null;
    holding: {
      shares: number;
      availableShares: number;
      profitRate: number;
      positionRate: number;
    } | null;
    rejectionReasons: string[];
    entryReasons: string[];
  }>;
  rejectedReasons: string[];
  finalRule: string;
  finalAction: {
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    priority: number;
    confidence: number;
    reason: string;
  } | null;
  riskReasons: string[];
  recentSnapshots: Array<{
    capturedAt: string | null;
    totalAssets: number;
    returnRate: number;
    rank: number | null;
  }>;
  marketRegime: string;
};

type PublicTradingSignal = {
  symbol: string;
  name: string;
  signalType: "pullback_entry" | "momentum_watch" | "take_profit_watch" | "stop_loss_watch" | "position_rebalance";
  suggestedAction: "buy" | "sell" | "hold";
  confidence: number;
  risk: "low" | "medium" | "high";
  changeRate: number | null;
  price: number | null;
  reason: string;
};

type PublicEquityPoint = {
  id: string;
  runId: string | null;
  capturedAt: string;
  totalAssets: number;
  returnRate: number;
  currentRank: number | null;
  status: PublicRunLog["status"] | "snapshot";
  actionSummary: string | null;
  accountScope: string;
  strategyVersion: string | null;
};

type PublicOperationsTone = "healthy" | "watch" | "quiet" | "attention";

type PublicOperations = {
  tone: PublicOperationsTone;
  label: string;
  dataAgeSeconds: number | null;
  latestRunStatus: PublicRunLog["status"] | null;
  latestRunFinishedAt: string | null;
  latestRunSummary: string | null;
  equityPointCount: number;
  equityCoverageDays: number;
  logCount: number;
};

type PublicRunLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "executed" | "held" | "blocked" | "skipped" | "failed";
  trigger: "cron" | "manual";
  marketView: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  summary: string;
  candidates: Array<{
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    priority: number;
    confidence: number;
    reason: string;
  }>;
  selectedAction: {
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    priority: number;
    confidence: number;
    reason: string;
  } | null;
  riskResult: {
    allowed: boolean;
    reasons: string[];
  };
  orderResult: {
    status: string | null;
    message: string | null;
  };
  beforeState: PublicSnapshotState | null;
  decisionTrace: PublicDecisionTrace | null;
  strategyTrace: PublicStrategyTrace | null;
  cashPlan: string | null;
  watchlist: string[];
  afterSnapshot: PublicSnapshotState | null;
  accountScope: string;
  strategyVersion: string | null;
};

type PublicRankEntry = {
  rank: number;
  nickname: string;
  totalAssets: number;
  returnRate: number;
  isCurrentAgent: boolean;
};

type PublicRank = {
  currentRank: number | null;
  returnRate: number;
  leaderGap: number | null;
  previousGap: number | null;
  topTenGap: number | null;
  leaders: PublicRankEntry[];
  nearby: PublicRankEntry[];
  updatedAt: string;
};

type PublicDashboard = {
  updatedAt: string;
  sourceStatus: "live" | "stale" | "fallback" | "error";
  totalAssets: number;
  initialCapital: number;
  cash: number;
  frozenCash: number;
  returnRate: number;
  currentRank: number | null;
  metrics: PublicMetric[];
  cnHoldings: PublicHolding[];
  marketSummaries: PublicMarketSummary[];
  latestRun: PublicRunLog | null;
};

type PublicStrategy = {
  name: string;
  version: string;
  accountScope: string;
  runMode: "live";
  parameters: typeof Q_ALPHA_DEFAULT_PARAMETERS;
};

type PublicAccount = {
  scope: string;
  strategyVersion: string;
  displayName: string;
};

type PublicSnapshot = {
  dashboard: PublicDashboard;
  logs: PublicRunLog[];
  rank: PublicRank;
  equityHistory: PublicEquityPoint[];
  operations: PublicOperations;
  recentTrades: PublicTrade[];
  strategy: PublicStrategy;
  account: PublicAccount;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function money(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
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

function maybeNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function noteReason(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  return nullableString(value.reason ?? value.message ?? value.summary);
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

const MARKET_VALUES = new Set<PublicHolding["market"]>(["CN", "HK", "US"]);
const RUN_STATUSES = new Set<PublicRunLog["status"]>(["executed", "held", "blocked", "skipped", "failed"]);
const CANDIDATE_ACTIONS = new Set<"buy" | "sell" | "hold">(["buy", "sell", "hold"]);
const SIGNAL_TYPES = new Set<PublicTradingSignal["signalType"]>([
  "pullback_entry",
  "momentum_watch",
  "take_profit_watch",
  "stop_loss_watch",
  "position_rebalance"
]);
const SIGNAL_RISKS = new Set<PublicTradingSignal["risk"]>(["low", "medium", "high"]);
const TRADE_ACTIONS = new Set<PublicTrade["action"]>(["buy", "sell"]);
const SOURCE_STATUSES = new Set<PublicDashboard["sourceStatus"]>(["live", "stale", "fallback", "error"]);
const RISK_LEVELS = new Set<PublicRunLog["riskLevel"]>(["low", "medium", "high", "unknown"]);
const TRIGGERS = new Set<PublicRunLog["trigger"]>(["cron", "manual"]);
const OPERATIONS_TONES = new Set<PublicOperationsTone>(["healthy", "watch", "quiet", "attention"]);
const EQUITY_STATUSES = new Set<PublicEquityPoint["status"]>([
  "executed",
  "held",
  "blocked",
  "skipped",
  "failed",
  "snapshot"
]);

function isFreshSnapshot(snapshot: PublicSnapshot): boolean {
  const updatedAt = Date.parse(snapshot.dashboard.updatedAt);
  if (Number.isNaN(updatedAt)) {
    return false;
  }

  return Date.now() - updatedAt < CACHE_TTL_SECONDS * 1000;
}

function withSourceStatus(
  snapshot: PublicSnapshot,
  sourceStatus: PublicDashboard["sourceStatus"]
): PublicSnapshot {
  return {
    ...snapshot,
    dashboard: {
      ...snapshot.dashboard,
      sourceStatus
    }
  };
}

function sanitizePublicCandidateAction(value: unknown): {
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
} {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, CANDIDATE_ACTIONS, "buy"),
    shares: numberValue(record.shares),
    priority: numberValue(record.priority),
    confidence: numberValue(record.confidence),
    reason: stringValue(record.reason)
  };
}

function sanitizePublicSnapshotState(value: unknown): PublicSnapshotState | null {
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

function sanitizePublicRejectedAction(value: unknown): PublicDecisionTrace["rejectedActions"][number] {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, CANDIDATE_ACTIONS, "hold"),
    shares: numberValue(record.shares),
    reason: stringValue(record.reason)
  };
}

function sanitizePublicTradingSignal(value: unknown): PublicTradingSignal {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    signalType: enumValue(record.signalType, SIGNAL_TYPES, "momentum_watch"),
    suggestedAction: enumValue(record.suggestedAction, CANDIDATE_ACTIONS, "hold"),
    confidence: numberValue(record.confidence),
    risk: enumValue(record.risk, SIGNAL_RISKS, "medium"),
    changeRate: nullableNumber(record.changeRate),
    price: nullableNumber(record.price),
    reason: stringValue(record.reason)
  };
}

function sanitizePublicDecisionTrace(value: unknown): PublicDecisionTrace | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    beforeStateSummary: stringValue(value.beforeStateSummary),
    decisionRoute: stringArray(value.decisionRoute),
    marketAssessment: stringArray(value.marketAssessment),
    portfolioAssessment: stringArray(value.portfolioAssessment),
    signalContext: arrayValue(value.signalContext).map(sanitizePublicTradingSignal),
    rejectedActions: arrayValue(value.rejectedActions).map(sanitizePublicRejectedAction),
    publicExplanation: stringValue(value.publicExplanation)
  };
}

function numericRecord(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]))
  );
}

function sanitizeStrategyParameters(value: unknown): Record<string, number> {
  const record = numericRecord(value);
  const allowed = new Set(Object.keys(Q_ALPHA_DEFAULT_PARAMETERS));

  return Object.fromEntries(Object.entries(record).filter(([key]) => allowed.has(key)));
}

function nullableNumericRecord(value: unknown): Record<string, number | null> | null {
  if (!isRecord(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number | null] =>
      entry[1] === null || (typeof entry[1] === "number" && Number.isFinite(entry[1]))
    )
  );
}

function sanitizePublicStrategyHolding(value: unknown): PublicStrategyTrace["candidateRanking"][number]["holding"] {
  if (!isRecord(value)) {
    return null;
  }

  return {
    shares: numberValue(value.shares),
    availableShares: numberValue(value.availableShares),
    profitRate: numberValue(value.profitRate),
    positionRate: numberValue(value.positionRate)
  };
}

function sanitizePublicStrategyAction(value: unknown): PublicStrategyTrace["finalAction"] {
  if (!isRecord(value)) {
    return null;
  }

  return {
    symbol: stringValue(value.symbol),
    action: enumValue(value.action, CANDIDATE_ACTIONS, "hold"),
    shares: numberValue(value.shares),
    priority: numberValue(value.priority),
    confidence: numberValue(value.confidence),
    reason: stringValue(value.reason)
  };
}

function sanitizePublicStrategySnapshot(value: unknown): PublicStrategyTrace["recentSnapshots"][number] {
  const record = isRecord(value) ? value : {};

  return {
    capturedAt: nullableString(record.capturedAt ?? record.created_at),
    totalAssets: numberValue(record.totalAssets ?? record.total_assets ?? record.total_value),
    returnRate: numberValue(record.returnRate ?? record.return_rate),
    rank: nullableNumber(record.rank ?? record.current_rank)
  };
}

function sanitizePublicStrategyCandidate(value: unknown): PublicStrategyTrace["candidateRanking"][number] {
  const record = isRecord(value) ? value : {};
  const factorScore = numericRecord(record.factorScore);
  const allowedFactors = new Set(["trend", "momentum", "breakout", "volume", "portfolioFit", "penalties", "total"]);

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    score: numberValue(record.score),
    source: stringArray(record.source),
    factorScore: Object.fromEntries(Object.entries(factorScore).filter(([key]) => allowedFactors.has(key))),
    indicators: nullableNumericRecord(record.indicators),
    holding: sanitizePublicStrategyHolding(record.holding),
    rejectionReasons: stringArray(record.rejectionReasons),
    entryReasons: stringArray(record.entryReasons)
  };
}

function sanitizePublicStrategyTrace(value: unknown): PublicStrategyTrace | null {
  if (!isRecord(value)) {
    return null;
  }

  const coverage = isRecord(value.historyCoverage) ? value.historyCoverage : {};
  const runMode = value.runMode === "dry-run" ? "dry-run" : "live";

  return {
    strategyName: stringValue(value.strategyName, "Q-Alpha"),
    strategyVersion: stringValue(value.strategyVersion, DEFAULT_STRATEGY_VERSION),
    accountScope: stringValue(value.accountScope, DEFAULT_ACCOUNT_SCOPE),
    runMode,
    parameters: sanitizeStrategyParameters(value.parameters),
    candidateCount: numberValue(value.candidateCount),
    historyCoverage: {
      requestedSymbols: numberValue(coverage.requestedSymbols),
      coveredSymbols: numberValue(coverage.coveredSymbols),
      insufficientSymbols: stringArray(coverage.insufficientSymbols)
    },
    candidateRanking: arrayValue(value.candidateRanking).map(sanitizePublicStrategyCandidate),
    rejectedReasons: stringArray(value.rejectedReasons),
    finalRule: stringValue(value.finalRule),
    finalAction: sanitizePublicStrategyAction(value.finalAction),
    riskReasons: stringArray(value.riskReasons),
    recentSnapshots: arrayValue(value.recentSnapshots).map(sanitizePublicStrategySnapshot),
    marketRegime: stringValue(value.marketRegime, "unknown")
  };
}

function sanitizePublicEquityPoint(value: unknown): PublicEquityPoint {
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
    accountScope: stringValue(record.accountScope, DEFAULT_ACCOUNT_SCOPE),
    strategyVersion: nullableString(record.strategyVersion) ?? DEFAULT_STRATEGY_VERSION
  };
}

function equityCoverageDays(history: PublicEquityPoint[]): number {
  const timestamps = history.map((point) => Date.parse(point.capturedAt)).filter(Number.isFinite);

  if (timestamps.length < 2) {
    return 0;
  }

  return Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000));
}

function isNonTradingSummary(summary: string): boolean {
  return (
    summary.toLowerCase().includes("market closed") ||
    summary.includes("不是 A 股交易时段") ||
    summary.includes("非交易时段") ||
    summary.includes("休市")
  );
}

function operationsTone(
  sourceStatus: PublicDashboard["sourceStatus"],
  dataAgeSeconds: number | null,
  latestRunStatus: PublicRunLog["status"] | null,
  latestRunSummary: string
): PublicOperationsTone {
  if (sourceStatus === "fallback" || sourceStatus === "error" || latestRunStatus === "failed") {
    return "attention";
  }

  if (latestRunStatus === "skipped" && isNonTradingSummary(latestRunSummary)) {
    return "quiet";
  }

  if (sourceStatus === "live" && dataAgeSeconds !== null && dataAgeSeconds <= 15 * 60) {
    return "healthy";
  }

  return "watch";
}

function operationsLabel(tone: PublicOperationsTone): string {
  switch (tone) {
    case "healthy":
      return "正常";
    case "quiet":
      return "休市";
    case "attention":
      return "注意";
    case "watch":
      return "观察";
  }
}

function buildOperations(snapshot: {
  dashboard: PublicDashboard;
  logs: PublicRunLog[];
  equityHistory: PublicEquityPoint[];
}): PublicOperations {
  const updatedMs = Date.parse(snapshot.dashboard.updatedAt);
  const dataAgeSeconds = Number.isNaN(updatedMs) ? null : Math.max(0, Math.floor((Date.now() - updatedMs) / 1000));
  const latestRun = snapshot.dashboard.latestRun;
  const latestRunSummary = latestRun?.summary ?? "";
  const tone = operationsTone(snapshot.dashboard.sourceStatus, dataAgeSeconds, latestRun?.status ?? null, latestRunSummary);

  return {
    tone,
    label: operationsLabel(tone),
    dataAgeSeconds,
    latestRunStatus: latestRun?.status ?? null,
    latestRunFinishedAt: latestRun?.finishedAt ?? null,
    latestRunSummary: latestRun?.summary ?? null,
    equityPointCount: snapshot.equityHistory.length,
    equityCoverageDays: equityCoverageDays(snapshot.equityHistory),
    logCount: snapshot.logs.length
  };
}

function sanitizePublicOperations(value: unknown, fallback: PublicOperations): PublicOperations {
  const record = isRecord(value) ? value : {};

  return {
    tone: enumValue(record.tone, OPERATIONS_TONES, fallback.tone),
    label: stringValue(record.label, fallback.label),
    dataAgeSeconds: nullableNumberValue(record.dataAgeSeconds, fallback.dataAgeSeconds),
    latestRunStatus:
      record.latestRunStatus === null
        ? null
        : typeof record.latestRunStatus === "string" && RUN_STATUSES.has(record.latestRunStatus as PublicRunLog["status"])
          ? (record.latestRunStatus as PublicRunLog["status"])
          : fallback.latestRunStatus,
    latestRunFinishedAt: nullableStringValue(record.latestRunFinishedAt, fallback.latestRunFinishedAt),
    latestRunSummary: nullableStringValue(record.latestRunSummary, fallback.latestRunSummary),
    equityPointCount: numberValue(record.equityPointCount, fallback.equityPointCount),
    equityCoverageDays: numberValue(record.equityCoverageDays, fallback.equityCoverageDays),
    logCount: numberValue(record.logCount, fallback.logCount)
  };
}

function sanitizePublicRunLog(value: unknown): PublicRunLog {
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
    candidates: arrayValue(record.candidates).map(sanitizePublicCandidateAction),
    selectedAction: isRecord(record.selectedAction) ? sanitizePublicCandidateAction(record.selectedAction) : null,
    riskResult: {
      allowed: typeof riskResult.allowed === "boolean" ? riskResult.allowed : false,
      reasons: arrayValue(riskResult.reasons).map((reason) => stringValue(reason))
    },
    orderResult: {
      status: nullableString(orderResult.status),
      message: nullableString(orderResult.message)
    },
    beforeState: sanitizePublicSnapshotState(record.beforeState),
    decisionTrace: sanitizePublicDecisionTrace(record.decisionTrace),
    strategyTrace: sanitizePublicStrategyTrace(record.strategyTrace),
    cashPlan: nullableString(record.cashPlan),
    watchlist: stringArray(record.watchlist),
    afterSnapshot: sanitizePublicSnapshotState(record.afterSnapshot),
    accountScope: stringValue(record.accountScope, DEFAULT_ACCOUNT_SCOPE),
    strategyVersion: nullableString(record.strategyVersion) ?? DEFAULT_STRATEGY_VERSION
  };
}

function pickPublicOrderResult(value: unknown): { status: string | null; message: string | null } {
  if (!isRecord(value)) {
    return { status: null, message: null };
  }

  return {
    status: typeof value.status === "string" ? value.status : null,
    message: typeof value.message === "string" ? value.message : null
  };
}

function sanitizePublicTrade(value: unknown): PublicTrade {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, TRADE_ACTIONS, "buy"),
    shares: numberValue(record.shares),
    status: stringValue(record.status, "unknown"),
    reason: nullableString(record.reason),
    createdAt: nullableString(record.createdAt ?? record.created_at)
  };
}

function sanitizePublicRankEntry(value: unknown, currentRank: number | null): PublicRankEntry {
  const record = isRecord(value) ? value : {};

  return {
    rank: numberValue(record.rank),
    nickname: stringValue(record.nickname),
    totalAssets: numberValue(record.totalAssets),
    returnRate: numberValue(record.returnRate),
    isCurrentAgent:
      typeof record.isCurrentAgent === "boolean" ? record.isCurrentAgent : numberValue(record.rank) === currentRank
  };
}

function sanitizePublicRank(value: unknown): PublicRank {
  const record = isRecord(value) ? value : {};
  const currentRank = nullableNumber(record.currentRank);

  return {
    currentRank,
    returnRate: numberValue(record.returnRate),
    leaderGap: nullableNumber(record.leaderGap),
    previousGap: nullableNumber(record.previousGap),
    topTenGap: nullableNumber(record.topTenGap),
    leaders: arrayValue(record.leaders).map((entry) => sanitizePublicRankEntry(entry, currentRank)),
    nearby: arrayValue(record.nearby).map((entry) => sanitizePublicRankEntry(entry, currentRank)),
    updatedAt: stringValue(record.updatedAt)
  };
}

function sanitizePublicHolding(value: unknown, totalAssets: number): PublicHolding {
  const record = isRecord(value) ? value : {};
  const marketValue = numberValue(record.marketValue);

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    market: enumValue(record.market, MARKET_VALUES, "CN"),
    shares: numberValue(record.shares),
    availableShares: numberValue(record.availableShares),
    costPrice: numberValue(record.costPrice),
    currentPrice: numberValue(record.currentPrice),
    marketValue,
    profit: numberValue(record.profit),
    profitRate: numberValue(record.profitRate),
    positionRate: totalAssets > 0 ? marketValue / totalAssets : 0
  };
}

function sanitizePublicDashboard(value: unknown): PublicDashboard {
  const record = isRecord(value) ? value : {};
  const totalAssets = numberValue(record.totalAssets);

  return {
    updatedAt: stringValue(record.updatedAt),
    sourceStatus: enumValue(record.sourceStatus, SOURCE_STATUSES, "error"),
    totalAssets,
    initialCapital: numberValue(record.initialCapital),
    cash: numberValue(record.cash),
    frozenCash: numberValue(record.frozenCash),
    returnRate: numberValue(record.returnRate),
    currentRank: nullableNumber(record.currentRank),
    metrics: arrayValue(record.metrics).map((metric) => {
      const metricRecord = isRecord(metric) ? metric : {};

      return {
        label: stringValue(metricRecord.label),
        value: stringValue(metricRecord.value),
        tone: enumValue(metricRecord.tone, new Set(["neutral", "positive", "negative", "warning"]), "neutral")
      };
    }),
    cnHoldings: arrayValue(record.cnHoldings).map((holding) => sanitizePublicHolding(holding, totalAssets)),
    marketSummaries: arrayValue(record.marketSummaries).map((market) => {
      const marketRecord = isRecord(market) ? market : {};

      return {
        market: enumValue(marketRecord.market, MARKET_VALUES, "CN"),
        label: stringValue(marketRecord.label),
        totalValue: numberValue(marketRecord.totalValue),
        profit: numberValue(marketRecord.profit),
        profitRate: numberValue(marketRecord.profitRate),
        holdingsCount: numberValue(marketRecord.holdingsCount)
      };
    }),
    latestRun: isRecord(record.latestRun) ? sanitizePublicRunLog(record.latestRun) : null
  };
}

function sanitizePublicSnapshot(value: unknown): PublicSnapshot | null {
  if (!isRecord(value) || !isRecord(value.dashboard) || !isRecord(value.rank)) {
    return null;
  }

  const snapshot = {
    dashboard: sanitizePublicDashboard(value.dashboard),
    logs: arrayValue(value.logs).map(sanitizePublicRunLog),
    rank: sanitizePublicRank(value.rank),
    equityHistory: arrayValue(value.equityHistory).map(sanitizePublicEquityPoint),
    recentTrades: arrayValue(value.recentTrades).map(sanitizePublicTrade),
    strategy: sanitizePublicStrategy(value.strategy),
    account: sanitizePublicAccount(value.account)
  };

  return {
    ...snapshot,
    operations: sanitizePublicOperations(value.operations, buildOperations(snapshot))
  };
}

function sanitizePublicStrategy(value: unknown): PublicStrategy {
  const record = isRecord(value) ? value : {};

  return {
    name: stringValue(record.name, "Q-Alpha"),
    version: stringValue(record.version, DEFAULT_STRATEGY_VERSION),
    accountScope: stringValue(record.accountScope, DEFAULT_ACCOUNT_SCOPE),
    runMode: "live",
    parameters: Q_ALPHA_DEFAULT_PARAMETERS
  };
}

function sanitizePublicAccount(value: unknown): PublicAccount {
  const record = isRecord(value) ? value : {};

  return {
    scope: stringValue(record.scope, DEFAULT_ACCOUNT_SCOPE),
    strategyVersion: stringValue(record.strategyVersion, DEFAULT_STRATEGY_VERSION),
    displayName: stringValue(record.displayName, "Quant Lab")
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeDecisionTrace(value: unknown): unknown {
  if (!isRecord(value)) {
    return null;
  }

  return {
    beforeStateSummary: value.beforeStateSummary ?? value.before_state_summary,
    decisionRoute: value.decisionRoute ?? value.decision_route,
    marketAssessment: value.marketAssessment ?? value.market_assessment,
    portfolioAssessment: value.portfolioAssessment ?? value.portfolio_assessment,
    signalContext: value.signalContext ?? value.signal_context,
    rejectedActions: value.rejectedActions ?? value.rejected_actions,
    publicExplanation: value.publicExplanation ?? value.public_explanation
  };
}

function isHoldAction(value: unknown): boolean {
  return isRecord(value) && value.action === "hold";
}

function isSellAction(value: unknown): boolean {
  return isRecord(value) && value.action === "sell";
}

function normalizeRiskResultForHoldDecision(value: unknown): unknown {
  const record = isRecord(value) ? value : {};
  const reasons = arrayValue(record.reasons)
    .map((reason) => stringValue(reason))
    .filter((reason) => reason !== "A 股交易股数必须是 100 的整数倍。")
    .map((reason) => (reason === "本轮建议为 hold，无需下单。" ? "AI 最终选择 HOLD，观望/持有，不需要下单。" : reason));

  return {
    ...record,
    allowed: false,
    reasons: reasons.length > 0 ? reasons : ["AI 最终选择 HOLD，观望/持有，不需要下单。"]
  };
}

function normalizeRiskResultForSellDecision(value: unknown): unknown {
  const record = isRecord(value) ? value : {};
  const reasons = arrayValue(record.reasons).map((reason) => {
    const text = stringValue(reason);
    return text === LEGACY_COMBINED_SELL_LIMIT_REASON ? LEGACY_COMBINED_SELL_LIMIT_PUBLIC_REASON : text;
  });

  return {
    ...record,
    reasons
  };
}

function mapRunRowToPublicRunLog(row: {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger: "cron" | "manual";
  market_view: string | null;
  risk_level: "low" | "medium" | "high" | null;
  summary: string | null;
  candidates_json: string;
  selected_action_json: string | null;
  risk_result_json: string;
  order_result_json: string | null;
  before_state_json: string | null;
  decision_trace_json: string | null;
  strategy_trace_json?: string | null;
  strategy_parameters_json?: string | null;
  after_snapshot_json: string | null;
  error_message?: string | null;
  account_scope?: string | null;
  strategy_version?: string | null;
}): PublicRunLog {
  const decisionTrace = parseJson<unknown>(row.decision_trace_json, null);
  const decisionTraceRecord = isRecord(decisionTrace) ? decisionTrace : {};
  const strategyTrace = parseJson<unknown>(row.strategy_trace_json ?? null, null);
  const selectedAction = parseJson<unknown>(row.selected_action_json, null);
  const holdDecision = isHoldAction(selectedAction);
  const sellDecision = isSellAction(selectedAction);
  const riskResult = parseJson<unknown>(row.risk_result_json, { allowed: false, reasons: [] });
  const riskResultRecord = isRecord(riskResult) ? riskResult : {};
  const publicError = row.status === "failed" ? publicRunnerErrorFor(row.error_message ?? null) : null;

  return sanitizePublicRunLog({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status === "blocked" && holdDecision ? "held" : row.status,
    trigger: row.trigger,
    marketView: row.market_view ?? "unknown",
    riskLevel: row.risk_level ?? "unknown",
    summary: publicError?.summary ?? row.summary ?? "无摘要",
    candidates: parseJson<unknown[]>(row.candidates_json, []),
    selectedAction,
    riskResult: holdDecision
      ? normalizeRiskResultForHoldDecision(riskResult)
      : sellDecision
        ? normalizeRiskResultForSellDecision(riskResult)
        : publicError
          ? { ...riskResultRecord, allowed: false, reasons: publicError.riskReasons }
          : riskResult,
    orderResult: pickPublicOrderResult(parseJson<unknown>(row.order_result_json, null)),
    beforeState: parseJson<unknown>(row.before_state_json, null),
    decisionTrace: normalizeDecisionTrace(decisionTrace),
    strategyTrace,
    cashPlan: nullableString(decisionTraceRecord.cashPlan ?? decisionTraceRecord.cash_plan),
    watchlist: decisionTraceRecord.watchlist,
    afterSnapshot: parseJson<unknown>(row.after_snapshot_json, null),
    accountScope: row.account_scope ?? DEFAULT_ACCOUNT_SCOPE,
    strategyVersion: row.strategy_version ?? DEFAULT_STRATEGY_VERSION
  });
}

function actionSummaryForRun(run: PublicRunLog | undefined): string | null {
  if (!run) {
    return null;
  }

  if (run.selectedAction) {
    return `${run.selectedAction.action.toUpperCase()} ${run.selectedAction.symbol} ${run.selectedAction.shares} 股`;
  }

  return run.summary || null;
}

function snapshotPayloadRecord(value: string): Record<string, unknown> {
  const parsed = parseJson<unknown>(value, {});
  if (!isRecord(parsed)) {
    return {};
  }

  return isRecord(parsed.dashboard) ? parsed.dashboard : parsed;
}

function snapshotRankRecord(value: string): Record<string, unknown> {
  const parsed = parseJson<unknown>(value, {});
  if (!isRecord(parsed)) {
    return {};
  }

  return isRecord(parsed.rank) ? parsed.rank : parsed;
}

function mapSnapshotRowToEquityPoint(
  row: SignalArenaSnapshotRow,
  runById: Map<string, PublicRunLog>
): PublicEquityPoint {
  const dashboard = snapshotPayloadRecord(row.dashboard_json);
  const rank = snapshotRankRecord(row.rank_json);
  const run = row.run_id ? runById.get(row.run_id) : undefined;

  return sanitizePublicEquityPoint({
    id: row.id,
    runId: row.run_id,
    capturedAt: row.created_at,
    totalAssets: dashboard.totalAssets,
    returnRate: dashboard.returnRate,
    currentRank: dashboard.currentRank ?? rank.currentRank,
    status: run?.status ?? "snapshot",
    actionSummary: actionSummaryForRun(run),
    accountScope: row.account_scope ?? stringValue(dashboard.accountScope, DEFAULT_ACCOUNT_SCOPE),
    strategyVersion: row.strategy_version ?? nullableString(dashboard.strategyVersion) ?? DEFAULT_STRATEGY_VERSION
  });
}

function mergeEquityHistory(
  current: PublicEquityPoint[],
  snapshotRows: SignalArenaSnapshotRow[],
  logs: PublicRunLog[]
): PublicEquityPoint[] {
  const runById = new Map(logs.map((log) => [log.id, log]));
  const pointById = new Map<string, PublicEquityPoint>();

  for (const point of current) {
    pointById.set(point.id, sanitizePublicEquityPoint(point));
  }

  for (const row of snapshotRows) {
    const point = mapSnapshotRowToEquityPoint(row, runById);
    pointById.set(point.id, point);
  }

  return [...pointById.values()].sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
}

function seedEquityHistory(snapshot: PublicSnapshot, history: PublicEquityPoint[]): PublicEquityPoint[] {
  if (history.length > 0 || !snapshot.dashboard.updatedAt) {
    return history;
  }

  return [
    sanitizePublicEquityPoint({
      id: `dashboard-${snapshot.dashboard.updatedAt}`,
      runId: snapshot.dashboard.latestRun?.id ?? null,
      capturedAt: snapshot.dashboard.updatedAt,
      totalAssets: snapshot.dashboard.totalAssets,
      returnRate: snapshot.dashboard.returnRate,
      currentRank: snapshot.dashboard.currentRank,
      status: snapshot.dashboard.latestRun?.status ?? "snapshot",
      actionSummary: snapshot.dashboard.latestRun?.summary ?? "当前总览快照",
      accountScope: snapshot.account.scope,
      strategyVersion: snapshot.strategy.version
    })
  ];
}

function mergePublicData(
  snapshot: PublicSnapshot,
  logs: PublicRunLog[],
  snapshotRows: SignalArenaSnapshotRow[]
): PublicSnapshot {
  const merged = {
    ...snapshot,
    dashboard: {
      ...snapshot.dashboard,
      latestRun: logs[0] ?? null
    },
    logs
  };

  const result = {
    ...merged,
    equityHistory: seedEquityHistory(merged, mergeEquityHistory(snapshot.equityHistory, snapshotRows, logs))
  };

  return {
    ...result,
    operations: buildOperations(result)
  };
}

function portfolioHoldings(portfolio: ArenaPortfolioData): ArenaHolding[] {
  return arenaList<ArenaHolding>(portfolio, ["holdings", "positions", "items", "records", "data"]);
}

function isAshareSymbol(symbol: string): boolean {
  return /^(sh|sz)\d{6}$/.test(symbol);
}

function holdingMarket(holding: ArenaHolding): "CN" | "HK" | "US" {
  return holding.market ?? (isAshareSymbol(holding.symbol) ? "CN" : "US");
}

function leaderboardEntries(leaderboard: ArenaLeaderboardData): ArenaLeaderboardEntry[] {
  return arenaList<ArenaLeaderboardEntry>(leaderboard, ["leaderboard", "leaders", "ranking", "items", "records", "data"]);
}

function tradeRecords(trades: ArenaTradesData): ArenaTrade[] {
  return arenaList<ArenaTrade>(trades, ["trades", "orders", "records", "items", "data"]);
}

function toPublicHolding(holding: ArenaHolding, totalAssets: number): PublicHolding {
  const marketValue = holding.market_value ?? 0;

  return {
    symbol: holding.symbol,
    name: holding.name,
    market: holdingMarket(holding),
    shares: holding.shares,
    availableShares: holding.available_shares ?? holding.shares,
    costPrice: holding.cost_price ?? holding.avg_cost ?? 0,
    currentPrice: holding.current_price ?? 0,
    marketValue,
    profit: holding.profit ?? holding.profit_loss ?? 0,
    profitRate: holding.profit_rate ?? 0,
    positionRate: totalAssets > 0 ? marketValue / totalAssets : 0
  };
}

function leaderboardTotalAssets(entry: ArenaLeaderboardEntry): number {
  return entry.total_assets ?? entry.total_value ?? 0;
}

function toPublicSnapshot(
  home: ArenaHomeData,
  portfolio: ArenaPortfolioData,
  trades: ArenaTradesData,
  leaderboard: ArenaLeaderboardData
): PublicSnapshot {
  const updatedAt = new Date().toISOString();
  const holdings = portfolioHoldings(portfolio);
  const leaders = leaderboardEntries(leaderboard);
  const totalAssets =
    maybeNumber(home.total_assets, home.portfolio?.total_value, portfolio.portfolio?.total_value, home.initial_capital) ?? 0;
  const initialCapital = maybeNumber(home.initial_capital, portfolio.portfolio?.total_invested) ?? 1000000;
  const cash = maybeNumber(home.cash, home.portfolio?.cash, portfolio.portfolio?.cash) ?? 0;
  const returnRate = maybeNumber(home.return_rate, home.portfolio?.return_rate, portfolio.portfolio?.return_rate) ?? 0;
  const currentRank = home.rank ?? null;
  const publicHoldings = holdings.map((holding) => toPublicHolding(holding, totalAssets));
  const currentAgentId = home.agent_id ?? home.agent?.id ?? null;

  const leaderEntries = leaders.slice(0, 10).map((entry) => ({
    rank: entry.rank,
    nickname: entry.nickname ?? entry.agent?.nickname ?? entry.agent?.username ?? "unknown",
    totalAssets: leaderboardTotalAssets(entry),
    returnRate: entry.return_rate ?? 0,
    isCurrentAgent: currentAgentId
      ? Boolean((entry.agent_id ?? entry.agent?.id) ? (entry.agent_id ?? entry.agent?.id) === currentAgentId : entry.rank === currentRank)
      : entry.rank === currentRank
  }));

  const nearbyEntries = currentRank === null
    ? []
    : leaders
        .filter((entry) => Math.abs(entry.rank - currentRank) <= 3)
        .map((entry) => ({
          rank: entry.rank,
          nickname: entry.nickname ?? entry.agent?.nickname ?? entry.agent?.username ?? "unknown",
          totalAssets: leaderboardTotalAssets(entry),
          returnRate: entry.return_rate ?? 0,
          isCurrentAgent: currentAgentId
            ? Boolean((entry.agent_id ?? entry.agent?.id) ? (entry.agent_id ?? entry.agent?.id) === currentAgentId : entry.rank === currentRank)
            : entry.rank === currentRank
        }));

  const topLeader = leaderEntries[0] ?? null;
  const previousEntry = currentRank === null
    ? null
    : leaders
        .filter((entry) => entry.rank < currentRank)
        .sort((left, right) => right.rank - left.rank)[0] ?? null;
  const tenthEntry = leaders.find((entry) => entry.rank === 10) ?? leaderEntries[9] ?? null;
  const leaderGap = topLeader && currentRank !== null ? Math.max(topLeader.totalAssets - totalAssets, 0) : null;
  const previousGap = previousEntry
    ? Math.max(leaderboardTotalAssets(previousEntry) - totalAssets, 0)
    : null;
  const topTenGap = tenthEntry && currentRank !== null && currentRank > 10
    ? Math.max(leaderboardTotalAssets(tenthEntry) - totalAssets, 0)
    : null;
  const recentTrades = tradeRecords(trades).slice(0, 20).map((trade) => ({
    symbol: trade.symbol,
    action: trade.action,
    shares: trade.shares,
    status: trade.status,
    reason: nullableString(trade.reason) ?? noteReason(trade.note),
    createdAt: nullableString(trade.created_at ?? trade.submitted_at ?? trade.executed_at)
  }));

  return {
    dashboard: {
      updatedAt,
      sourceStatus: "live",
      totalAssets,
      initialCapital,
      cash,
      frozenCash: home.frozen_cash ?? 0,
      returnRate,
      currentRank,
      metrics: [
        { label: "总资产", value: money(totalAssets), tone: "neutral" },
        { label: "收益率", value: percent(returnRate), tone: returnRate >= 0 ? "positive" : "negative" },
        { label: "当前排名", value: currentRank === null ? "未同步" : `#${currentRank}`, tone: "neutral" },
        { label: "可用现金", value: money(cash), tone: "neutral" }
      ],
      cnHoldings: publicHoldings.filter((holding) => holding.market === "CN"),
      marketSummaries: (["CN", "HK", "US"] as const).map((market) => {
        const marketHoldings = publicHoldings.filter((holding) => holding.market === market);
        const totalValue = marketHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
        const profit = marketHoldings.reduce((sum, holding) => sum + holding.profit, 0);

        return {
          market,
          label: market === "CN" ? "A 股" : market === "HK" ? "港股" : "美股",
          totalValue,
          profit,
          profitRate: totalValue > 0 ? profit / totalValue : 0,
          holdingsCount: marketHoldings.length
        };
      }),
      latestRun: null
    },
    logs: [],
    rank: {
      currentRank,
      returnRate,
      leaderGap,
      previousGap,
      topTenGap,
      leaders: leaderEntries,
      nearby: nearbyEntries,
      updatedAt
    },
    equityHistory: [],
    operations: {
      tone: "watch",
      label: "观察",
      dataAgeSeconds: null,
      latestRunStatus: null,
      latestRunFinishedAt: null,
      latestRunSummary: null,
      equityPointCount: 0,
      equityCoverageDays: 0,
      logCount: 0
    },
    recentTrades,
    strategy: {
      name: "Q-Alpha",
      version: DEFAULT_STRATEGY_VERSION,
      accountScope: DEFAULT_ACCOUNT_SCOPE,
      runMode: "live",
      parameters: Q_ALPHA_DEFAULT_PARAMETERS
    },
    account: {
      scope: DEFAULT_ACCOUNT_SCOPE,
      strategyVersion: DEFAULT_STRATEGY_VERSION,
      displayName: "Quant Lab"
    }
  };
}

function publicUpstreamFallbackSummary(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (/Signal Arena auth failed: (401|403)/.test(message)) {
    return "Signal Arena Agent World key 无效或已过期，等待更新有效量化账号 key 后同步。";
  }

  return "Signal Arena 上游暂不可用，等待 Quant Lab 首次同步。";
}

function fallbackQuantSnapshot(runs: PublicRunLog[], snapshots: SignalArenaSnapshotRow[], summary: string): PublicSnapshot {
  const now = new Date().toISOString();
  const snapshot = mergePublicData({
    dashboard: {
      updatedAt: now,
      sourceStatus: "fallback",
      totalAssets: 1000000,
      initialCapital: 1000000,
      cash: 1000000,
      frozenCash: 0,
      returnRate: 0,
      currentRank: null,
      metrics: [
        { label: "总资产", value: money(1000000), tone: "neutral" },
        { label: "收益率", value: percent(0), tone: "neutral" },
        { label: "当前排名", value: "未同步", tone: "warning" },
        { label: "可用现金", value: money(1000000), tone: "neutral" }
      ],
      cnHoldings: [],
      marketSummaries: [
        { market: "CN", label: "A 股", totalValue: 0, profit: 0, profitRate: 0, holdingsCount: 0 },
        { market: "HK", label: "港股", totalValue: 0, profit: 0, profitRate: 0, holdingsCount: 0 },
        { market: "US", label: "美股", totalValue: 0, profit: 0, profitRate: 0, holdingsCount: 0 }
      ],
      latestRun: null
    },
    logs: [],
    rank: {
      currentRank: null,
      returnRate: 0,
      leaderGap: null,
      previousGap: null,
      topTenGap: null,
      leaders: [],
      nearby: [],
      updatedAt: now
    },
    equityHistory: [],
    operations: {
      tone: "attention",
      label: "注意",
      dataAgeSeconds: null,
      latestRunStatus: null,
      latestRunFinishedAt: null,
      latestRunSummary: summary,
      equityPointCount: 0,
      equityCoverageDays: 0,
      logCount: 0
    },
    recentTrades: [],
    strategy: {
      name: "Q-Alpha",
      version: DEFAULT_STRATEGY_VERSION,
      accountScope: DEFAULT_ACCOUNT_SCOPE,
      runMode: "live",
      parameters: Q_ALPHA_DEFAULT_PARAMETERS
    },
    account: {
      scope: DEFAULT_ACCOUNT_SCOPE,
      strategyVersion: DEFAULT_STRATEGY_VERSION,
      displayName: "Quant Lab"
    }
  }, runs, snapshots);

  return {
    ...snapshot,
    operations: {
      ...snapshot.operations,
      tone: "attention",
      label: "注意",
      latestRunSummary: summary
    }
  };
}

export async function getPublicData(env: Env): Promise<PublicSnapshot> {
  let cached: PublicSnapshot | null = null;
  const scope = env.SIGNAL_ARENA_ACCOUNT_SCOPE || DEFAULT_ACCOUNT_SCOPE;
  const runs = (await listRecentRuns(env, 30, scope)).map(mapRunRowToPublicRunLog);
  const snapshots = await listRecentSnapshots(env, 300, scope);

  try {
    const candidate = sanitizePublicSnapshot(await getCachedPublicData<unknown>(env, scope));
    if (candidate) {
      cached = candidate;
      if (isFreshSnapshot(candidate)) {
        return mergePublicData(candidate, runs, snapshots);
      }
    }
  } catch {
    cached = null;
  }

  try {
    const [home, portfolio, trades, leaderboard] = await Promise.all([
      fetchArenaHome(env),
      fetchArenaPortfolio(env),
      fetchArenaTrades(env),
      fetchArenaLeaderboard(env)
    ]);

    const publicData = toPublicSnapshot(home, portfolio, trades, leaderboard);
    const snapshotWithLogs = mergePublicData(publicData, runs, snapshots);
    await putCachedPublicData(env, snapshotWithLogs, scope);
    return snapshotWithLogs;
  } catch (error) {
    if (cached) {
      return mergePublicData(withSourceStatus(cached, "stale"), runs, snapshots);
    }

    return fallbackQuantSnapshot(runs, snapshots, publicUpstreamFallbackSummary(error));
  }
}
