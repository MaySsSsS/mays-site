# Signal Arena Ops Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public operations status layer, dashboard status panel, log filtering, and chart resilience for Signal Arena.

**Architecture:** Worker public-data computes `operations` from already-public dashboard, logs, and equity history. Next.js sanitizes and renders that object through a focused operations panel, while logs become a client-side filtered view. No trading behavior or secrets change.

**Tech Stack:** Next.js 15 App Router, React 19 client components, TypeScript strict, CSS Modules, Cloudflare Workers, D1/KV, Node test runner.

---

## File Structure

- Modify `types/signal-arena.ts`: add `SignalArenaOperationsTone`, `SignalArenaOperations`, and `operations` on `SignalArenaPublicData`.
- Modify `lib/signal-arena-sanitize.ts`: sanitize and default operations.
- Modify `public/data/signal-arena/fallback.json`: add fallback operations.
- Modify `workers/signal-arena-api/src/public-data.ts`: compute operations in `mergePublicData` and sanitize cached operations.
- Modify `workers/signal-arena-api/src/public-data.test.ts`: cover operations generation and no secret leakage.
- Modify `scripts/signal-arena-layout.test.mjs`: cover types, sanitizer, operations panel, logs filters.
- Add `components/signal-arena/SignalArenaOperationsPanel.tsx`: render operations summary.
- Modify `components/signal-arena/SignalArenaDashboard.tsx`: pass and render operations.
- Modify `components/signal-arena/SignalArenaLogs.tsx`: make client-side filters and summary.
- Modify `components/signal-arena/SignalArenaEquityChart.tsx`: update single-point/empty-history copy.
- Modify `app/signal-arena/page.tsx`: pass operations to dashboard.
- Modify `styles/signal-arena.module.css`: add operations and log filter styles.
- Modify `PROGRESS.md`: record implementation, verification, and deployment.

## Task 1: Public Operations Contract

**Files:**
- Modify `types/signal-arena.ts`
- Modify `lib/signal-arena-sanitize.ts`
- Modify `public/data/signal-arena/fallback.json`
- Modify `scripts/signal-arena-layout.test.mjs`

- [ ] **Step 1: Write failing frontend contract tests**

Add assertions to `scripts/signal-arena-layout.test.mjs`:

```js
test("Signal Arena exposes public operations status", () => {
  assert.match(typeFile, /export type SignalArenaOperations/);
  assert.match(typeFile, /operations: SignalArenaOperations/);
  assert.match(sanitizerFile, /sanitizeOperations/);
  assert.match(sanitizerFile, /operations: sanitizeOperations/);
  assert.doesNotMatch(typeFile, /adminToken|SIGNAL_ARENA_ADMIN_TOKEN|agent-auth-api-key/);
});

test("Signal Arena operations UI and log filters are wired", () => {
  assert.match(dashboardComponent, /SignalArenaOperationsPanel/);
  assert.match(dashboardPage, /operations=\{data\.operations\}/);
  assert.match(logsComponent, /执行\\/持有/);
  assert.match(logsComponent, /setActiveFilter/);
});
```

- [ ] **Step 2: Run frontend tests to verify failure**

Run: `pnpm test:signal-arena`

Expected: FAIL because operations types, sanitizer, panel, and log filters do not exist.

- [ ] **Step 3: Add public operations types**

Add to `types/signal-arena.ts`:

```ts
export type SignalArenaOperationsTone = "healthy" | "watch" | "quiet" | "attention";

export type SignalArenaOperations = {
  tone: SignalArenaOperationsTone;
  label: string;
  dataAgeSeconds: number | null;
  latestRunStatus: SignalArenaRunStatus | null;
  latestRunFinishedAt: string | null;
  latestRunSummary: string | null;
  equityPointCount: number;
  equityCoverageDays: number;
  logCount: number;
};
```

Extend `SignalArenaPublicData`:

```ts
operations: SignalArenaOperations;
```

