# Signal Arena Market Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Signal Arena into an A-share market terminal with a red/green equity curve, clickable decision detail modal, run-linked snapshots, and richer AI decision traces.

**Architecture:** The Worker remains the authority for secrets, upstream Signal Arena calls, AI decisions, D1 persistence, and public sanitization. The Next.js app reads the sanitized public payload and renders a dark terminal dashboard with a client-side ECharts equity chart and modal. Existing routes stay public read-only and dynamic.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, CSS Modules, ECharts, Cloudflare Workers, D1, KV, Node test runner, OpenAI-compatible Responses API.

---

## File Structure

- Modify `types/signal-arena.ts`: add public equity history, decision trace, before/after snapshot types.
- Modify `lib/signal-arena-sanitize.ts`: whitelist new public fields and stay compatible with old cached payloads.
- Modify `public/data/signal-arena/fallback.json`: include sample `equityHistory` and decision trace fields.
- Modify `scripts/signal-arena-layout.test.mjs`: frontend contract tests for chart, modal, default `7D`, and sanitized new fields.
- Modify `workers/signal-arena-api/schema.sql`: add trace/snapshot columns with idempotent `ALTER TABLE`.
- Modify `workers/signal-arena-api/src/types.ts`: expand upstream query types, prompt context, AI decision output, public run rows and snapshots.
- Modify `workers/signal-arena-api/src/signal-api.ts`: add `top-movers`, `snapshots`, and optional `stock-history` clients.
- Modify `workers/signal-arena-api/src/prompt.ts`: upgrade prompt builder and parser for decision trace.
- Modify `workers/signal-arena-api/src/storage.ts`: persist decision trace and run-linked equity snapshots; list recent snapshots.
- Modify `workers/signal-arena-api/src/public-data.ts`: return `equityHistory` sorted old-to-new and include trace fields.
- Modify `workers/signal-arena-api/src/runner.ts`: gather richer context, save before/after state, trace, and snapshot.
- Add `components/signal-arena/SignalArenaEquityChart.tsx`: client ECharts chart with `7D / 30D / ALL`.
- Add `components/signal-arena/SignalArenaDecisionModal.tsx`: client modal for clicked equity points.
- Modify `components/signal-arena/SignalArenaDashboard.tsx`: integrate market-terminal layout, chart, and modal.
- Modify `components/signal-arena/SignalArenaLogs.tsx`: show richer trace when present.
- Modify `styles/signal-arena.module.css`: dark market terminal visual system.
- Modify `PROGRESS.md`: record implementation and verification.

## Task 1: Public Types, Sanitizer, And Frontend Contract

**Files:**
- Modify: `types/signal-arena.ts`
- Modify: `lib/signal-arena-sanitize.ts`
- Modify: `public/data/signal-arena/fallback.json`
- Modify: `scripts/signal-arena-layout.test.mjs`

- [ ] **Step 1: Write failing frontend contract tests**

Add assertions to `scripts/signal-arena-layout.test.mjs`:

```js
test("Signal Arena public data exposes equity history and decision trace", () => {
  assert.match(typeFile, /export type SignalArenaEquityPoint/);
  assert.match(typeFile, /export type SignalArenaDecisionTrace/);
  assert.match(typeFile, /equityHistory: SignalArenaEquityPoint\[\]/);
  assert.match(sanitizerFile, /sanitizeDecisionTrace/);
  assert.match(sanitizerFile, /equityHistory: arrayValue\(value\.equityHistory\)/);
  assert.doesNotMatch(typeFile, /apiKey|agent-auth-api-key|SIGNAL_ARENA_AI_API_KEY|orderId/);
});

test("Signal Arena dashboard includes the equity chart and decision modal", () => {
  assert.match(dashboardComponent, /SignalArenaEquityChart/);
  assert.match(dashboardComponent, /SignalArenaDecisionModal/);
  assert.match(dashboardComponent, /defaultRange="7D"/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test:signal-arena`

Expected: FAIL because `SignalArenaEquityPoint`, `sanitizeDecisionTrace`, chart, and modal do not exist.

- [ ] **Step 3: Add public types**

Add these exported types to `types/signal-arena.ts`:

