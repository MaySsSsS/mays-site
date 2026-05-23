CREATE TABLE IF NOT EXISTS signal_arena_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  market_session TEXT NOT NULL,
  market_view TEXT,
  risk_level TEXT,
  summary TEXT,
  candidates_json TEXT NOT NULL DEFAULT '[]',
  selected_action_json TEXT,
  risk_result_json TEXT NOT NULL DEFAULT '{"allowed":false,"reasons":[]}',
  order_result_json TEXT,
  before_state_json TEXT,
  decision_trace_json TEXT,
  after_snapshot_json TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_signal_arena_runs_started_at
ON signal_arena_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS signal_arena_snapshots (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  created_at TEXT NOT NULL,
  source_status TEXT NOT NULL,
  dashboard_json TEXT NOT NULL,
  rank_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_arena_snapshots_created_at
ON signal_arena_snapshots (created_at DESC);
