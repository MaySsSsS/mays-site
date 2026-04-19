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

export function formatPlaytime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours} 小时 ${remainingMinutes} 分钟`
      : `${hours} 小时`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} 天 ${remainingHours} 小时`;
}

export function formatCompactHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k_h`;
  }
  return `${hours}h`;
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
  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "1d_ago";
  }
  if (diffDays < 30) {
    return `${diffDays}d_ago`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)}mo_ago`;
  }
  return `${Math.floor(diffDays / 365)}y_ago`;
}

export function formatActivityDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

export function formatSyncDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function getGameHeaderImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function getGameCapsuleImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}