```ts
export type SignalArenaSnapshotState = {
  totalAssets: number;
  cash: number;
  returnRate: number;
  currentRank: number | null;
  holdingsCount: number;
};

export type SignalArenaRejectedAction = {
  symbol: string;
  action: SignalArenaActionType;
  shares: number;
  reason: string;
};

export type SignalArenaDecisionTrace = {
  beforeStateSummary: string;
  decisionRoute: string[];
  marketAssessment: string[];
  portfolioAssessment: string[];
  rejectedActions: SignalArenaRejectedAction[];
  publicExplanation: string;
};

export type SignalArenaEquityPoint = {
  id: string;
  runId: string | null;
  capturedAt: string;
  totalAssets: number;
  returnRate: number;
  currentRank: number | null;
  status: SignalArenaRunStatus | "snapshot";
  actionSummary: string | null;
};
```

Extend `SignalArenaRunLog` with:

```ts
beforeState: SignalArenaSnapshotState | null;
decisionTrace: SignalArenaDecisionTrace | null;
cashPlan: string | null;
watchlist: string[];
afterSnapshot: SignalArenaSnapshotState | null;
```

Extend `SignalArenaPublicData` with:

```ts
equityHistory: SignalArenaEquityPoint[];
```

- [ ] **Step 4: Sanitize new fields**

In `lib/signal-arena-sanitize.ts`, add helpers `sanitizeSnapshotState`, `sanitizeRejectedAction`, `sanitizeDecisionTrace`, and `sanitizeEquityPoint`. Include fields in `sanitizeRunLog` and return `equityHistory` from `toSignalArenaPublicData`, defaulting to `[]` when missing.

- [ ] **Step 5: Update fallback data**

Update `public/data/signal-arena/fallback.json` to include:

```json
"equityHistory": [
  {
    "id": "fallback-point-1",
    "runId": null,
    "capturedAt": "2026-05-22T00:00:00.000Z",
    "totalAssets": 1000000,
    "returnRate": 0,
    "currentRank": null,
    "status": "snapshot",
    "actionSummary": "等待首次 Runner 快照"
  }
]
```

- [ ] **Step 6: Run frontend contract tests**

Run: `pnpm test:signal-arena`

Expected: PASS for updated public type and sanitizer tests; chart/modal tests still fail until Task 4.

## Task 2: Worker Prompt And Decision Trace

**Files:**
- Modify: `workers/signal-arena-api/src/types.ts`
- Modify: `workers/signal-arena-api/src/prompt.ts`
- Modify: `workers/signal-arena-api/src/prompt.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Add tests to `workers/signal-arena-api/src/prompt.test.ts`:

```ts
test("buildDecisionPrompt asks for auditable decision trace", () => {
  const prompt = buildDecisionPrompt(context);

  assert.match(prompt.system, /长期收益率/);
  assert.match(prompt.system, /不得编造/);
  assert.match(prompt.user, /decision_process/);
  assert.match(prompt.user, /before_state_summary/);
  assert.match(prompt.user, /decision_route/);
  assert.match(prompt.user, /rejected_actions/);
  assert.match(prompt.user, /public_explanation/);
});

