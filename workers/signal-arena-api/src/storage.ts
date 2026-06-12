import type { Env } from "./types";

const PUBLIC_CACHE_KEY = "public:all";
const RUNNER_LOCK_KEY = "runner:lock";

export async function getCachedPublicData<T>(env: Env): Promise<T | null> {
  return await env.SIGNAL_ARENA_KV.get<T>(PUBLIC_CACHE_KEY, "json");
}

export async function putCachedPublicData(env: Env, value: unknown): Promise<void> {
  await env.SIGNAL_ARENA_KV.put(PUBLIC_CACHE_KEY, JSON.stringify(value));
}

export async function acquireRunnerLock(env: Env, runId: string, ttlSeconds: number): Promise<boolean> {
  const existing = await env.SIGNAL_ARENA_KV.get(RUNNER_LOCK_KEY);
  if (existing) {
    return false;
  }

  await env.SIGNAL_ARENA_KV.put(RUNNER_LOCK_KEY, runId, {
    expirationTtl: ttlSeconds
  });
  return true;
}

export async function releaseRunnerLock(env: Env, runId: string): Promise<void> {
  const existing = await env.SIGNAL_ARENA_KV.get(RUNNER_LOCK_KEY);
  if (existing === runId) {
    await env.SIGNAL_ARENA_KV.delete(RUNNER_LOCK_KEY);
  }
}

export async function insertRun(
  env: Env,
  run: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    trigger: string;
    marketSession: string;
    marketView: string | null;
    riskLevel: string | null;
    summary: string | null;
    candidatesJson: string;
    selectedActionJson: string | null;
    riskResultJson: string;
    orderResultJson: string | null;
    beforeStateJson?: string | null;
    decisionTraceJson?: string | null;
    afterSnapshotJson?: string | null;
    errorMessage: string | null;
  }
): Promise<void> {
  await env.SIGNAL_ARENA_DB.prepare(
    `INSERT INTO signal_arena_runs (
      id, started_at, finished_at, status, trigger, market_session,
      market_view, risk_level, summary, candidates_json, selected_action_json,
      risk_result_json, order_result_json, before_state_json, decision_trace_json,
      after_snapshot_json, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      run.id,
      run.startedAt,
      run.finishedAt,
      run.status,
      run.trigger,
      run.marketSession,
      run.marketView,
      run.riskLevel,
      run.summary,
      run.candidatesJson,
      run.selectedActionJson,
      run.riskResultJson,
      run.orderResultJson,
      run.beforeStateJson ?? null,
      run.decisionTraceJson ?? null,
      run.afterSnapshotJson ?? null,
      run.errorMessage
    )
    .run();
}

export type SignalArenaRunRow = {
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
  after_snapshot_json: string | null;
  error_message?: string | null;
};

export type SignalArenaSnapshotRow = {
  id: string;
  run_id: string | null;
  created_at: string;
  source_status: string;
  dashboard_json: string;
  rank_json: string;
};

export async function listRecentRuns(env: Env, limit = 30): Promise<SignalArenaRunRow[]> {
  if (typeof env.SIGNAL_ARENA_DB.prepare !== "function") {
    return [];
  }

  try {
    const result = await env.SIGNAL_ARENA_DB.prepare(
      `SELECT id, started_at, finished_at, status, trigger, market_view, risk_level, summary,
        candidates_json, selected_action_json, risk_result_json, order_result_json,
        before_state_json, decision_trace_json, after_snapshot_json, error_message
       FROM signal_arena_runs
       ORDER BY started_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all<SignalArenaRunRow>();

    return result.results ?? [];
  } catch {
    return [];
  }
}

export async function insertSnapshot(
  env: Env,
  snapshot: {
    id: string;
    runId: string | null;
    createdAt: string;
    sourceStatus: string;
    dashboardJson: string;
    rankJson: string;
  }
): Promise<void> {
  await env.SIGNAL_ARENA_DB.prepare(
    `INSERT INTO signal_arena_snapshots (
      id, run_id, created_at, source_status, dashboard_json, rank_json
    ) VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      snapshot.id,
      snapshot.runId,
      snapshot.createdAt,
      snapshot.sourceStatus,
      snapshot.dashboardJson,
      snapshot.rankJson
    )
    .run();
}

export async function listRecentSnapshots(env: Env, limit = 300): Promise<SignalArenaSnapshotRow[]> {
  if (typeof env.SIGNAL_ARENA_DB.prepare !== "function") {
    return [];
  }

  try {
    const result = await env.SIGNAL_ARENA_DB.prepare(
      `SELECT id, run_id, created_at, source_status, dashboard_json, rank_json
       FROM signal_arena_snapshots
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all<SignalArenaSnapshotRow>();

    return result.results ?? [];
  } catch {
    return [];
  }
}
