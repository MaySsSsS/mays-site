import type { SocialGame } from "./types.js";

/** PSN 的游玩时长是 ISO 8601 duration，例如 "PT228H56M33S"、"PT45M"、"PT12S"。 */
export function parseIsoDurationMinutes(value: string | null | undefined): number {
  if (!value) return 0;
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value.trim());
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  const total =
    Number(days ?? 0) * 1440 +
    Number(hours ?? 0) * 60 +
    Number(minutes ?? 0) +
    Math.floor(Number(seconds ?? 0) / 60);
  return Number.isFinite(total) ? total : 0;
}

export type ErrorKind = "needs_relogin" | "retryable" | "fatal";

/**
 * 只有明确的「凭证失效」才要求重新登录。网络抖动、限流、5xx 一律当可重试，
 * 否则一次超时就会把用户踢回登录页。
 */
export function classifyHttpStatus(status: number): ErrorKind {
  if (status === 401 || status === 403) return "needs_relogin";
  if (status === 429 || status >= 500) return "retryable";
  return "fatal";
}

export function classifyErrorBody(body: string): ErrorKind {
  const text = body.toLowerCase();
  if (text.includes("invalid_grant") || text.includes("invalid_token") || text.includes("expired")) {
    return "needs_relogin";
  }
  return "retryable";
}

export interface MoonTitle {
  applicationId?: string;
  title?: string;
  imageUri?: { small?: string; medium?: string; large?: string };
}

export interface MoonImage {
  small?: string;
  medium?: string;
  large?: string;
}

export interface MoonPlayerTitle {
  applicationId?: string;
  playingTime?: number;
  firstPlayDate?: string | null;
  meta?: MoonTitle & { shopUri?: string };
}

export interface MoonPlayerProfile {
  playerId?: string;
  nickname?: string;
  imageUri?: string;
}

export interface MoonPlayer {
  playerId?: string;
  nickname?: string;
  imageUri?: string;
  profile?: MoonPlayerProfile;
  playingTime?: number;
  /** 旧版 moon：按游戏的时长在 playedApps 里。 */
  playedApps?: MoonPlayerTitle[];
  /** 新版 moon（app.lp1.znma / v2）：按游戏的时长与元数据在 playedGames 里。 */
  playedGames?: MoonPlayerTitle[];
}

export interface MoonDailySummary {
  date?: string;
  playingTime?: number;
  playedApps?: MoonTitle[];
  /** 新版 moon 把玩家直接放在 players 里。 */
  players?: MoonPlayer[];
  devicePlayers?: MoonPlayer[];
  anonymousPlayer?: MoonPlayer | null;
  lastPlayedAt?: number | null;
}

export interface MoonTotals {
  games: SocialGame[];
  totalMinutes: number;
  players: { name: string; minutes: number; imageUrl: string | null }[];
}

/**
 * moon 每日汇总里每款游戏的时长藏在玩家对象里：
 * 新版是 `players[].playedGames[].playingTime`，旧版是 `devicePlayers[].playedApps[].playingTime`，
 * 顶层 `playedApps` 只给标题元数据。两套结构都兼容，避免接口换版后再坏一次。
 */
export function summariseMoon(summaries: MoonDailySummary[]): MoonTotals {
  const meta = new Map<string, MoonTitle>();
  const minutesByApp = new Map<string, number>();
  const lastPlayedByApp = new Map<string, string | null>();
  const players = new Map<string, { name: string; minutes: number; imageUrl: string | null }>();
  let totalMinutes = 0;

  for (const summary of summaries) {
    totalMinutes += Math.max(0, Math.round(summary.playingTime ?? 0));
    const day = summary.date ?? null;

    for (const app of summary.playedApps ?? []) {
      if (!app.applicationId) continue;
      meta.set(app.applicationId, app);
      if (day && !lastPlayedByApp.has(app.applicationId)) {
        lastPlayedByApp.set(app.applicationId, day);
      }
    }

    const allPlayers = [
      ...(summary.players ?? []),
      ...(summary.devicePlayers ?? []),
      ...(summary.anonymousPlayer ? [summary.anonymousPlayer] : []),
    ];
    for (const player of allPlayers) {
      const playerId = player.playerId ?? player.profile?.playerId;
      const nickname = player.nickname ?? player.profile?.nickname;
      const imageUri = player.imageUri ?? player.profile?.imageUri;
      const key = playerId ?? nickname ?? "unknown";
      if (playerId || nickname) {
        const entry = players.get(key) ?? { name: nickname ?? key, minutes: 0, imageUrl: imageUri ?? null };
        entry.minutes += Math.max(0, Math.round(player.playingTime ?? 0));
        players.set(key, entry);
      }
      for (const title of [...(player.playedGames ?? []), ...(player.playedApps ?? [])]) {
        const applicationId = title.applicationId ?? title.meta?.applicationId;
        if (!applicationId) continue;
        if (title.meta) meta.set(applicationId, title.meta);
        minutesByApp.set(
          applicationId,
          (minutesByApp.get(applicationId) ?? 0) + Math.max(0, Math.round(title.playingTime ?? 0)),
        );
      }
    }
  }

  const games: SocialGame[] = [...meta.entries()].map(([id, app]) => ({
    id,
    name: app.title ?? id,
    imageUrl: app.imageUri?.medium ?? app.imageUri?.large ?? app.imageUri?.small ?? null,
    bannerUrl: null,
    minutes: minutesByApp.get(id) ?? 0,
    lastPlayedAt: lastPlayedByApp.get(id) ?? null,
  }));

  return {
    games: games.sort((a, b) => b.minutes - a.minutes),
    totalMinutes,
    players: [...players.values()].sort((a, b) => b.minutes - a.minutes),
  };
}

export function sumMinutes(games: SocialGame[]): number {
  return games.reduce((total, game) => total + Math.max(0, Math.round(game.minutes)), 0);
}
