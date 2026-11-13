import { classifyErrorBody, classifyHttpStatus, parseIsoDurationMinutes } from "./parse.js";
import type { PsnTokens, SocialGame, SocialSnapshot } from "./types.js";

const AUTH_BASE = "https://ca.account.sony.com/api/authz/v3/oauth";
const API_BASE = "https://m.np.playstation.com/api";
const CLIENT_ID = "09515159-7237-4370-9b40-3806e67c0891";
const OAUTH_BASIC = "MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";
const REDIRECT_URI = "com.scee.psxandroid.scecompcall://redirect";
const SCOPE = "psn:mobile.v2.core psn:clientapp";
const PAGE_SIZE = 200;

export class SocialApiError extends Error {
  readonly kind: "needs_relogin" | "retryable" | "fatal";

  constructor(message: string, kind: "needs_relogin" | "retryable" | "fatal") {
    super(message);
    this.name = "SocialApiError";
    this.kind = kind;
  }
}

async function fail(prefix: string, response: Response): Promise<never> {
  const body = await response.text().catch(() => "");
  const kind = classifyHttpStatus(response.status) === "needs_relogin"
    ? "needs_relogin"
    : classifyErrorBody(body);
  throw new SocialApiError(`${prefix}: HTTP ${response.status} ${body.slice(0, 200)}`, kind);
}

function tokensFromResponse(raw: Record<string, unknown>): PsnTokens {
  const now = Date.now();
  const accessTtl = Number(raw.expires_in ?? 3600);
  const refreshTtl = Number(raw.refresh_token_expires_in ?? 5184000);
  const accessToken = String(raw.access_token ?? "");
  const refreshToken = String(raw.refresh_token ?? "");
  if (!accessToken || !refreshToken) {
    throw new SocialApiError("PSN 没有返回 access_token/refresh_token", "fatal");
  }
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: new Date(now + accessTtl * 1000).toISOString(),
    refreshTokenExpiresAt: new Date(now + refreshTtl * 1000).toISOString(),
  };
}

/** 一次性登录：NPSSO → access code → access/refresh token。 */
export async function psnLoginWithNpsso(npsso: string): Promise<PsnTokens> {
  const query = new URLSearchParams({
    access_type: "offline",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
  });
  const authorize = await fetch(`${AUTH_BASE}/authorize?${query.toString()}`, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: "manual",
  });
  const location = authorize.headers.get("location") ?? "";
  const code = /[?&]code=([^&]+)/.exec(location)?.[1];
  if (!code) {
    throw new SocialApiError("NPSSO 无效或已过期（请重新登录 PlayStation 获取）", "needs_relogin");
  }

  const response = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${OAUTH_BASIC}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
      token_format: "jwt",
    }).toString(),
  });
  if (!response.ok) await fail("PSN 换取令牌失败", response);
  return tokensFromResponse((await response.json()) as Record<string, unknown>);
}

/** 定时刷新：refresh token 会轮换，调用方必须把新值写回数据库。 */
export async function psnRefresh(refreshToken: string): Promise<PsnTokens> {
  const response = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${OAUTH_BASIC}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      token_format: "jwt",
      scope: SCOPE,
    }).toString(),
  });
  if (!response.ok) await fail("PSN 刷新令牌失败", response);
  return tokensFromResponse((await response.json()) as Record<string, unknown>);
}

async function psnGet(accessToken: string, path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) await fail(`PSN ${path}`, response);
  return (await response.json()) as Record<string, unknown>;
}

interface PsnTitle {
  titleId?: string;
  name?: string;
  localizedName?: string;
  imageUrl?: string;
  localizedImageUrl?: string;
  lastPlayedDateTime?: string;
  playDuration?: string;
  concept?: { media?: { images?: { url?: string; type?: string }[] } };
}

function toGame(title: PsnTitle): SocialGame | null {
  const id = title.titleId;
  if (!id) return null;
  const images = title.concept?.media?.images ?? [];
  const banner = images.find((image) => (image.type ?? "").includes("BANNER")) ?? images[0];
  return {
    id,
    name: title.localizedName || title.name || id,
    imageUrl: title.localizedImageUrl || title.imageUrl || null,
    bannerUrl: banner?.url ?? null,
    minutes: parseIsoDurationMinutes(title.playDuration),
    lastPlayedAt: title.lastPlayedDateTime ?? null,
  };
}

/** 拉取个人资料 + 全部已玩游戏（含 playDuration 游玩时长）。 */
export async function psnSnapshot(accessToken: string): Promise<SocialSnapshot> {
  const profile = await psnGet(accessToken, "/userProfile/v1/internal/users/me/profiles").catch(() => null);
  const avatarUrls = (profile?.avatarUrls as { avatarUrl?: string; size?: string }[] | undefined) ?? [];

  const games: SocialGame[] = [];
  let offset = 0;
  for (let page = 0; page < 20; page += 1) {
    const data = await psnGet(
      accessToken,
      `/gamelist/v2/users/me/titles?limit=${PAGE_SIZE}&offset=${offset}&categories=ps4_game,ps5_native_game,pspc_game`,
    );
    const titles = (data.titles as PsnTitle[] | undefined) ?? [];
    for (const title of titles) {
      const game = toGame(title);
      if (game) games.push(game);
    }
    const total = Number(data.totalItemCount ?? 0);
    offset += titles.length;
    if (titles.length === 0 || offset >= total) break;
  }

  const sorted = games.sort((a, b) => b.minutes - a.minutes);
  return {
    platform: "psn",
    profile: profile
      ? {
          name: String(profile.onlineId ?? "PSN"),
          avatarUrl: avatarUrls[0]?.avatarUrl ?? null,
        }
      : null,
    games: sorted,
    totalMinutes: sorted.reduce((total, game) => total + game.minutes, 0),
    gameCount: sorted.length,
    generatedAt: new Date().toISOString(),
  };
}
