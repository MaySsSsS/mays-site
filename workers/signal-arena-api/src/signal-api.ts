import type {
  AiCandidateAction,
  ArenaApiResponse,
  ArenaHomeData,
  ArenaLeaderboardData,
  ArenaPortfolioData,
  ArenaTradesData,
  Env
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

export async function submitArenaTrade(env: Env, action: AiCandidateAction): Promise<unknown> {
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