test("extractDecisionJson parses the expanded trace payload", () => {
  const decision = extractDecisionJson(JSON.stringify({
    market_view: "neutral",
    risk_level: "low",
    summary: "保持观察",
    before_state_summary: "现金充足，仓位适中。",
    decision_route: ["检查现金", "检查持仓", "没有高置信机会"],
    market_assessment: ["涨幅榜未形成明确主线"],
    portfolio_assessment: ["持仓未触发止损"],
    candidates: [],
    rejected_actions: [],
    final_action: null,
    cash_plan: "保留现金等待机会",
    watchlist: ["sh600519"],
    public_explanation: "无高置信机会，本轮持有。"
  }));

  assert.equal(decision.before_state_summary, "现金充足，仓位适中。");
  assert.equal(decision.decision_route.length, 3);
  assert.equal(decision.final_action, null);
  assert.deepEqual(decision.watchlist, ["sh600519"]);
});
```

- [ ] **Step 2: Run prompt tests to verify failure**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: FAIL because prompt output schema and parser do not support trace fields.

- [ ] **Step 3: Expand worker AI types**

In `workers/signal-arena-api/src/types.ts`, extend `AiDecision` with:

```ts
before_state_summary: string;
decision_route: string[];
market_assessment: string[];
portfolio_assessment: string[];
rejected_actions: Array<{
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  reason: string;
}>;
final_action: AiCandidateAction | null;
public_explanation: string;
```

- [ ] **Step 4: Upgrade prompt builder**

Replace the system prompt in `workers/signal-arena-api/src/prompt.ts` with the design-approved prompt and add `decision_process`, `strategy_rules`, and expanded `output_schema` to the JSON user payload.

- [ ] **Step 5: Upgrade parser**

Add parser helpers for string arrays, rejected actions, and nullable `final_action`. Require `before_state_summary`, `decision_route`, `market_assessment`, `portfolio_assessment`, `cash_plan`, and `public_explanation`.

- [ ] **Step 6: Run worker prompt tests**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: PASS for prompt tests. Risk/public-data tests may still fail until later tasks update fixture shapes.

## Task 3: Worker Storage, Snapshots, And Public API Shape

**Files:**
- Modify: `workers/signal-arena-api/schema.sql`
- Modify: `workers/signal-arena-api/src/storage.ts`
- Modify: `workers/signal-arena-api/src/public-data.ts`
- Modify: `workers/signal-arena-api/src/public-data.test.ts`

- [ ] **Step 1: Write failing Worker public-data tests**

Add tests in `workers/signal-arena-api/src/public-data.test.ts` asserting:

```ts
assert.ok(Array.isArray(result.equityHistory));
assert.equal(result.equityHistory[0]?.runId, "run-1");
assert.equal(result.equityHistory[0]?.totalAssets, 1200000);
assert.equal(result.logs[0]?.decisionTrace?.decisionRoute[0], "检查现金");
assert.equal(JSON.stringify(result).includes("private-order"), false);
```

- [ ] **Step 2: Run Worker tests to verify failure**

Run: `pnpm test:signal-arena-worker`

Expected: FAIL because storage does not return snapshot rows or trace fields yet.

- [ ] **Step 3: Update D1 schema**

Append idempotent migration statements to `workers/signal-arena-api/schema.sql`:

```sql
ALTER TABLE signal_arena_runs ADD COLUMN before_state_json TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN decision_trace_json TEXT;
ALTER TABLE signal_arena_runs ADD COLUMN after_snapshot_json TEXT;
ALTER TABLE signal_arena_snapshots ADD COLUMN run_id TEXT;
```

When applying to D1, run each statement separately if Cloudflare reports an already-existing column.

- [ ] **Step 4: Extend storage functions**

Update `insertRun` to accept `beforeStateJson`, `decisionTraceJson`, `afterSnapshotJson`. Add:

```ts
export type SignalArenaSnapshotRow = {
  id: string;
  run_id: string | null;
  created_at: string;
  source_status: string;
  dashboard_json: string;
  rank_json: string;
};
```

Add `insertSnapshot(env, snapshot)` and `listRecentSnapshots(env, limit = 300)`.

- [ ] **Step 5: Map snapshots to public equity history**

In `public-data.ts`, add `PublicEquityPoint`, sanitize it, return `equityHistory` from cached payloads, merge D1 snapshots into public payload, and sort old-to-new by `capturedAt`.

- [ ] **Step 6: Run Worker tests**

Run: `pnpm test:signal-arena-worker`

Expected: PASS for public API shape, sanitized trace, and old cache compatibility.

## Task 4: Runner Context, Trace Persistence, And Snapshot Writes

**Files:**
- Modify: `workers/signal-arena-api/src/types.ts`
- Modify: `workers/signal-arena-api/src/signal-api.ts`
- Modify: `workers/signal-arena-api/src/runner.ts`
- Modify: `workers/signal-arena-api/src/public-data.test.ts`

- [ ] **Step 1: Add upstream clients**

Add typed clients:

```ts
export async function fetchArenaTopMovers(env: Env): Promise<ArenaTopMoversData> {
  return await requestArena<ArenaTopMoversData>(env, "/api/v1/arena/top-movers");
}

