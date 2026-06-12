# Signal Arena Signal Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic pre-AI signal generation layer and deploy it to the Signal Arena Worker.

**Architecture:** Create a small `signal-generator.ts` module that turns top movers, holdings, recent trades, and account cash ratio into structured `TradingSignal[]`. Runner injects these signals into the existing decision prompt and stores them in public decision trace for verification.

**Tech Stack:** Cloudflare Worker, TypeScript strict, Node test runner, existing Signal Arena D1/public API pipeline.

---

### Task 1: Define Signal Types And Generator

**Files:**
- Modify: `workers/signal-arena-api/src/types.ts`
- Create: `workers/signal-arena-api/src/signal-generator.ts`
- Test: `workers/signal-arena-api/src/signal-generator.test.ts`

- [ ] **Step 1: Write failing generator tests**

Add tests that expect `generateTradingSignals()` to create pullback, momentum, take-profit, and recent-sell-suppressed signals.

- [ ] **Step 2: Run red test**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: fail because `signal-generator.ts` does not exist.

- [ ] **Step 3: Implement minimal generator**

Add `TradingSignal` to `types.ts`, implement `generateTradingSignals()` with deterministic thresholds, and keep output capped/sorted.

- [ ] **Step 4: Run green test**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: signal generator tests pass.

### Task 2: Inject Signals Into Runner And Prompt

**Files:**
- Modify: `workers/signal-arena-api/src/runner.ts`
- Modify: `workers/signal-arena-api/src/prompt.ts`
- Test: `workers/signal-arena-api/src/runner.test.ts`
- Test: `workers/signal-arena-api/src/prompt.test.ts`

- [ ] **Step 1: Write failing runner/prompt tests**

Add a runner test that captures the AI user prompt and asserts that `signals` contains generated signal types instead of an empty array. Add a prompt test that the instructions tell AI to treat signals as evidence, not commands.

- [ ] **Step 2: Run red test**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: fail because Runner still sends `signals: []`.

- [ ] **Step 3: Implement runner/prompt wiring**

Call `generateTradingSignals()` after upstream payload normalization, pass the result to `context.signals`, and include it in `decisionTrace.signalContext`.

- [ ] **Step 4: Run green test**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: all Worker tests pass.

### Task 3: Expose Signal Context Safely

**Files:**
- Modify: `workers/signal-arena-api/src/public-data.ts`
- Modify: `types/signal-arena.ts`
- Modify: `lib/signal-arena-sanitize.ts`
- Modify: `components/signal-arena/SignalArenaDecisionModal.tsx`
- Test: `workers/signal-arena-api/src/public-data.test.ts`
- Test: `scripts/signal-arena-layout.test.mjs`

- [ ] **Step 1: Write failing public/frontend tests**

Assert public data preserves `decisionTrace.signalContext` and the modal includes "前置信号".

- [ ] **Step 2: Run red tests**

Run: `pnpm --dir workers/signal-arena-api test && pnpm test:signal-arena`

Expected: fail because signal context is not yet sanitized or displayed.

- [ ] **Step 3: Implement public/frontend exposure**

Whitelist signal fields and render a compact signal list in the decision modal.

- [ ] **Step 4: Run green tests**

Run: `pnpm --dir workers/signal-arena-api test && pnpm test:signal-arena`

Expected: all related tests pass.

### Task 4: Verify, Deploy, And Check Online Effectiveness

**Files:**
- Modify: `PROGRESS.md`

- [ ] **Step 1: Run full verification**

Run:

```bash
pnpm --dir workers/signal-arena-api test
pnpm --dir workers/signal-arena-api typecheck
pnpm test:signal-arena
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all pass. `pnpm build` may still print the known game-api timeout warning but must exit 0.

- [ ] **Step 2: Deploy Worker**

Run from `workers/signal-arena-api`:

```bash
npx wrangler deploy --config wrangler.toml
```

Expected: deploy succeeds and returns a new Worker version.

- [ ] **Step 3: Validate online API**

Run:

```bash
curl --max-time 30 -sS https://signal-arena-api.maysssss.cn/api/public/all
```

Expected: latest post-deploy run or next trading run exposes `decisionTrace.signalContext`; if no new run exists yet, schedule automation will check during market hours.

- [ ] **Step 4: Update progress**

Record implementation, verification, deployment version, and any online validation limits in `PROGRESS.md`.
