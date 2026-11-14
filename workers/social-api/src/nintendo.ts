import { SocialApiError } from "./psn.js";
import { summariseMoon, type MoonDailySummary } from "./parse.js";
import type { SocialSnapshot } from "./types.js";

const TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/token";
const ME_URL = "https://api.accounts.nintendo.com/2.0.0/users/me";
// 2026-11 任天堂把家长控制接口换到了 znma 新域名，旧 /moon/v1 会返回 400 update_required。
const MOON_URL = "https://app.lp1.znma.srv.nintendo.net";
const CLIENT_ID = "54789befb391a838";
const MOON_VERSION = "2.6.0";
const MOON_BUILD = "700";
const OS_VERSION = "34";
const DEVICE_MODEL = "Pixel 4 XL";
const USER_AGENT = `moon_ANDROID/${MOON_VERSION} (com.nintendo.znma; build:${MOON_BUILD}; ANDROID ${OS_VERSION})`;
const MAX_DEVICES = 5;

/** moon 用 id_token 当 Bearer（pynintendoparental 也是这么做的），access_token 留作兜底。 */
interface NintendoTokens {
  accessToken: string;
  idToken: string;
}

async function fail(prefix: string, response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  const kind = response.status === 401 || response.status === 403
    ? "needs_relogin"
    : response.status === 429 || response.status >= 500
      ? "retryable"
      : body.toLowerCase().includes("invalid") ? "needs_relogin" : "fatal";
  throw new SocialApiError(`${prefix}: HTTP ${response.status} ${body.slice(0, 200)}`, kind);
}

/** session token → 短效 access/id token（每次采集现取，不落库）。 */
export async function nintendoAccessToken(sessionToken: string): Promise<NintendoTokens> {
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
  const data = (await response.json()) as { access_token?: string; id_token?: string };
  const accessToken = data.access_token ?? data.id_token;
  if (!accessToken) throw new SocialApiError("任天堂没有返回 access token", "fatal");
  return { accessToken, idToken: data.id_token ?? accessToken };
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

function moonHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Moon-App-Id": "com.nintendo.znma",
    "X-Moon-Os": "ANDROID",
    "X-Moon-Os-Version": OS_VERSION,
    "X-Moon-Model": DEVICE_MODEL,
    "X-Moon-TimeZone": "Asia/Shanghai",
    "X-Moon-Os-Language": "zh-CN",
    "X-Moon-App-Language": "zh-CN",
    "X-Moon-App-Display-Version": MOON_VERSION,
    "X-Moon-App-Internal-Version": MOON_BUILD,
    "User-Agent": USER_AGENT,
  };
}

/**
 * moon 的鉴权用 id_token，但不同版本偶尔认 access_token，
 * 所以 401 时换另一个 token 再试一次，别直接判定「需要重新登录」。
 */
async function moonGet<T>(tokens: NintendoTokens, path: string): Promise<T> {
  const request = (token: string) => fetch(`${MOON_URL}${path}`, { headers: moonHeaders(token) });
  let response = await request(tokens.idToken);
  if (response.status === 401 && tokens.accessToken !== tokens.idToken) {
    response = await request(tokens.accessToken);
  }
  if (!response.ok) await fail(`任天堂 ${path}`, response);
  return (await response.json()) as T;
}

interface MoonUser {
  nickname?: string;
  imageUri?: string;
}

interface MoonDevices {
  ownedDevices?: { deviceId?: string; label?: string }[];
  devices?: { deviceId?: string; serialNumber?: string }[];
}

interface MoonDailySummaries {
  dailySummaries?: MoonDailySummary[];
  items?: MoonDailySummary[];
}

/**
 * 任天堂只走 Parental Controls 接口（moon）：
 * 设备列表 → 每台设备的每日汇总 → 按游戏聚合时长。
 */
export async function nintendoSnapshot(sessionToken: string): Promise<SocialSnapshot> {
  const tokens = await nintendoAccessToken(sessionToken);
  const meResponse = await fetch(ME_URL, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
  if (!meResponse.ok) await fail("任天堂读取账号失败", meResponse);
  const me = (await meResponse.json()) as MoonUser & { id?: string };
  if (!me.id) throw new SocialApiError("任天堂账号缺少 id", "fatal");

  const devices = await moonGet<MoonDevices>(tokens, "/v2/actions/user/fetchOwnedDevices");
  const deviceIds = [...(devices.ownedDevices ?? []), ...(devices.devices ?? [])]
    .map((device) => device.deviceId)
    .filter((id): id is string => Boolean(id))
    .slice(0, MAX_DEVICES);

  const summaries: MoonDailySummary[] = [];
  for (const deviceId of deviceIds) {
    const daily = await moonGet<MoonDailySummaries>(
      tokens,
      `/v2/actions/playSummary/fetchDailySummaries?deviceId=${encodeURIComponent(deviceId)}`,
    );
    summaries.push(...(daily.dailySummaries ?? daily.items ?? []));
  }

  const totals = summariseMoon(summaries);
  return {
    platform: "nintendo",
    profile: {
      name: me.nickname ?? "Nintendo",
      avatarUrl: me.imageUri ?? totals.players[0]?.imageUrl ?? null,
    },
    games: totals.games,
    totalMinutes: totals.totalMinutes,
    gameCount: totals.games.length,
    generatedAt: new Date().toISOString(),
  };
}
