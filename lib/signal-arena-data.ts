import "server-only";

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

export async function getSignalArenaPublicData(): Promise<SignalArenaPublicData> {
  const baseUrl = process.env.SIGNAL_ARENA_API_URL;

  if (!baseUrl) {
    return fallbackData as SignalArenaPublicData;
  }

  try {
    return await fetchJson<SignalArenaPublicData>(`${baseUrl.replace(/\/$/, "")}/api/public/all`);
  } catch {
    return fallbackData as SignalArenaPublicData;
  }
}
