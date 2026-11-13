import { SocialApiError } from "./psn.js";
import { summariseMoon, type MoonDailySummary } from "./parse.js";
import type { SocialSnapshot } from "./types.js";

const TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/token";
const ME_URL = "https://api.accounts.nintendo.com/2.0.0/users/me";
const MOON_URL = "https://api-lp1.pctl.srv.nintendo.net/moon";
const CLIENT_ID = "54789befb391a838";
const MOON_VERSION = "1.17.0";
const MOON_BUILD = "261";
const USER_AGENT = `moon_ANDROID/${MOON_VERSION} (com.nintendo.znma; build:${MOON_BUILD}; ANDROID 26)`;
const MAX_DEVICES = 5;

async function fail(prefix: string, response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  const kind = response.status === 401 || response.status === 403
    ? "needs_relogin"
    : response.status === 429 || response.status >= 500
      ? "retryable"
      : body.toLowerCase().includes("invalid") ? "needs_relogin" : "fatal";
  throw new SocialApiError(`${prefix}: HTTP ${response.status} ${body.slice(0, 200)}`, kind);
}

/** session token → 短效 access token（每次采集现取，不落库）。 */
export async function nintendoAccessToken(sessionToken: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      session_token: sessionToken,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
    }).toString(),
  });
  if (!response.ok) await fail("任天堂换取 access token 失败", response);
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new SocialApiError("任天堂没有返回 access_token", "fatal");
  return data.access_token;
}

const SESSION_TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/session_token";

/** 登录页拿到的 session_token_code + PKCE verifier → 长效 session_token（一次性，只做一次）。 */
export async function nintendoExchangeSessionToken(
  sessionTokenCode: string,
  codeVerifier: string,
): Promise<string> {
  const response = await fetch(SESSION_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      session_token_code: sessionTokenCode.trim(),
      session_token_code_verifier: codeVerifier.trim(),
    }).toString(),
  });
  if (!response.ok) await fail("任天堂换取 session token 失败", response);
  const data = (await response.json()) as { session_token?: string };
  if (!data.session_token) throw new SocialApiError("任天堂没有返回 session_token", "fatal");
  return data.session_token;
}

function moonHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Moon-App-Id": "com.nintendo.znma",
    "X-Moon-Os": "ANDROID",
    "X-Moon-Os-Version": "26",
    "X-Moon-TimeZone": "Asia/Shanghai",
    "X-Moon-Os-Language": "zh-CN",
    "X-Moon-App-Language": "zh-CN",
    "X-Moon-App-Display-Version": MOON_VERSION,
    "X-Moon-App-Internal-Version": MOON_BUILD,
    "User-Agent": USER_AGENT,
  };
}

async function moonGet<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`${MOON_URL}${path}`, { headers: moonHeaders(accessToken) });
  if (!response.ok) await fail(`任天堂 ${path}`, response);
  return (await response.json()) as T;
}

interface MoonUser {
  nickname?: string;
  imageUri?: string;
}

interface MoonDevices {
  devices?: { deviceId?: string; serialNumber?: string }[];
}

interface MoonDailySummaries {
  items?: MoonDailySummary[];
}

/**
 * 任天堂只走 Parental Controls 接口（moon）：
 * 设备列表 → 每台设备的每日汇总 → 按游戏聚合时长。
 */
export async function nintendoSnapshot(sessionToken: string): Promise<SocialSnapshot> {
  const accessToken = await nintendoAccessToken(sessionToken);
  const meResponse = await fetch(ME_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!meResponse.ok) await fail("任天堂读取账号失败", meResponse);
  const me = (await meResponse.json()) as { id?: string };
  if (!me.id) throw new SocialApiError("任天堂账号缺少 id", "fatal");

  const user = await moonGet<MoonUser>(accessToken, `/v1/users/${me.id}`);
  const devices = await moonGet<MoonDevices>(accessToken, `/v1/users/${me.id}/devices`);
  const deviceIds = (devices.devices ?? [])
    .map((device) => device.deviceId)
    .filter((id): id is string => Boolean(id))
    .slice(0, MAX_DEVICES);

  const summaries: MoonDailySummary[] = [];
  for (const deviceId of deviceIds) {
    const daily = await moonGet<MoonDailySummaries>(accessToken, `/v1/devices/${deviceId}/daily_summaries`);
    summaries.push(...(daily.items ?? []));
  }

  const totals = summariseMoon(summaries);
  return {
    platform: "nintendo",
    profile: { name: user.nickname ?? "Nintendo", avatarUrl: user.imageUri ?? null },
    games: totals.games,
    totalMinutes: totals.totalMinutes,
    gameCount: totals.games.length,
    generatedAt: new Date().toISOString(),
  };
}
