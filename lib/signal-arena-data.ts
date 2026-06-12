import "server-only";

import { toSignalArenaPublicData } from "@/lib/signal-arena-sanitize";
import fallbackData from "@/public/data/signal-arena/fallback.json";
import type { SignalArenaPublicData } from "@/types/signal-arena";

const DEFAULT_TIMEOUT_MS = 8000;

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

function fallback(): SignalArenaPublicData {
  return toSignalArenaPublicData(fallbackData) ?? (fallbackData as SignalArenaPublicData);
}

export async function getSignalArenaPublicData(): Promise<SignalArenaPublicData> {
  const baseUrl = process.env.SIGNAL_ARENA_API_URL;

  if (!baseUrl) {
    return fallback();
  }

  try {
    const data = await fetchJson<unknown>(`${baseUrl.replace(/\/$/, "")}/api/public/all`);
    return toSignalArenaPublicData(data) ?? fallback();
  } catch {
    return fallback();
  }
}
