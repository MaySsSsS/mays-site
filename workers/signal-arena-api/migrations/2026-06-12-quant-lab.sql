ALTER TABLE signal_arena_runs ADD COLUMN account_scope TEXT NOT NULL DEFAULT 'legacy-ai';
ALTER TABLE signal_arena_runs ADD COLUMN strategy_version TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN strategy_trace_json TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN strategy_parameters_json TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_arena_runs_scope_started_at
ON signal_arena_runs (account_scope, started_at DESC);

ALTER TABLE signal_arena_snapshots ADD COLUMN account_scope TEXT NOT NULL DEFAULT 'legacy-ai';
ALTER TABLE signal_arena_snapshots ADD COLUMN strategy_version TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_arena_snapshots_scope_created_at
ON signal_arena_snapshots (account_scope, created_at DESC);
