export type SignalArenaMarket = "CN" | "HK" | "US";

export type SignalArenaRunStatus = "executed" | "held" | "blocked" | "skipped" | "failed";

export type SignalArenaActionType = "buy" | "sell" | "hold";

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

export type SignalArenaRunLog = {
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
  leaders: SignalArenaRankEntry[];
  nearby: SignalArenaRankEntry[];
  updatedAt: string;
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

export type SignalArenaPublicData = {
  dashboard: SignalArenaDashboard;
  logs: SignalArenaRunLog[];
  rank: SignalArenaRank;
};
