import { SocialApiError } from "./psn.js";
import type { SocialGame, SocialSnapshot } from "./types.js";
import { fetchZncaF, type ZncaConfig } from "./znca.js";

const ACCOUNT_TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/token";
const SESSION_TOKEN_URL = "https://accounts.nintendo.com/connect/1.0.0/api/session_token";
const ME_URL = "https://api.accounts.nintendo.com/2.0.0/users/me";
/** NSO 客户端（PlayLog 数据的持有者） */
const NSO_CLIENT_ID = "71b963c1b7b6d119";
/** 家长控制（znma）客户端：只用于兜底，现有 D1 里的 session_token 是它签发的 */
const ZNMA_CLIENT_ID = "54789befb391a838";
const ZNC_URL = "https://api-lp1.znc.srv.nintendo.net";
const ZNCA_VERSION = "3.5.0";
const ZNCA_PLATFORM = "Android";
const ZNCA_PLATFORM_VERSION = "12";
const USER_AGENT = `com.nintendo.znca/${ZNCA_VERSION}(${ZNCA_PLATFORM}/${ZNCA_PLATFORM_VERSION})`;

async function fail(prefix: string, response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  const kind = response.status === 401 || response.status === 403
    ? "needs_relogin"
    : response.status === 429 || response.status >= 500
      ? "retryable"
      : body.toLowerCase().includes("invalid") ? "needs_relogin" : "fatal";
  throw new SocialApiError(`${prefix}: HTTP ${response.status} ${body.slice(0, 200)}`, kind);
}

export interface NintendoIdTokens {
  /** 哪个 client 换出的令牌：NSO 的 id_token 才能登 coral */
  clientId: string;
  accessToken: string;
  idToken: string;
}

/**
 * session token → 短效 access/id token（每次采集现取，不落库）。
 * 先按 NSO 客户端换（coral 只认 NSO 的 id_token），失败再退回 znma，
 * 这样历史上用家长控制登录留下的 session_token 也能继续用。
 */
export async function nintendoIdTokens(sessionToken: string): Promise<NintendoIdTokens> {
  let lastError: SocialApiError | null = null;
  for (const clientId of [NSO_CLIENT_ID, ZNMA_CLIENT_ID]) {
    const response = await fetch(ACCOUNT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        session_token: sessionToken,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
      }).toString(),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      lastError = new SocialApiError(
        `任天堂换取令牌失败（client ${clientId}）: HTTP ${response.status} ${body.slice(0, 200)}`,
        response.status === 401 ? "needs_relogin" : "retryable",
      );
      continue;
    }
    const data = (await response.json()) as { access_token?: string; id_token?: string };
    const idToken = data.id_token ?? data.access_token;
    if (!idToken) continue;
    return { clientId, accessToken: data.access_token ?? idToken, idToken };
  }
  throw lastError ?? new SocialApiError("任天堂没有返回令牌", "needs_relogin");
}

/**
 * 登录页拿到的 session_token_code + PKCE verifier → 长效 session_token（一次性，只做一次）。
 * 默认用 NSO 客户端，这样拿到的令牌可以直接登 coral。
 */
export async function nintendoExchangeSessionToken(
  sessionTokenCode: string,
  codeVerifier: string,
  clientId: string = NSO_CLIENT_ID,
): Promise<string> {
  const response = await fetch(SESSION_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      session_token_code: sessionTokenCode.trim(),
      session_token_code_verifier: codeVerifier.trim(),
    }).toString(),
  });
  if (!response.ok) await fail("任天堂换取 session token 失败", response);
  const data = (await response.json()) as { session_token?: string };
  if (!data.session_token) throw new SocialApiError("任天堂没有返回 session_token", "fatal");
  return data.session_token;
}

interface NintendoAccount {
  id?: string;
  nickname?: string;
  country?: string;
  language?: string;
}

async function fetchAccountUser(accessToken: string): Promise<NintendoAccount> {
  const response = await fetch(ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": USER_AGENT },
  });
  if (!response.ok) await fail("任天堂读取账号失败", response);
  const me = (await response.json()) as NintendoAccount;
  if (!me.id) throw new SocialApiError("任天堂账号缺少 id", "fatal");
  return me;
}

interface CoralUser {
  id?: number;
  nsaId?: string;
  name?: string;
  imageUri?: string;
}

interface CoralResponse<T> {
  status?: number;
  result?: T;
}

/** NSO 后端统一是 POST + {parameter} 包一层，成功要求 status === 0。 */
async function coralPost<T>(
  path: string,
  parameter: unknown,
  accessToken: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json",
    "Accept-Language": "en-GB",
    "User-Agent": USER_AGENT,
    "X-Platform": ZNCA_PLATFORM,
    "X-ProductVersion": ZNCA_VERSION,
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${ZNC_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ parameter }),
  });
  if (!response.ok) await fail(`任天堂 ${path}`, response);

  const data = (await response.json()) as CoralResponse<T>;
  if (typeof data.status === "number" && data.status !== 0) {
    throw new SocialApiError(
      `任天堂 ${path} 返回 status ${data.status}`,
      data.status === 9403 || data.status === 9427 ? "fatal" : "retryable",
    );
  }
  if (!data.result) throw new SocialApiError(`任天堂 ${path} 没有返回结果`, "retryable");
  return data.result;
}