- [ ] **Step 4: Sanitize operations**

In `lib/signal-arena-sanitize.ts`, add `sanitizeOperations(value, fallback)` and `buildFallbackOperations(publicDataParts)`. It must whitelist fields and default missing old-cache operations to:

```ts
{
  tone: "watch",
  label: "观察",
  dataAgeSeconds: null,
  latestRunStatus: null,
  latestRunFinishedAt: null,
  latestRunSummary: null,
  equityPointCount: 0,
  equityCoverageDays: 0,
  logCount: 0
}
```

- [ ] **Step 5: Update fallback JSON**

Add to `public/data/signal-arena/fallback.json`:

```json
"operations": {
  "tone": "watch",
  "label": "观察",
  "dataAgeSeconds": null,
  "latestRunStatus": null,
  "latestRunFinishedAt": null,
  "latestRunSummary": "等待 Signal Arena Worker 同步。",
  "equityPointCount": 1,
  "equityCoverageDays": 0,
  "logCount": 0
}
```

- [ ] **Step 6: Run frontend tests**

Run: `pnpm test:signal-arena`

Expected: operations contract tests pass; UI tests still fail until Task 3.

## Task 2: Worker Operations Generation

**Files:**
- Modify `workers/signal-arena-api/src/public-data.ts`
- Modify `workers/signal-arena-api/src/public-data.test.ts`

- [ ] **Step 1: Write failing Worker tests**

Add to `workers/signal-arena-api/src/public-data.test.ts`:

```ts
test("public data includes generated operations status", async () => {
  const cached = makeSnapshot(new Date().toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all": cached }));

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.operations.tone, "healthy");
  assert.equal(result.operations.equityPointCount, 1);
  assert.equal(result.operations.logCount, 0);
});
```

- [ ] **Step 2: Run Worker tests to verify failure**

Run: `pnpm test:signal-arena-worker`

Expected: FAIL because `operations` is missing.

- [ ] **Step 3: Implement operations computation**

In `public-data.ts`, add:

```ts
function buildOperations(snapshot: PublicSnapshot): PublicOperations {
  const updatedMs = Date.parse(snapshot.dashboard.updatedAt);
  const dataAgeSeconds = Number.isNaN(updatedMs) ? null : Math.max(0, Math.floor((Date.now() - updatedMs) / 1000));
  const latestRun = snapshot.dashboard.latestRun;
  const coverageDays = equityCoverageDays(snapshot.equityHistory);
  const tone = operationsTone(snapshot.dashboard.sourceStatus, dataAgeSeconds, latestRun?.status ?? null, latestRun?.summary ?? "");

  return {
    tone,
    label: tone === "healthy" ? "正常" : tone === "quiet" ? "休市" : tone === "attention" ? "注意" : "观察",
    dataAgeSeconds,
    latestRunStatus: latestRun?.status ?? null,
    latestRunFinishedAt: latestRun?.finishedAt ?? null,
    latestRunSummary: latestRun?.summary ?? null,
    equityPointCount: snapshot.equityHistory.length,
    equityCoverageDays: coverageDays,
    logCount: snapshot.logs.length
  };
}
```

- [ ] **Step 4: Merge operations after logs/equity history**

At the end of `mergePublicData`, assign `operations: buildOperations(resultWithHistory)`.

- [ ] **Step 5: Run Worker tests**

Run: `pnpm test:signal-arena-worker`

Expected: PASS.

## Task 3: Dashboard Operations Panel

**Files:**
- Add `components/signal-arena/SignalArenaOperationsPanel.tsx`
- Modify `components/signal-arena/SignalArenaDashboard.tsx`
- Modify `app/signal-arena/page.tsx`
- Modify `styles/signal-arena.module.css`

- [ ] **Step 1: Add operations panel component**

Create `SignalArenaOperationsPanel.tsx` rendering:

- Tone badge.
- Data age text.
- Latest run status.
- Equity point count and coverage days.
- Log count.
- Latest run summary.

