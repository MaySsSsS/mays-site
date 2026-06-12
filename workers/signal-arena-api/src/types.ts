export interface Env {
  SIGNAL_ARENA_DB: D1Database;
  SIGNAL_ARENA_KV: KVNamespace;
  CORS_ORIGIN: string;
  SIGNAL_ARENA_BASE_URL: string;
  SIGNAL_ARENA_AGENT_API_KEY: string;
  SIGNAL_ARENA_ACCOUNT_SCOPE?: string;
  SIGNAL_ARENA_STRATEGY_VERSION?: string;
  SIGNAL_ARENA_ADMIN_TOKEN: string;
  SIGNAL_ARENA_AI_PROVIDER: string;
  SIGNAL_ARENA_AI_BASE_URL: string;
  SIGNAL_ARENA_AI_API_KEY: string;
  SIGNAL_ARENA_AI_STRICT_MODEL: string;
  SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT: string;
  SIGNAL_ARENA_AI_LIGHT_MODEL: string;
  SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT: string;
  SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE: string;
}

export type RunnerTrigger = "cron" | "manual";

export type PublicApiError = {
  success: false;
  error: string;
  message: string;
};

export type ArenaApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ArenaHomeData = {
  agent?: {
    id?: string;
    username?: string;
  };
  joined?: boolean;
  portfolio?: {
    cash?: number;
    total_value?: number;
    return_rate?: number;
    total_fees?: number;
  };
  agent_id?: string;
  nickname?: string;
  initial_capital?: number;
  total_assets?: number;
  cash?: number;
  frozen_cash?: number;
  return_rate?: number;
  rank?: number;
  market_status?: string;
};

export type ArenaListShape<T> = T[] | Record<string, unknown>;

export type ArenaHolding = {
  symbol: string;
  name: string;
  market: "CN" | "HK" | "US";
  shares: number;
  available_shares?: number;
  avg_cost?: number;
  cost_price?: number;
  current_price?: number;
  market_value?: number;
  profit_loss?: number;
  profit?: number;
  profit_rate?: number;
};

export type ArenaPortfolioData = {
  portfolio?: {
    cash?: number;
    holdings_value?: number;
    total_value?: number;
    total_invested?: number;
    return_rate?: number;
    total_fees?: number;
    joined_at?: string;
  };
  holdings?: ArenaListShape<ArenaHolding>;
};

export type ArenaLeaderboardEntry = {
  rank: number;
  agent?: {
    id?: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
  };
  nickname?: string;
  total_assets?: number;
  total_value?: number;
  return_rate?: number;
  agent_id?: string;
};

export type ArenaLeaderboardData = {
  leaderboard?: ArenaListShape<ArenaLeaderboardEntry>;
};

export type ArenaTrade = {
  id?: string;
  order_id?: string;
  symbol: string;
  name?: string;
  market?: string;
  action: "buy" | "sell";
  shares: number;
  price?: number;
  total_amount?: number;
  commission?: number;
  stamp_tax?: number;
  total_fees?: number;
  status: string;
  note?: unknown;
  reason?: string;
  created_at?: string;
  submitted_at?: string;
  executed_at?: string;
};

export type ArenaTradesData = {
  trades?: ArenaListShape<ArenaTrade>;
};

export type ArenaTopMover = {
  symbol: string;
  name?: string;
  market?: string;
  change_rate?: number;
  changeRate?: number;
  price?: number;
  volume?: number;
};

export type ArenaTopMoverGroups = Record<string, ArenaTopMover[]>;

export type ArenaTopMoversData = {
  movers?: ArenaListShape<ArenaTopMover>;
  top_movers?: ArenaListShape<ArenaTopMover>;
};

export type ArenaSnapshot = {
  created_at?: string;
  captured_at?: string;
  total_assets?: number;
  total_value?: number;
  return_rate?: number;
  rank?: number;
  current_rank?: number;
};

export type ArenaSnapshotsData = {
  snapshots?: ArenaListShape<ArenaSnapshot>;
};

export type ArenaStock = {
  symbol: string;
  name?: string;
  market?: string;
  price?: number;
  current_price?: number;
  change_rate?: number;
  changeRate?: number;
  volume?: number;
};

export type ArenaStocksData = {
  stocks?: ArenaListShape<ArenaStock>;
  total?: number;
  page?: number;
};

export type ArenaStocksListData =
  | ArenaListShape<ArenaStock>
  | {
      stocks?: ArenaListShape<ArenaStock>;
      items?: ArenaListShape<ArenaStock>;
      records?: ArenaListShape<ArenaStock>;
      data?: ArenaListShape<ArenaStock>;
      total?: number;
    };

export type ArenaHistoryBar = {
  date?: string;
  time?: string;
  timestamp?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  price?: number;
  volume?: number;
  amount?: number;
};

export type ArenaStockHistoryData = {
  symbol?: string;
  name?: string;
  market?: string;
  history?: ArenaListShape<ArenaHistoryBar>;
  daily?: ArenaListShape<ArenaHistoryBar>;
  bars?: ArenaListShape<ArenaHistoryBar>;
  snapshots?: ArenaListShape<ArenaHistoryBar>;
};

export type DecisionPromptContext = {
  now: string;
  account: {
    totalAssets: number;
    cash: number;
    returnRate: number;
    rank: number | null;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    shares: number;
    availableShares: number;
    positionRate: number;
    profitRate: number;
  }>;
  signals: TradingSignal[];
  recentTrades: Array<{
    symbol: string;
    action: "buy" | "sell";
    shares: number;
    status: string;
    reason: string | null;
    createdAt: string | null;
  }>;
  topMovers: Array<{
    symbol: string;
    name: string;
    changeRate: number;
    price: number | null;
  }>;
  snapshots: Array<{
    capturedAt: string | null;
    totalAssets: number;
    returnRate: number;
    rank: number | null;
  }>;
  constraints: string[];
};

export type TradingSignal = {
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

export type AiCandidateAction = {
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
};

export type StrategyAction = AiCandidateAction;

export type AiDecision = {
  market_view: "cautious" | "neutral" | "aggressive";
  risk_level: "low" | "medium" | "high";
  summary: string;
  before_state_summary: string;
  decision_route: string[];
  market_assessment: string[];
  portfolio_assessment: string[];
  candidates: AiCandidateAction[];
  rejected_actions: Array<{
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    reason: string;
  }>;
  final_action: AiCandidateAction | null;
  cash_plan: string;
  watchlist: string[];
  public_explanation: string;
};

export type RiskContext = {
  isTradingSession: boolean;
  totalAssets: number;
  cash: number;
  prices: Record<string, number>;
  holdings: Record<
    string,
    {
      shares: number;
      availableShares: number;
      marketValue: number;
      positionRate: number;
    }
  >;
};

export type RiskSelection = {
  allowed: boolean;
  reasons: string[];
  selectedAction: StrategyAction | null;
};
