import { decryptJson, encryptJson } from "./crypto.js";
import {
  deleteCredential,
  readCredential,
  readSnapshot,
  writeCredential,
  writeSnapshot,
  writeStatus,
} from "./db.js";
import { SocialApiError, psnLoginWithNpsso, psnRefresh, psnSnapshot } from "./psn.js";
import { ensureSchema } from "./schema.js";
import { nintendoSnapshot } from "./nintendo.js";
import type { Env, Platform, PlatformState, PlatformStatus, PsnTokens } from "./types.js";

export const PLATFORMS: Platform[] = ["psn", "nintendo"];

interface NintendoCredential {
  sessionToken: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function encryptionKey(env: Env): string {
  if (!env.TOKEN_ENC_KEY) {
    throw new Error("缺少 TOKEN_ENC_KEY：32 字节随机值的 base64，用 wrangler secret put 设置");
  }
  return env.TOKEN_ENC_KEY;
}

async function savePsnTokens(env: Env, tokens: PsnTokens): Promise<void> {
  const payload = await encryptJson(encryptionKey(env), tokens);
  await writeCredential(env.SOCIAL_DB, "psn", payload.ciphertext, payload.iv);
}

async function recordStatus(
  env: Env,
  platform: Platform,
  state: PlatformState,
  lastError: string | null,
): Promise<PlatformStatus> {
  const previous = await readSnapshot(env.SOCIAL_DB, platform);
  const status: PlatformStatus = {
    platform,
    state,
    lastAttemptAt: nowIso(),
    lastSuccessAt: state === "ok" ? nowIso() : (previous?.generatedAt ?? null),
    lastError,
  };
  await writeStatus(env.SOCIAL_DB, status);
  return status;
}

/** 用 NPSSO 换一次 PSN 令牌并落库，同时立刻采集一次。 */
export async function linkPsn(env: Env, npsso: string): Promise<PlatformStatus> {
  const tokens = await psnLoginWithNpsso(npsso.trim());
  await savePsnTokens(env, tokens);
  return collect(env, "psn");
}

/** 任天堂的 session_token 有效期很长，直接落库，access_token 每次现取。 */
export async function linkNintendo(env: Env, sessionToken: string): Promise<PlatformStatus> {
  const credential: NintendoCredential = { sessionToken: sessionToken.trim() };
  const payload = await encryptJson(encryptionKey(env), credential);
  await writeCredential(env.SOCIAL_DB, "nintendo", payload.ciphertext, payload.iv);
  return collect(env, "nintendo");
}

export async function unlink(env: Env, platform: Platform): Promise<PlatformStatus> {
  await deleteCredential(env.SOCIAL_DB, platform);
  return recordStatus(env, platform, "unlinked", null);
}

/**
 * 采集一个平台。失败时**保留上一份快照**，只把状态标记成 needs_relogin / error：
 * 网络抖动或限流不该让页面变成空白。
 */
export async function collect(env: Env, platform: Platform): Promise<PlatformStatus> {
  await ensureSchema(env.SOCIAL_DB);
  const row = await readCredential(env.SOCIAL_DB, platform);
  if (!row) {
    return recordStatus(env, platform, "unlinked", null);
  }

  try {
    if (platform === "psn") {
      const stored = await decryptJson<PsnTokens>(encryptionKey(env), row);
      // 刷新令牌会轮换：每次采集都用 refresh_token 换一对新的并写回
      const tokens = await psnRefresh(stored.refreshToken);
      await savePsnTokens(env, tokens);
      const snapshot = await psnSnapshot(tokens.accessToken);
      await writeSnapshot(env.SOCIAL_DB, snapshot);
    } else {
      const stored = await decryptJson<NintendoCredential>(encryptionKey(env), row);
      const snapshot = await nintendoSnapshot(stored.sessionToken);
      await writeSnapshot(env.SOCIAL_DB, snapshot);
    }
    return recordStatus(env, platform, "ok", null);
  } catch (error) {
    const kind = error instanceof SocialApiError ? error.kind : "retryable";
    const message = error instanceof Error ? error.message : String(error);
    const state: PlatformState = kind === "needs_relogin" ? "needs_relogin" : "error";
    return recordStatus(env, platform, state, message.slice(0, 300));
  }
}

export async function collectAll(env: Env): Promise<PlatformStatus[]> {
  const results: PlatformStatus[] = [];
  for (const platform of PLATFORMS) {
    results.push(await collect(env, platform));
  }
  return results;
}