interface CoralCredential {
  webApiServerCredential?: { accessToken?: string; expiresIn?: number };
  user?: CoralUser;
}

export interface CoralSession {
  accessToken: string;
  user: CoralUser;
}

/** id_token + f → coral 会话（PlayLog 等接口的鉴权凭据）。 */
export async function coralLogin(
  idToken: string,
  zncaConfig: ZncaConfig,
  naId: string,
  language = "en-GB",
): Promise<CoralSession> {
  const f = await fetchZncaF(zncaConfig, idToken, naId);
  const credential = await coralPost<CoralCredential>(
    "/v4/Account/Login",
    {
      naIdToken: idToken,
      language,
      timestamp: f.timestamp,
      requestId: f.request_id,
      f: f.f,
    },
    null,
  );
  const accessToken = credential.webApiServerCredential?.accessToken;
  if (!accessToken) throw new SocialApiError("任天堂登录没有返回 coral 令牌", "needs_relogin");
  return { accessToken, user: credential.user ?? {} };
}

interface PlayLogGame {
  name?: string;
  imageUri?: string;
  shopUri?: string;
  /** 累计游玩分钟数（官方 App 显示的小时数就是它取整） */
  totalPlayTime?: number;
  /** 首次游玩时间戳，0 表示没玩过 */
  firstPlayedAt?: number;
}

/** 历史游玩记录：主机本地记录，覆盖所有玩过的游戏（不依赖家长控制）。 */
export async function playLogGames(accessToken: string, nsaId: string): Promise<SocialGame[]> {
  const games = await coralPost<PlayLogGame[]>(
    "/v4/User/PlayLog/Show",
    { nsaId },
    accessToken,
  );
  return games
    .filter((game) => game.name && (game.totalPlayTime ?? 0) > 0)
    .map((game) => ({
      id: game.shopUri ?? game.name ?? "",
      name: game.name ?? "",
      imageUrl: game.imageUri ?? null,
      bannerUrl: null,
      minutes: Math.round(game.totalPlayTime ?? 0),
      // PlayLog 只给首次游玩时间，没有「最近游玩」，排序交给前端按分钟数
      lastPlayedAt: null,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

async function fetchCoralUser(accessToken: string): Promise<CoralUser | null> {
  try {
    const self = await coralPost<CoralUser>("/v4/User/ShowSelf", {}, accessToken);
    if (!self.id) return self;
    return await coralPost<CoralUser>("/v3/User/Show", { id: self.id }, accessToken);
  } catch {
    // 头像拿不到不影响时长数据，静默降级
    return null;
  }
}

export async function nintendoSnapshot(
  sessionToken: string,
  zncaConfig: ZncaConfig,
): Promise<SocialSnapshot> {
  const tokens = await nintendoIdTokens(sessionToken);
  const account = await fetchAccountUser(tokens.accessToken);
  const session = await coralLogin(
    tokens.idToken,
    zncaConfig,
    account.id ?? "",
    account.language ?? "en-GB",
  );
  const nsaId = session.user.nsaId;
  if (!nsaId) throw new SocialApiError("任天堂登录没有返回 nsaId", "needs_relogin");

  const games = await playLogGames(session.accessToken, nsaId);
  const coralUser = await fetchCoralUser(session.accessToken);
  const totalMinutes = games.reduce((sum, game) => sum + game.minutes, 0);

  return {
    platform: "nintendo",
    profile: {
      name: account.nickname ?? coralUser?.name ?? "Nintendo",
      avatarUrl: coralUser?.imageUri ?? null,
    },
    games,
    totalMinutes,
    gameCount: games.length,
    generatedAt: new Date().toISOString(),
  };
}

/** 只读诊断：绑定后如果快照是空的，用它看每一步到底返回了什么（不下发任何凭证）。 */
export interface NintendoDiagnostics {
  /** 哪个 client 换到了令牌：NSO 的才能登 coral */
  clientId: string;
  naId: string | null;
  nickname: string | null;
  coral: { ok: boolean; nsaId?: string; error?: string };
  playLog: { count: number; totalMinutes: number; sample: string[] };
}

export async function nintendoDiagnostics(
  sessionToken: string,
  zncaConfig: ZncaConfig,
): Promise<NintendoDiagnostics> {
  const tokens = await nintendoIdTokens(sessionToken);
  const account = await fetchAccountUser(tokens.accessToken);
  const result: NintendoDiagnostics = {
    clientId: tokens.clientId,
    naId: account.id ?? null,
    nickname: account.nickname ?? null,
    coral: { ok: false },
    playLog: { count: 0, totalMinutes: 0, sample: [] },
  };

  try {
    const session = await coralLogin(
      tokens.idToken,
      zncaConfig,
      account.id ?? "",
      account.language ?? "en-GB",
    );
    result.coral = { ok: true, nsaId: session.user.nsaId };
    if (session.user.nsaId) {
      const games = await playLogGames(session.accessToken, session.user.nsaId);
      result.playLog = {
        count: games.length,
        totalMinutes: games.reduce((sum, game) => sum + game.minutes, 0),
        sample: games.slice(0, 5).map((game) => `${game.name} ${game.minutes}m`),
      };
    }
  } catch (error) {
    result.coral = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  return result;
}

export const NINTENDO_CLIENT_IDS = { nso: NSO_CLIENT_ID, znma: ZNMA_CLIENT_ID } as const;