- [ ] **Step 2: Wire dashboard**

Update `SignalArenaDashboardProps` to include:

```ts
operations: SignalArenaOperations;
```

Render `<SignalArenaOperationsPanel operations={operations} />` below the chart.

- [ ] **Step 3: Pass operations from route**

Update `app/signal-arena/page.tsx`:

```tsx
<SignalArenaDashboard
  dashboard={data.dashboard}
  logs={data.logs}
  equityHistory={data.equityHistory}
  operations={data.operations}
/>
```

- [ ] **Step 4: Add CSS**

Add `.operationsPanel`, `.operationsGrid`, `.operationsItem`, `.toneBadge`, `.healthyTone`, `.watchTone`, `.quietTone`, `.attentionTone`.

- [ ] **Step 5: Run frontend tests**

Run: `pnpm test:signal-arena`

Expected: operations panel contract passes; log filter contract still fails until Task 4.

## Task 4: Logs Filters And Chart Copy

**Files:**
- Modify `components/signal-arena/SignalArenaLogs.tsx`
- Modify `components/signal-arena/SignalArenaEquityChart.tsx`
- Modify `styles/signal-arena.module.css`

- [ ] **Step 1: Make logs component client-side**

Add `"use client";` and local `activeFilter` state.

- [ ] **Step 2: Add filters**

Use filters:

```ts
const FILTERS = [
  { id: "all", label: "全部" },
  { id: "active", label: "执行/持有" },
  { id: "blocked", label: "拦截" },
  { id: "skipped", label: "跳过" },
  { id: "failed", label: "失败" }
] as const;
```

Filter rules:

- `active`: `executed` or `held`
- `blocked`: `blocked`
- `skipped`: `skipped`
- `failed`: `failed`

- [ ] **Step 3: Add log summary counts**

Render counts for all, active, blocked, skipped, failed.

- [ ] **Step 4: Update chart copy**

Change chart note to:

```tsx
<p className={styles.sectionNote}>默认展示最近 7 天，快照会随 Runner 累积；点位可打开对应 AI 决策。</p>
```

- [ ] **Step 5: Run frontend tests**

Run: `pnpm test:signal-arena`

Expected: PASS.

## Task 5: Verification, Progress, Deploy

**Files:**
- Modify `PROGRESS.md`

- [ ] **Step 1: Run verification**

Run:

```bash
pnpm test:signal-arena
pnpm test:signal-arena-worker
pnpm typecheck
pnpm --dir workers/signal-arena-api typecheck
pnpm lint
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Browser check**

Run local dev server with Signal Arena API URL:

```bash
SIGNAL_ARENA_API_URL=https://signal-arena-api.maysssss.cn pnpm exec next dev -p 3001
```

Open `http://localhost:3001/signal-arena` and verify:

- `运行状态` panel exists.
- `7D / 30D / ALL` still visible.
- Logs page shows filter buttons.
- Filtering to `跳过` or `失败` changes visible logs or empty state.

- [ ] **Step 3: Update progress**

Record implementation, tests, and deployment in `PROGRESS.md`.

- [ ] **Step 4: Commit implementation**

```bash
git add .
git commit -m "feat: add Signal Arena operations polish"
```

- [ ] **Step 5: Deploy**

```bash
pnpm exec wrangler deploy --config ./wrangler.toml
git push origin HEAD:main
```

For the Worker deploy command, run from `workers/signal-arena-api`.

Expected: Worker deploy succeeds, GitHub frontend deploy succeeds, and public API returns `operations`.

## Self-Review

- Spec coverage: operations API, dashboard panel, logs filters, chart copy, tests, and deploy are covered.
- Placeholder scan: no `TBD`, no `TODO`, no open-ended implementation steps.
- Scope: no trading behavior changes, no unrelated pages.
- Type consistency: `SignalArenaOperations` and `operations` are used consistently across Worker, frontend sanitizer, types, and route props.
