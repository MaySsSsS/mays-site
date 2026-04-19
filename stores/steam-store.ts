"use client";

import { create } from "zustand";

import {
  buildGameStats,
  formatPlaytime,
  GAME_API_URL,
  getGameCapsuleImage,
  getGameHeaderImage,
  getRecentlyPlayedGames,
  getTopGames
} from "@/lib/game";
import type {
  GameData,
  GameStats,
  SteamDataPayload,
  SteamPlayerSummary
} from "@/types/steam";

interface SteamStoreState {
  games: GameData[];
  playerInfo: SteamPlayerSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  hydrate: (payload: SteamDataPayload) => void;
  fetchGamesData: () => Promise<void>;
  getGameStats: () => GameStats;
  getTopGames: (limit?: number) => GameData[];
  getRecentlyPlayed: (limit?: number) => GameData[];
  formatPlaytime: (minutes: number) => string;
  getGameHeaderImage: (appid: number) => string;
  getGameCapsuleImage: (appid: number) => string;
}

function normalizeSteamPayload(payload: unknown): SteamDataPayload {
  const record = (payload ?? {}) as Record<string, unknown>;

  return {
    games: Array.isArray(record.games)
      ? (record.games as GameData[])
      : [],
    player:
      (record.player as SteamPlayerSummary | null | undefined) ??
      (record.playerInfo as SteamPlayerSummary | null | undefined) ??
      null,
    lastUpdated:
      typeof record.lastUpdated === "string" ? record.lastUpdated : null
  };
}

export const useSteamStore = create<SteamStoreState>((set, get) => ({
  games: [],
  playerInfo: null,
  loading: false,
  error: null,
  lastUpdated: null,
  hydrate: (payload) => {
    set({
      games: payload.games ?? [],
      playerInfo: payload.player ?? null,
      lastUpdated: payload.lastUpdated ?? null,
      error: null
    });
  },
  fetchGamesData: async () => {
    set({ loading: true, error: null });

    try {
      let payload: SteamDataPayload | null = null;

      try {
        const response = await fetch(`${GAME_API_URL}/api/steam-games`);
        if (!response.ok) {
          throw new Error("API request failed");
        }
        payload = normalizeSteamPayload(await response.json());
      } catch {
        const fallbackResponse = await fetch("/data/steam-games.json");
        if (!fallbackResponse.ok) {
          throw new Error("无法加载游戏数据");
        }
        payload = normalizeSteamPayload(await fallbackResponse.json());
      }

      set({
        games: payload.games,
        playerInfo: payload.player,
        lastUpdated: payload.lastUpdated,
        error: null
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "加载数据失败"
      });
    } finally {
      set({ loading: false });
    }
  },
  getGameStats: () => buildGameStats(get().games),
  getTopGames: (limit) => getTopGames(get().games, limit),
  getRecentlyPlayed: (limit) => getRecentlyPlayedGames(get().games, limit),
  formatPlaytime,
  getGameHeaderImage,
  getGameCapsuleImage
}));
