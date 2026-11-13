/** social-api Worker 客户端：只读快照 + 一次性绑定（绑定接口要 Bearer 管理令牌）。 */

export const SOCIAL_API_URL =
  process.env.NEXT_PUBLIC_SOCIAL_API_URL ?? "https://mays-social-api.mays.workers.dev";

export type SocialPlatform = "psn" | "nintendo";

export type SocialPlatformState = "ok" | "needs_relogin" | "error" | "unlinked";

export interface SocialGame {
  id: string;
  name: string;
  imageUrl: string | null;
  bannerUrl: string | null;
  minutes: number;
  lastPlayedAt: string | null;
}

export interface SocialProfile {
  name: string;
  avatarUrl: string | null;
}

export interface SocialSnapshot {
  platform: SocialPlatform;
  profile: SocialProfile | null;
  games: SocialGame[];
  totalMinutes: number;
  gameCount: number;
  generatedAt: string;
}

export interface SocialPlatformStatus {
  state: SocialPlatformState;
  lastSuccessAt: string | null;
  lastAttemptAt?: string | null;
  lastError?: string | null;
}

export interface SocialHealth {
  ok: boolean;
  platforms: Record<SocialPlatform, SocialPlatformStatus>;
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`social-api 返回了非 JSON 响应（HTTP ${response.status}）`);
  }
}

export async function fetchSocialHealth(): Promise<SocialHealth> {
  const response = await fetch(`${SOCIAL_API_URL}/health`, { cache: "no-store" });
  if (!response.ok) throw new Error(`读取状态失败：HTTP ${response.status}`);
  return readJson<SocialHealth>(response);
}

export async function fetchSocialSnapshot(platform: SocialPlatform): Promise<SocialSnapshot | null> {
  const response = await fetch(`${SOCIAL_API_URL}/api/snapshot/${platform}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`读取快照失败：HTTP ${response.status}`);
  return readJson<SocialSnapshot>(response);
}

async function adminRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${SOCIAL_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${body ? `：${body.slice(0, 200)}` : ""}`);
  }
  return response;
}

export async function linkPsnAccount(npsso: string, token: string): Promise<void> {
  await adminRequest("/api/link/psn", token, {
    method: "POST",
    body: JSON.stringify({ npsso: npsso.trim() }),
  });
}

export async function linkNintendoAccount(
  sessionTokenCode: string,
  codeVerifier: string,
  token: string,
): Promise<void> {
  await adminRequest("/api/link/nintendo", token, {
    method: "POST",
    body: JSON.stringify({ sessionTokenCode: sessionTokenCode.trim(), codeVerifier }),
  });
}

export async function collectSocialData(token: string): Promise<void> {
  await adminRequest("/api/collect", token, { method: "POST", body: "{}" });
}

/** 任天堂的 PKCE：verifier 留在浏览器，challenge 去授权，回调里只带回 code。 */
export function createNintendoPkce(): { verifier: string; challenge: Promise<string> } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64Url(bytes);
  const challenge = crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(verifier))
    .then((digest) => base64Url(new Uint8Array(digest)));
  return { verifier, challenge };
}

export async function buildNintendoAuthorizeUrl(state: string, challenge: string): Promise<string> {
  const params = new URLSearchParams({
    state,
    redirect_uri: "npf54789befb391a838://auth",
    client_id: "54789befb391a838",
    scope: "openid user user.birthday user.mii user.screenName",
    response_type: "session_token_code",
    session_token_code_challenge: challenge,
    session_token_code_challenge_method: "S256",
    theme: "login_form",
  });
  return `https://accounts.nintendo.com/connect/1.0.0/authorize?${params.toString()}`;
}

/** 从 `npf54789befb391a838://auth#session_token_code=xxx&state=yyy` 里取出 code。 */
export function extractNintendoSessionTokenCode(input: string): string | null {
  const match = /session_token_code=([^&\s]+)/.exec(input);
  return match ? decodeURIComponent(match[1]) : null;
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
