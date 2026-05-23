export interface Env {
  SIGNAL_ARENA_DB: D1Database;
  SIGNAL_ARENA_KV: KVNamespace;
  CORS_ORIGIN: string;
  SIGNAL_ARENA_BASE_URL: string;
  SIGNAL_ARENA_AGENT_API_KEY: string;
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
  holdings?: Array<{
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
  }>;
};

export type ArenaLeaderboardData = {
  leaderboard?: Array<{
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
  }>;
};

export type ArenaTradesData = {
  trades?: Array<{
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
  }>;
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
  signals: Array<{
    symbol: string;
    name: string;
    changeRate: number;
  }>;
  constraints: string[];
};

export type AiCandidateAction = {
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
};

export type AiDecision = {
  market_view: "cautious" | "neutral" | "aggressive";
  risk_level: "low" | "medium" | "high";
  summary: string;
  candidates: AiCandidateAction[];
  cash_plan: string;
  watchlist: string[];
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
  selectedAction: AiCandidateAction | null;
};
