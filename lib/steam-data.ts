import "server-only";

import steamSnapshot from "@/public/data/steam-games.json";

import type { SteamDataPayload, SteamPlayerSummary } from "@/types/steam";

const GAME_API_URL =
  process.env.NEXT_PUBLIC_GAME_API_URL ??
  "https://mays-game-api.mays.workers.dev";

function normalizeSteamPayload(payload: unknown): SteamDataPayload {
  const record = (payload ?? {}) as Record<string, unknown>;

  return {
    games: Array.isArray(record.games)
      ? (record.games as SteamDataPayload["games"])
      : [],
    player:
      (record.player as SteamPlayerSummary | null | undefined) ??
      (record.playerInfo as SteamPlayerSummary | null | undefined) ??
      null,
    lastUpdated:
      typeof record.lastUpdated === "string" ? record.lastUpdated : null
  };
}

export async function getSteamGamesData(): Promise<SteamDataPayload> {
  try {
    const response = await fetch(`${GAME_API_URL}/api/steam-games`, {
      headers: {
        Accept: "application/json"
      },
      next: {
        revalidate: 3600
      }
    });

    if (response.ok) {
      const payload = normalizeSteamPayload(await response.json());
      if (payload.games.length > 0) {
        return payload;
      }
    }
  } catch {
    // The bundled snapshot keeps the game pages available if the Worker is down.
  }

  return normalizeSteamPayload(steamSnapshot);
}
