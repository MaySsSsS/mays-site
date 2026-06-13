export type SignalArenaMarket = "CN" | "HK" | "US";

export type SignalArenaRunStatus = "executed" | "held" | "blocked" | "skipped" | "failed";

export type SignalArenaActionType = "buy" | "sell" | "hold";

export type SignalArenaOperationsTone = "healthy" | "watch" | "quiet" | "attention";

export type SignalArenaDataSource = "live" | "imported";

export type SignalArenaDataConfidence = "high" | "medium" | "low";

export type SignalArenaSourceMeta = {
  source?: SignalArenaDataSource;
  sourceLabel?: string;
  confidence?: SignalArenaDataConfidence;
  rawSummary?: string;
};

export type SignalArenaStrategyParameters = {
  buyThreshold: number;
  sellScoreThreshold: number;
  targetPositionRate: number;
  maxPositionRate: number;
  rebalancePositionRate: number;
  minCashRate: number;
  maxHoldings: number;
  stopLossRate: number;
  takeProfitRate: number;
  recentSellPenaltyDays: number;
  maxHistorySymbolsPerRun: number;
  maxDailyBuys: number;
};

export type SignalArenaMetric = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

export type SignalArenaHolding = {
  symbol: string;
  name: string;
  market: SignalArenaMarket;
  shares: number;
  availableShares: number;
  costPrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  positionRate: number;
};

export type SignalArenaMarketSummary = {
  market: SignalArenaMarket;
  label: string;
  totalValue: number;
  profit: number;
  profitRate: number;
  holdingsCount: number;
};

export type SignalArenaCandidateAction = {
  symbol: string;
  action: SignalArenaActionType;
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
};

export type SignalArenaSnapshotState = {
  totalAssets: number;
  cash: number;
  returnRate: number;
  currentRank: number | null;
  holdingsCount: number;
};

export type SignalArenaRejectedAction = {
  symbol: string;
  action: SignalArenaActionType;
  shares: number;
  reason: string;
};

export type SignalArenaTradingSignal = {
  symbol: string;
  name: string;
  signalType: "pullback_entry" | "momentum_watch" | "take_profit_watch" | "stop_loss_watch" | "position_rebalance";
  suggestedAction: SignalArenaActionType;
  confidence: number;
  risk: "low" | "medium" | "high";
  changeRate: number | null;
  price: number | null;
  reason: string;
};

export type SignalArenaDecisionTrace = {
  beforeStateSummary: string;
  decisionRoute: string[];
  marketAssessment: string[];
  portfolioAssessment: string[];
  signalContext: SignalArenaTradingSignal[];
  rejectedActions: SignalArenaRejectedAction[];
  publicExplanation: string;
};

export type SignalArenaStrategyTrace = {
  strategyName: string;
  strategyVersion: string;
  accountScope: string;
  runMode: "dry-run" | "live";
  parameters: Partial<SignalArenaStrategyParameters>;
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
  finalAction: SignalArenaCandidateAction | null;
  riskReasons: string[];
  recentSnapshots: Array<{
    capturedAt: string | null;
    totalAssets: number;
    returnRate: number;
    rank: number | null;
  }>;
  marketRegime: string;
};

export type SignalArenaEquityPoint = SignalArenaSourceMeta & {
  id: string;
  runId: string | null;
  capturedAt: string;
  totalAssets: number;
  returnRate: number;
  currentRank: number | null;
  status: SignalArenaRunStatus | "snapshot";
  actionSummary: string | null;
  accountScope: string;
  strategyVersion: string | null;
};

export type SignalArenaRunLog = SignalArenaSourceMeta & {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SignalArenaRunStatus;
  trigger: "cron" | "manual";
  marketView: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  summary: string;
  candidates: SignalArenaCandidateAction[];
  selectedAction: SignalArenaCandidateAction | null;
  riskResult: {
    allowed: boolean;
    reasons: string[];
  };
  orderResult: {
    status: string | null;
    message: string | null;
  };
  beforeState: SignalArenaSnapshotState | null;
  decisionTrace: SignalArenaDecisionTrace | null;
  strategyTrace: SignalArenaStrategyTrace | null;
  cashPlan: string | null;
  watchlist: string[];
  afterSnapshot: SignalArenaSnapshotState | null;
  accountScope: string;
  strategyVersion: string | null;
};

export type SignalArenaRankEntry = {
  rank: number;
  nickname: string;
  totalAssets: number;
  returnRate: number;
  isCurrentAgent: boolean;
};

export type SignalArenaRank = {
  currentRank: number | null;
  returnRate: number;
  leaderGap: number | null;
  previousGap: number | null;
  topTenGap: number | null;
  leaders: SignalArenaRankEntry[];
  nearby: SignalArenaRankEntry[];
  updatedAt: string;
};

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

export type SignalArenaDashboard = {
  updatedAt: string;
  sourceStatus: "live" | "stale" | "fallback" | "error";
  totalAssets: number;
  initialCapital: number;
  cash: number;
  frozenCash: number;
  returnRate: number;
  currentRank: number | null;
  metrics: SignalArenaMetric[];
  cnHoldings: SignalArenaHolding[];
  marketSummaries: SignalArenaMarketSummary[];
  latestRun: SignalArenaRunLog | null;
};

export type SignalArenaStrategy = {
  name: string;
  version: string;
  accountScope: string;
  runMode: "live";
  parameters: SignalArenaStrategyParameters;
};

export type SignalArenaAccount = {
  scope: string;
  strategyVersion: string;
  displayName: string;
};

export type SignalArenaPublicData = {
  dashboard: SignalArenaDashboard;
  logs: SignalArenaRunLog[];
  rank: SignalArenaRank;
  equityHistory: SignalArenaEquityPoint[];
  operations: SignalArenaOperations;
  strategy: SignalArenaStrategy;
  account: SignalArenaAccount;
};
