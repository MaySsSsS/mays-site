import type {
  ArenaApiResponse,
  ArenaHomeData,
  ArenaStockHistoryData,
  ArenaStocksData,
  ArenaStocksListData,
  ArenaLeaderboardData,
  ArenaPortfolioData,
  ArenaSnapshotsData,
  ArenaTopMoversData,
  ArenaTradesData,
  Env,
  StrategyAction
} from "./types";

async function requestArena<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("agent-auth-api-key", env.SIGNAL_ARENA_AGENT_API_KEY);

  const response = await fetch(`${env.SIGNAL_ARENA_BASE_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers
  });

  let body: ArenaApiResponse<T> | null = null;

  try {
    body = (await response.json()) as ArenaApiResponse<T>;
  } catch {
    throw new Error(`Signal Arena request failed: ${response.status}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Signal Arena auth failed: ${response.status}`);
  }

  if (!response.ok || !body || body.success === false || !body.data) {
    throw new Error(`Signal Arena request failed: ${response.status}`);
  }

  return body.data;
}

export async function fetchArenaHome(env: Env): Promise<ArenaHomeData> {
  return await requestArena<ArenaHomeData>(env, "/api/v1/arena/home");
}

export async function fetchArenaPortfolio(env: Env): Promise<ArenaPortfolioData> {
  return await requestArena<ArenaPortfolioData>(env, "/api/v1/arena/portfolio");
}

export async function fetchArenaTrades(env: Env): Promise<ArenaTradesData> {
  return await requestArena<ArenaTradesData>(env, "/api/v1/arena/trades");
}

export async function fetchArenaLeaderboard(env: Env): Promise<ArenaLeaderboardData> {
  return await requestArena<ArenaLeaderboardData>(env, "/api/v1/arena/leaderboard");
}

export async function fetchArenaTopMovers(env: Env): Promise<ArenaTopMoversData> {
  return await requestArena<ArenaTopMoversData>(env, "/api/v1/arena/top-movers");
}

export async function fetchArenaSnapshots(env: Env): Promise<ArenaSnapshotsData> {
  return await requestArena<ArenaSnapshotsData>(env, "/api/v1/arena/snapshots");
}

export async function fetchArenaStocks(env: Env, market = "CN", limit = 300): Promise<ArenaStocksData> {
  const params = new URLSearchParams({ market, limit: String(limit) });
  return await requestArena<ArenaStocksData>(env, `/api/v1/arena/stocks?${params.toString()}`);
}

export async function fetchArenaStocksList(env: Env): Promise<ArenaStocksListData> {
  return await requestArena<ArenaStocksListData>(env, "/api/v1/arena/stocks-list");
}

export async function fetchArenaStockHistory(env: Env, symbol: string): Promise<ArenaStockHistoryData> {
  const params = new URLSearchParams({ symbol });
  return await requestArena<ArenaStockHistoryData>(env, `/api/v1/arena/stock-history?${params.toString()}`);
}

export async function submitArenaTrade(env: Env, action: StrategyAction): Promise<unknown> {
  return await requestArena<unknown>(env, "/api/v1/arena/trade", {
    method: "POST",
    body: JSON.stringify({
      symbol: action.symbol,
      action: action.action,
      shares: action.shares,
      reason: action.reason
    })
  });
}
