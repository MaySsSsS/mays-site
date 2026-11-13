-- 凭证、快照、状态三张表：凭证只存加密后的令牌，快照给前端读，状态给运维看
CREATE TABLE IF NOT EXISTS credentials (
  platform TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  platform TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS status (
  platform TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error TEXT
);
