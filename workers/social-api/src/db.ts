import type { Platform, PlatformStatus, SocialSnapshot } from "./types.js";

interface CredentialRow {
  ciphertext: string;
  iv: string;
}

export async function readCredential(db: D1Database, platform: Platform): Promise<CredentialRow | null> {
  const row = await db
    .prepare("SELECT ciphertext, iv FROM credentials WHERE platform = ?1")
    .bind(platform)
    .first<CredentialRow>();
  return row ?? null;
}

export async function writeCredential(
  db: D1Database,
  platform: Platform,
  ciphertext: string,
  iv: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO credentials (platform, ciphertext, iv, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(platform) DO UPDATE SET ciphertext = ?2, iv = ?3, updated_at = ?4`,
    )
    .bind(platform, ciphertext, iv, new Date().toISOString())
    .run();
}

export async function deleteCredential(db: D1Database, platform: Platform): Promise<void> {
  await db.prepare("DELETE FROM credentials WHERE platform = ?1").bind(platform).run();
}

export async function readSnapshot(db: D1Database, platform: Platform): Promise<SocialSnapshot | null> {
  const row = await db
    .prepare("SELECT json FROM snapshots WHERE platform = ?1")
    .bind(platform)
    .first<{ json: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.json) as SocialSnapshot;
  } catch {
    return null;
  }
}

export async function writeSnapshot(db: D1Database, snapshot: SocialSnapshot): Promise<void> {
  await db
    .prepare(
      `INSERT INTO snapshots (platform, json, generated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(platform) DO UPDATE SET json = ?2, generated_at = ?3`,
    )
    .bind(snapshot.platform, JSON.stringify(snapshot), snapshot.generatedAt)
    .run();
}

export async function readStatus(db: D1Database, platform: Platform): Promise<PlatformStatus | null> {
  const row = await db
    .prepare("SELECT platform, state, last_attempt_at, last_success_at, last_error FROM status WHERE platform = ?1")
    .bind(platform)
    .first<{
      platform: Platform;
      state: PlatformStatus["state"];
      last_attempt_at: string | null;
      last_success_at: string | null;
      last_error: string | null;
    }>();
  if (!row) return null;
  return {
    platform: row.platform,
    state: row.state,
    lastAttemptAt: row.last_attempt_at,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
  };
}

export async function writeStatus(db: D1Database, status: PlatformStatus): Promise<void> {
  await db
    .prepare(
      `INSERT INTO status (platform, state, last_attempt_at, last_success_at, last_error)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(platform) DO UPDATE SET state = ?2, last_attempt_at = ?3, last_success_at = ?4, last_error = ?5`,
    )
    .bind(status.platform, status.state, status.lastAttemptAt, status.lastSuccessAt, status.lastError)
    .run();
}
