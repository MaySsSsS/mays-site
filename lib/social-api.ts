/** social-api Worker 的只读客户端：平台页读账号快照用。绑定走 scripts/link-account.mjs。 */

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
