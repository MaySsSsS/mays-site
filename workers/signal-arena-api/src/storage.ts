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
