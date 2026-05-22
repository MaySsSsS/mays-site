import "server-only";

import fallbackData from "@/public/data/signal-arena/fallback.json";
import type { SignalArenaPublicData } from "@/types/signal-arena";

const DEFAULT_TIMEOUT_MS = 8000;
const SOURCE_STATUSES = new Set(["live", "stale", "fallback", "error"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSignalArenaPublicData(value: unknown): value is SignalArenaPublicData {
  if (!isRecord(value) || !isRecord(value.dashboard) || !isRecord(value.rank)) {
    return false;
  }

  const { dashboard, logs, rank } = value;

  return (
    typeof dashboard.updatedAt === "string" &&
    typeof dashboard.sourceStatus === "string" &&
    SOURCE_STATUSES.has(dashboard.sourceStatus) &&
    Array.isArray(dashboard.metrics) &&
    Array.isArray(dashboard.cnHoldings) &&
    Array.isArray(dashboard.marketSummaries) &&
    Array.isArray(logs) &&
    typeof rank.updatedAt === "string" &&
    Array.isArray(rank.leaders) &&
    Array.isArray(rank.nearby)
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Signal Arena worker returned ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSignalArenaPublicData(): Promise<SignalArenaPublicData> {
  const baseUrl = process.env.SIGNAL_ARENA_API_URL;

  if (!baseUrl) {
    return fallbackData as SignalArenaPublicData;
  }

  try {
    const data = await fetchJson<unknown>(`${baseUrl.replace(/\/$/, "")}/api/public/all`);

    if (isSignalArenaPublicData(data)) {
      return data;
    }

    return fallbackData as SignalArenaPublicData;
  } catch {
    return fallbackData as SignalArenaPublicData;
  }
}
