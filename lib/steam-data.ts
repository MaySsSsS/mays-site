import "server-only";

import steamSnapshot from "@/public/data/steam-games.json";

import type { SteamDataPayload, SteamPlayerSummary } from "@/types/steam";

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
  return normalizeSteamPayload(steamSnapshot);
}
