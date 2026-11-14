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

export function sumMinutes(games: SocialGame[]): number {
  return games.reduce((total, game) => total + Math.max(0, Math.round(game.minutes)), 0);
}
