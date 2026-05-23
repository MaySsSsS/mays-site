-- Existing D1 databases created before 2026-05-23 need these columns applied once.
ALTER TABLE signal_arena_runs ADD COLUMN before_state_json TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN decision_trace_json TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN after_snapshot_json TEXT;
ALTER TABLE signal_arena_snapshots ADD COLUMN run_id TEXT;
