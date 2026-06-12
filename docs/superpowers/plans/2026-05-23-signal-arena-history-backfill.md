# Signal Arena History Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only historical backfill layer from WorkBuddy automation runs into Signal Arena charts and logs.

**Architecture:** A Node parser converts WorkBuddy SQLite records into a sanitized static JSON artifact. The Next.js server data client merges that artifact with live Worker public data at request time while keeping live dashboard state authoritative.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, CSS Modules, Node test runner, SQLite CLI, static JSON.

---

## File Structure

- Create `lib/signal-arena-history.ts`: parse WorkBuddy output strings and normalize local history payloads.
- Create `scripts/signal-arena-history.test.mjs`: parser and safety tests using TypeScript transpilation.
- Create `scripts/sync-signal-arena-history.mjs`: SQLite export script that writes `public/data/signal-arena/history.json`.
- Create `public/data/signal-arena/history.json`: sanitized local artifact generated from current WorkBuddy DB.
- Modify `types/signal-arena.ts`: add source/confidence fields.
- Modify `lib/signal-arena-sanitize.ts`: whitelist source/confidence fields.
- Modify `lib/signal-arena-data.ts`: merge local history with live/fallback public data and rebuild operations counts.
- Modify `components/signal-arena/SignalArenaEquityChart.tsx`: show source/confidence in tooltip.
- Modify `components/signal-arena/SignalArenaDecisionModal.tsx`: render imported historical points clearly.
- Modify `components/signal-arena/SignalArenaLogs.tsx`: add source filter and source badge.
- Modify `styles/signal-arena.module.css`: add source badge styles.
- Modify `scripts/signal-arena-layout.test.mjs`: frontend contract tests.
- Modify `PROGRESS.md`: record local-only implementation and verification.

## Task 1: Tests First

- [ ] Add parser tests for typical WorkBuddy output, failed records, and sensitive string cleanup.
- [ ] Add frontend contract tests for source fields, history import, source filter, and historical modal wording.
- [ ] Run `node --test scripts/signal-arena-history.test.mjs` and `pnpm test:signal-arena` to confirm failures.

## Task 2: Parser And Generator

- [ ] Implement `lib/signal-arena-history.ts` with parsing, sanitization, and payload builders.
- [ ] Implement `scripts/sync-signal-arena-history.mjs` using the SQLite CLI.
- [ ] Run parser tests until green.
- [ ] Generate `public/data/signal-arena/history.json`.

## Task 3: Frontend Data Merge

- [ ] Extend public Signal Arena types with optional `source`, `sourceLabel`, `confidence`, and `rawSummary`.
- [ ] Extend sanitizer to whitelist those fields and drop unknown private fields.
- [ ] Merge local history in `getSignalArenaPublicData()` without replacing live dashboard/rank.
- [ ] Recompute operations counts from merged logs/history.
- [ ] Run `pnpm test:signal-arena` until green.

## Task 4: UI Integration

- [ ] Add source/confidence to chart tooltip.
- [ ] Add imported historical modal state.
- [ ] Add logs source filter and source badge.
- [ ] Keep current Signal Arena visual style unchanged apart from minimal source labels.

## Task 5: Verification And Local Preview

- [ ] Run `node --test scripts/signal-arena-history.test.mjs`.
- [ ] Run `pnpm test:signal-arena`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm build`.
- [ ] Start or reuse local dev server and inspect `/signal-arena` plus `/signal-arena/logs`.
- [ ] Update `PROGRESS.md`.
