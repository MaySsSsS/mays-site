/**
 * 表结构在 Worker 里自愈式创建：第一次请求时执行 `CREATE TABLE IF NOT EXISTS`，
 * 每个 isolate 只跑一次。这样部署流程不需要单独的 D1 迁移权限，
 * 也不会因为漏跑 schema.sql 而 500。
 */
const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS credentials (
    platform TEXT PRIMARY KEY,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    platform TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    generated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS status (
    platform TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    last_attempt_at TEXT,
    last_success_at TEXT,
    last_error TEXT
  )`,
];

let ready: Promise<void> | null = null;

export function ensureSchema(db: D1Database): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const statement of STATEMENTS) {
        await db.prepare(statement).run();
      }
    })().catch((error: unknown) => {
      // 失败要重置，否则这个 isolate 会一直记住失败状态
      ready = null;
      throw error;
    });
  }
  return ready;
}