export async function fetchArenaSnapshots(env: Env): Promise<ArenaSnapshotsData> {
  return await requestArena<ArenaSnapshotsData>(env, "/api/v1/arena/snapshots");
}
```

- [ ] **Step 2: Extend DecisionPromptContext**

Add recent trades, top movers, and snapshots to `DecisionPromptContext` with public-safe fields only.

- [ ] **Step 3: Update runner before-state and prompt context**

In `runner.ts`, fetch `home`, `portfolio`, `trades`, `topMovers`, and `snapshots`; build `beforeState` and pass richer context to `buildDecisionPrompt`.

- [ ] **Step 4: Persist trace and snapshot**

After risk selection and optional order submission, build `afterSnapshot` from current known account values, call `insertRun` with new JSON fields, and call `insertSnapshot` with dashboard/rank public data for the run.

- [ ] **Step 5: Keep skipped runs safe**

For non-trading-session skipped runs, keep `decisionTraceJson` null and still insert the run. Do not call AI.

- [ ] **Step 6: Run Worker tests**

Run: `pnpm test:signal-arena-worker`

Expected: PASS.

## Task 5: Frontend Equity Chart And Decision Modal

**Files:**
- Add: `components/signal-arena/SignalArenaEquityChart.tsx`
- Add: `components/signal-arena/SignalArenaDecisionModal.tsx`
- Modify: `components/signal-arena/SignalArenaDashboard.tsx`
- Modify: `components/signal-arena/SignalArenaLogs.tsx`
- Modify: `styles/signal-arena.module.css`
- Modify: `scripts/signal-arena-layout.test.mjs`

- [ ] **Step 1: Run frontend contract tests to verify failure**

Run: `pnpm test:signal-arena`

Expected: FAIL because chart/modal components do not exist.

- [ ] **Step 2: Add `SignalArenaDecisionModal`**

Create a client component that accepts `point`, `run`, and `onClose`. Render operation-before state, decision route, market assessment, portfolio assessment, candidates, rejected actions, final action, risk result, order result, and after snapshot.

- [ ] **Step 3: Add `SignalArenaEquityChart`**

Create a client component using `echarts`. It must:

- Default to `7D`.
- Offer `7D / 30D / ALL` buttons.
- Filter history by selected range.
- Render line segments red for increases and green for decreases.
- Hide point symbols by default.
- Show tooltip with date, assets, return rate, delta, status, action summary.
- Open the modal when a point is clicked.

- [ ] **Step 4: Integrate chart in dashboard**

Pass `dashboard`, `logs`, and `equityHistory` into `SignalArenaDashboard`. Build a `runById` map so chart clicks can show the matching run.

- [ ] **Step 5: Redesign Signal Arena CSS**

Replace the paper dashboard look with dark terminal classes while preserving existing route shells and mobile responsiveness.

- [ ] **Step 6: Run frontend tests**

Run: `pnpm test:signal-arena`

Expected: PASS.

## Task 6: Verification, Deployment, And Progress

**Files:**
- Modify: `PROGRESS.md`
- Optional modify: `workers/signal-arena-api/README.md`

- [ ] **Step 1: Run local verification**

Run:

```bash
pnpm test:signal-arena
pnpm test:signal-arena-worker
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Run browser verification**

Start or reuse `pnpm dev`, open `http://localhost:3000/signal-arena`, verify:

- dark terminal styling loads;
- default chart range is `7D`;
- `30D / ALL` controls are visible;
- chart renders nonblank;
- modal opens from a point when data has matching run;
- mobile width does not overflow.

- [ ] **Step 3: Update progress**

Record implementation, verification, and any deployment caveats in `PROGRESS.md`.

- [ ] **Step 4: Commit implementation**

Commit code:

```bash
git add .
git commit -m "feat: add Signal Arena market dashboard"
```

- [ ] **Step 5: Deploy if verification passes**

Apply D1 schema changes first, deploy Worker, then deploy frontend:

```bash
pnpm --dir workers/signal-arena-api deploy
git push origin HEAD:main
```

Expected: Worker deploy succeeds, GitHub frontend deploy succeeds, and `https://maysssss.cn/signal-arena` returns the upgraded page.

## Self-Review

- Spec coverage: visual redesign, `7D / 30D / ALL`, red/green curve, point modal, prompt upgrade, D1 snapshots, public sanitizer, tests, and deployment are covered.
- Placeholder scan: no `TBD`, no `TODO`, no unbounded “handle edge cases”.
- Type consistency: public type names use `SignalArenaEquityPoint`, `SignalArenaDecisionTrace`, and `SignalArenaSnapshotState` consistently across Worker, frontend sanitizer, and components.
