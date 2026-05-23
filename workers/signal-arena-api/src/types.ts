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
  holdings?: Array<{
    symbol: string;
    name: string;
    market: "CN" | "HK" | "US";
    shares: number;
    available_shares?: number;
    cost_price?: number;
    current_price?: number;
    market_value?: number;
    profit?: number;
    profit_rate?: number;
  }>;
};

export type ArenaLeaderboardData = {
  leaderboard?: Array<{
    rank: number;
    nickname: string;
    total_assets?: number;
    return_rate?: number;
    agent_id?: string;
  }>;
};

export type ArenaTradesData = {
  trades?: Array<{
    id?: string;
    order_id?: string;
    symbol: string;
    action: "buy" | "sell";
    shares: number;
    status: string;
    reason?: string;
    created_at?: string;
  }>;
};
