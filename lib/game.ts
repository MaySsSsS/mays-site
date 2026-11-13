import type { GameData, GameStats } from "@/types/steam";

export const GAME_API_URL =
  process.env.NEXT_PUBLIC_GAME_API_URL ??
  "https://mays-game-api.mays.workers.dev";

export function buildGameStats(games: GameData[]): GameStats {
  const sortedGames = [...games].sort(
    (left, right) => right.playtime_forever - left.playtime_forever
  );
  const recentGames = games.filter(
    (game) => game.playtime_2weeks && game.playtime_2weeks > 0
  );

  return {
    totalGames: games.length,
    totalPlaytime: games.reduce(
      (total, game) => total + game.playtime_forever,
      0
    ),
    recentlyPlayed: recentGames.length,
    mostPlayed: sortedGames[0] ?? null
  };
}

export function getTopGames(games: GameData[], limit = 10): GameData[] {
  return [...games]
    .sort((left, right) => right.playtime_forever - left.playtime_forever)
    .slice(0, limit);
}

export function getRecentlyPlayedGames(
  games: GameData[],
  limit = 6
): GameData[] {
  return [...games]
    .filter((game) => game.rtime_last_played)
    .sort(
      (left, right) =>
        (right.rtime_last_played ?? 0) - (left.rtime_last_played ?? 0)
    )
    .slice(0, limit);
}

export function getFeaturedGames(games: GameData[], limit = 6): GameData[] {
  return [...games]
    .filter((game) => game.playtime_forever > 0)
    .sort((left, right) => right.playtime_forever - left.playtime_forever)
    .slice(0, limit);
}

export function formatCompactHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours === 0) {
    return `${Math.max(minutes, 0)} 分钟`;
  }
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k h`;
  }
  return `${hours} h`;
}

export function formatTotalHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (!hours) {
    return "---";
  }
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k`;
  }
  return `${hours}`;
}

export function formatRelativePlayed(timestamp: number): string {
  const diffDays = Math.floor((Date.now() / 1000 - timestamp) / 86400);
  if (diffDays <= 0) {
    return "今天";
  }
  if (diffDays === 1) {
    return "昨天";
  }
  if (diffDays < 30) {
    return `${diffDays} 天前`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} 个月前`;
  }
  return `${Math.floor(diffDays / 365)} 年前`;
}

export function formatActivityDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function formatSyncDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getGameHeaderImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function getGameCapsuleImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}
