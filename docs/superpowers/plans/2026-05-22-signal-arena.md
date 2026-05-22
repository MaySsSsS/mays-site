# Signal Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public Signal Arena dashboard plus a cloud-hosted A-share AI Trader Runner that can keep operating when the local Codex app is offline.

**Architecture:** Add a standalone Cloudflare Worker at `workers/signal-arena-api` to own secrets, upstream Signal Arena calls, short caching, AI decisions, risk checks, D1 logs, and cron execution. The Next.js app reads sanitized public data from that worker and renders `/signal-arena`, `/signal-arena/logs`, and `/signal-arena/rank`; the homepage gets a new `SIGNAL ARENA` portal card while preserving the sealed placeholder.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, CSS Modules, Node test runner, Cloudflare Workers, D1, KV, OpenAI-compatible Responses API, Signal Arena API.

---

## File Structure

- Create `types/signal-arena.ts`: shared public snapshot, log, rank, action, and status types used by the Next pages.
- Create `lib/signal-arena-sanitize.ts`: whitelist sanitizer for worker JSON before it crosses into public frontend data.
- Create `lib/signal-arena-data.ts`: server-only frontend client for the Signal Arena Worker public endpoints with static fallback fixtures for local build.
- Create `public/data/signal-arena/fallback.json`: non-secret demo/fallback data used when the worker URL is not configured.
- Create `components/signal-arena/SignalArenaShell.tsx`: shared page shell and tab navigation.
- Create `components/signal-arena/SignalArenaDashboard.tsx`: dashboard view.
- Create `components/signal-arena/SignalArenaLogs.tsx`: decision log view.
- Create `components/signal-arena/SignalArenaRank.tsx`: rank view.
- Create `styles/signal-arena.module.css`: all Signal Arena page styles.
- Create `app/signal-arena/page.tsx`: dashboard route.
- Create `app/signal-arena/logs/page.tsx`: logs route.
- Create `app/signal-arena/rank/page.tsx`: rank route.
- Modify `app/page.tsx`: add the `SIGNAL ARENA` portal item without removing `sealedPanels`.
- Modify `styles/portal.module.css`: add a `signalArenaPanel` variant.
- Create `scripts/signal-arena-layout.test.mjs`: regression tests for routes, portal entry, sealed panel preservation, and secret safety.
- Create `workers/signal-arena-api/package.json`: standalone Worker package with `dev`, `deploy`, `typecheck`, `test`, and `tail` scripts.
- Create `workers/signal-arena-api/tsconfig.json`: strict Worker TypeScript config.
- Create `workers/signal-arena-api/wrangler.toml`: Worker config with D1, KV, cron, vars, and secret placeholders.
- Create `workers/signal-arena-api/schema.sql`: D1 schema for runs, decisions, risk checks, orders, and snapshots.
- Create `workers/signal-arena-api/src/types.ts`: Worker-private upstream, decision, risk, and storage types.
- Create `workers/signal-arena-api/src/http.ts`: CORS, JSON response, auth, and routing helpers.
- Create `workers/signal-arena-api/src/signal-api.ts`: Signal Arena upstream API client.
- Create `workers/signal-arena-api/src/public-data.ts`: public snapshot construction and short cache logic.
- Create `workers/signal-arena-api/src/ai-provider.ts`: custom Responses API client with strict/light model support.
- Create `workers/signal-arena-api/src/prompt.ts`: structured decision prompt builder.
- Create `workers/signal-arena-api/src/risk.ts`: A-share risk checks and single-action selection.
- Create `workers/signal-arena-api/src/runner.ts`: locked cron/manual runner orchestration.
- Create `workers/signal-arena-api/src/storage.ts`: D1 and KV persistence.
- Create `workers/signal-arena-api/src/index.ts`: Worker fetch and scheduled entrypoint.
- Create `workers/signal-arena-api/src/risk.test.ts`: Worker-side risk tests.
- Create `workers/signal-arena-api/src/prompt.test.ts`: prompt/schema tests.
- Modify `package.json`: add `test:signal-arena` and optional Worker helper scripts.
- Modify `PROGRESS.md`: record the design/plan and later verification.

---

## Task 1: Public Types, Fixtures, And Frontend Data Client

**Files:**
- Create: `types/signal-arena.ts`
- Create: `public/data/signal-arena/fallback.json`
- Create: `lib/signal-arena-sanitize.ts`
- Create: `lib/signal-arena-data.ts`
- Create: `scripts/signal-arena-layout.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing frontend data tests**

Create `scripts/signal-arena-layout.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const typeFile = await readFile(new URL("../types/signal-arena.ts", import.meta.url), "utf8").catch(() => "");
const dataFile = await readFile(new URL("../lib/signal-arena-data.ts", import.meta.url), "utf8").catch(() => "");
const sanitizerFile = await readFile(new URL("../lib/signal-arena-sanitize.ts", import.meta.url), "utf8").catch(() => "");
const fallbackJson = await readFile(new URL("../public/data/signal-arena/fallback.json", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const planFile = await readFile(new URL("../docs/superpowers/plans/2026-05-22-signal-arena.md", import.meta.url), "utf8");

test("Signal Arena public types exist and do not expose secret fields", () => {
  assert.match(typeFile, /export type SignalArenaDashboard/);
  assert.match(typeFile, /export type SignalArenaRunLog/);
  assert.match(typeFile, /export type SignalArenaRank/);
  assert.doesNotMatch(typeFile, /apiKey|agent-auth-api-key|SIGNAL_ARENA_AI_API_KEY|orderId/);
});

test("Signal Arena frontend data client uses server-only worker access", () => {
  assert.match(dataFile, /import "server-only"/);
  assert.match(dataFile, /toSignalArenaPublicData/);
  assert.match(dataFile, /SIGNAL_ARENA_API_URL/);
  assert.match(dataFile, /fallbackData/);
  assert.match(dataFile, /fetchJson<unknown>/);
  assert.match(dataFile, /toSignalArenaPublicData\(data\)/);
  assert.doesNotMatch(dataFile, /SIGNAL_ARENA_AI_API_KEY|SIGNAL_ARENA_AGENT_API_KEY/);
});

test("Signal Arena sanitizer whitelist-copies public data", () => {
  assert.match(sanitizerFile, /export function toSignalArenaPublicData/);
  assert.match(sanitizerFile, /orderResult: \{/);
  assert.match(sanitizerFile, /status: nullableString/);
  assert.match(sanitizerFile, /message: nullableString/);
  assert.doesNotMatch(sanitizerFile, /orderId/);
});

test("Signal Arena fallback data has the public dashboard shape", () => {
  const fallback = JSON.parse(fallbackJson);

  assert.equal(typeof fallback.dashboard.updatedAt, "string");
  assert.equal(fallback.dashboard.sourceStatus, "fallback");
  assert.ok(Array.isArray(fallback.dashboard.metrics));
  assert.ok(Array.isArray(fallback.dashboard.cnHoldings));
  assert.ok(Array.isArray(fallback.dashboard.marketSummaries));
  assert.ok(Array.isArray(fallback.logs));
  assert.equal(typeof fallback.rank.updatedAt, "string");
  assert.ok(Array.isArray(fallback.rank.leaders));
  assert.ok(Array.isArray(fallback.rank.nearby));
  assert.doesNotMatch(fallbackJson, /orderId/);
});

test("Signal Arena plan keeps public mapping sanitized", () => {
  const task9Start = planFile.indexOf("## Task 9:");
  const task10Start = planFile.indexOf("## Task 10:");
  const task9 = planFile.slice(task9Start, task10Start);

  assert.notEqual(task9Start, -1);
  assert.notEqual(task10Start, -1);
  assert.match(planFile, /toSignalArenaPublicData/);
  assert.doesNotMatch(task9, /orderId/);
});

test("package exposes Signal Arena regression tests", () => {
  const parsed = JSON.parse(packageJson);
  assert.equal(parsed.scripts["test:signal-arena"], "node --test scripts/signal-arena-layout.test.mjs");
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:signal-arena`

Expected: fails because the script is not registered or files do not exist yet.

- [ ] **Step 3: Add the shared public types**

Create `types/signal-arena.ts`:

```ts
export type SignalArenaMarket = "CN" | "HK" | "US";

export type SignalArenaRunStatus = "executed" | "held" | "blocked" | "skipped" | "failed";

export type SignalArenaActionType = "buy" | "sell" | "hold";

export type SignalArenaMetric = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

export type SignalArenaHolding = {
  symbol: string;
  name: string;
  market: SignalArenaMarket;
  shares: number;
  availableShares: number;
  costPrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  positionRate: number;
};

export type SignalArenaMarketSummary = {
  market: SignalArenaMarket;
  label: string;
  totalValue: number;
  profit: number;
  profitRate: number;
  holdingsCount: number;
};

export type SignalArenaCandidateAction = {
  symbol: string;
  action: SignalArenaActionType;
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
};

export type SignalArenaRunLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: SignalArenaRunStatus;
  trigger: "cron" | "manual";
  marketView: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  summary: string;
  candidates: SignalArenaCandidateAction[];
  selectedAction: SignalArenaCandidateAction | null;
  riskResult: {
    allowed: boolean;
    reasons: string[];
  };
  orderResult: {
    status: string | null;
    message: string | null;
  };
};

export type SignalArenaRankEntry = {
  rank: number;
  nickname: string;
  totalAssets: number;
  returnRate: number;
  isCurrentAgent: boolean;
};

export type SignalArenaRank = {
  currentRank: number | null;
  returnRate: number;
  leaderGap: number | null;
  leaders: SignalArenaRankEntry[];
  nearby: SignalArenaRankEntry[];
  updatedAt: string;
};

export type SignalArenaDashboard = {
  updatedAt: string;
  sourceStatus: "live" | "stale" | "fallback" | "error";
  totalAssets: number;
  initialCapital: number;
  cash: number;
  frozenCash: number;
  returnRate: number;
  currentRank: number | null;
  metrics: SignalArenaMetric[];
  cnHoldings: SignalArenaHolding[];
  marketSummaries: SignalArenaMarketSummary[];
  latestRun: SignalArenaRunLog | null;
};

export type SignalArenaPublicData = {
  dashboard: SignalArenaDashboard;
  logs: SignalArenaRunLog[];
  rank: SignalArenaRank;
};
```

- [ ] **Step 4: Add safe fallback data**

Create `public/data/signal-arena/fallback.json`:

```json
{
  "dashboard": {
    "updatedAt": "2026-05-22T00:00:00.000Z",
    "sourceStatus": "fallback",
    "totalAssets": 1000000,
    "initialCapital": 1000000,
    "cash": 1000000,
    "frozenCash": 0,
    "returnRate": 0,
    "currentRank": null,
    "metrics": [
      { "label": "总资产", "value": "¥1,000,000", "tone": "neutral" },
      { "label": "收益率", "value": "0.00%", "tone": "neutral" },
      { "label": "当前排名", "value": "未同步", "tone": "warning" },
      { "label": "可用现金", "value": "¥1,000,000", "tone": "neutral" }
    ],
    "cnHoldings": [],
    "marketSummaries": [
      { "market": "CN", "label": "A 股", "totalValue": 0, "profit": 0, "profitRate": 0, "holdingsCount": 0 },
      { "market": "HK", "label": "港股", "totalValue": 0, "profit": 0, "profitRate": 0, "holdingsCount": 0 },
      { "market": "US", "label": "美股", "totalValue": 0, "profit": 0, "profitRate": 0, "holdingsCount": 0 }
    ],
    "latestRun": null
  },
  "logs": [],
  "rank": {
    "currentRank": null,
    "returnRate": 0,
    "leaderGap": null,
    "leaders": [],
    "nearby": [],
    "updatedAt": "2026-05-22T00:00:00.000Z"
  }
}
```

- [ ] **Step 5: Add the whitelist sanitizer and server-only data client**

Create `lib/signal-arena-sanitize.ts`:

```ts
import type { SignalArenaPublicData } from "@/types/signal-arena";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function toSignalArenaPublicData(value: unknown): SignalArenaPublicData | null {
  if (!isRecord(value) || !isRecord(value.dashboard) || !isRecord(value.rank)) {
    return null;
  }

  // Whitelist-copy every public field from types/signal-arena.ts.
  // For logs, public orderResult must be { status, message } only.
  // Never spread worker records or return raw worker JSON.
}
```

Create `lib/signal-arena-data.ts`:

```ts
import "server-only";

import { toSignalArenaPublicData } from "@/lib/signal-arena-sanitize";
import fallbackData from "@/public/data/signal-arena/fallback.json";
import type { SignalArenaPublicData } from "@/types/signal-arena";

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Signal Arena worker returned ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSignalArenaPublicData(): Promise<SignalArenaPublicData> {
  const baseUrl = process.env.SIGNAL_ARENA_API_URL;

  if (!baseUrl) {
    return fallbackData as SignalArenaPublicData;
  }

  try {
    const data = await fetchJson<unknown>(`${baseUrl.replace(/\/$/, "")}/api/public/all`);
    const sanitizedData = toSignalArenaPublicData(data);

    if (sanitizedData) {
      return sanitizedData;
    }

    return fallbackData as SignalArenaPublicData;
  } catch {
    return fallbackData as SignalArenaPublicData;
  }
}
```

- [ ] **Step 6: Register the test script**

Modify `package.json` scripts:

```json
{
  "test:signal-arena": "node --test scripts/signal-arena-layout.test.mjs"
}
```

Keep existing scripts unchanged.

- [ ] **Step 7: Run the test**

Run: `pnpm test:signal-arena`

Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add package.json scripts/signal-arena-layout.test.mjs types/signal-arena.ts lib/signal-arena-data.ts public/data/signal-arena/fallback.json
git commit -m "feat: add Signal Arena public data model"
```

---

## Task 2: Public Signal Arena Pages

**Files:**
- Modify: `scripts/signal-arena-layout.test.mjs`
- Create: `components/signal-arena/SignalArenaShell.tsx`
- Create: `components/signal-arena/SignalArenaDashboard.tsx`
- Create: `components/signal-arena/SignalArenaLogs.tsx`
- Create: `components/signal-arena/SignalArenaRank.tsx`
- Create: `styles/signal-arena.module.css`
- Create: `app/signal-arena/page.tsx`
- Create: `app/signal-arena/logs/page.tsx`
- Create: `app/signal-arena/rank/page.tsx`

- [ ] **Step 1: Extend the route tests**

Append to `scripts/signal-arena-layout.test.mjs`:

```js
const dashboardPage = await readFile(new URL("../app/signal-arena/page.tsx", import.meta.url), "utf8").catch(() => "");
const logsPage = await readFile(new URL("../app/signal-arena/logs/page.tsx", import.meta.url), "utf8").catch(() => "");
const rankPage = await readFile(new URL("../app/signal-arena/rank/page.tsx", import.meta.url), "utf8").catch(() => "");

test("Signal Arena routes are dynamic and use the server data client", () => {
  for (const file of [dashboardPage, logsPage, rankPage]) {
    assert.match(file, /dynamic = "force-dynamic"/);
    assert.match(file, /getSignalArenaPublicData/);
  }
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:signal-arena`

Expected: fails because the route files do not exist.

- [ ] **Step 3: Create the shared shell**

Create `components/signal-arena/SignalArenaShell.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/styles/signal-arena.module.css";

type SignalArenaShellProps = {
  active: "dashboard" | "logs" | "rank";
  updatedAt: string;
  children: ReactNode;
};

const navItems = [
  { id: "dashboard", label: "总览", href: "/signal-arena" },
  { id: "logs", label: "决策日志", href: "/signal-arena/logs" },
  { id: "rank", label: "竞技排名", href: "/signal-arena/rank" }
] as const;

export function SignalArenaShell({ active, updatedAt, children }: SignalArenaShellProps) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>SIGNAL ARENA</p>
          <h1 className={styles.title}>AI Trader Runner</h1>
        </div>
        <p className={styles.updated}>最后更新 {new Date(updatedAt).toLocaleString("zh-CN", { hour12: false })}</p>
      </header>
      <nav className={styles.tabs} aria-label="Signal Arena navigation">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={item.id === active ? styles.tabActive : styles.tab}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}
```

- [ ] **Step 4: Create dashboard component**

Create `components/signal-arena/SignalArenaDashboard.tsx`:

```tsx
import type { SignalArenaDashboard as DashboardData } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaDashboardProps = {
  dashboard: DashboardData;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function SignalArenaDashboard({ dashboard }: SignalArenaDashboardProps) {
  return (
    <section className={styles.dashboard}>
      <div className={styles.metricGrid}>
        {dashboard.metrics.map((metric) => (
          <article key={metric.label} className={`${styles.metric} ${styles[metric.tone]}`}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </div>

      <section className={styles.section}>
        <h2>A 股核心持仓</h2>
        <div className={styles.table}>
          {dashboard.cnHoldings.length === 0 ? (
            <p className={styles.empty}>暂无 A 股持仓。</p>
          ) : (
            dashboard.cnHoldings.map((holding) => (
              <div key={holding.symbol} className={styles.tableRow}>
                <strong>{holding.name}</strong>
                <span>{holding.symbol}</span>
                <span>{holding.shares} 股</span>
                <span>{formatMoney(holding.marketValue)}</span>
                <span>{formatPercent(holding.profitRate)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2>最近一轮 AI 动作</h2>
        {dashboard.latestRun ? (
          <article className={styles.runCard}>
            <span className={styles.status}>{dashboard.latestRun.status}</span>
            <h3>{dashboard.latestRun.summary}</h3>
            <p>{dashboard.latestRun.riskResult.reasons.join(" / ") || "风控通过或无需交易。"}</p>
          </article>
        ) : (
          <p className={styles.empty}>Runner 尚未产生云端决策日志。</p>
        )}
      </section>

      <section className={styles.marketStrip}>
        {dashboard.marketSummaries.map((market) => (
          <article key={market.market}>
            <span>{market.label}</span>
            <strong>{formatMoney(market.totalValue)}</strong>
            <em>{formatPercent(market.profitRate)}</em>
          </article>
        ))}
      </section>
    </section>
  );
}
```

- [ ] **Step 5: Create logs component**

Create `components/signal-arena/SignalArenaLogs.tsx`:

```tsx
import type { SignalArenaRunLog } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaLogsProps = {
  logs: SignalArenaRunLog[];
};

export function SignalArenaLogs({ logs }: SignalArenaLogsProps) {
  if (logs.length === 0) {
    return <p className={styles.empty}>暂无 AI Runner 日志。</p>;
  }

  return (
    <section className={styles.timeline}>
      {logs.map((log) => (
        <article key={log.id} className={styles.logItem}>
          <time>{new Date(log.startedAt).toLocaleString("zh-CN", { hour12: false })}</time>
          <span className={styles.status}>{log.status}</span>
          <h2>{log.summary}</h2>
          <p>市场判断：{log.marketView} / 风险：{log.riskLevel}</p>
          <ul>
            {log.candidates.map((candidate) => (
              <li key={`${log.id}-${candidate.symbol}-${candidate.action}`}>
                {candidate.action.toUpperCase()} {candidate.symbol} {candidate.shares} 股：{candidate.reason}
              </li>
            ))}
          </ul>
          <p>{log.riskResult.reasons.join(" / ") || "无风控拦截。"}</p>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 6: Create rank component**

Create `components/signal-arena/SignalArenaRank.tsx`:

```tsx
import type { SignalArenaRank as RankData } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaRankProps = {
  rank: RankData;
};

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function SignalArenaRank({ rank }: SignalArenaRankProps) {
  return (
    <section className={styles.rankPage}>
      <div className={styles.rankHero}>
        <span>当前排名</span>
        <strong>{rank.currentRank ?? "未同步"}</strong>
        <em>收益率 {formatRate(rank.returnRate)}</em>
      </div>

      <section className={styles.section}>
        <h2>排行榜前列</h2>
        {rank.leaders.length === 0 ? (
          <p className={styles.empty}>暂无排行榜数据。</p>
        ) : (
          rank.leaders.map((entry) => (
            <div key={`${entry.rank}-${entry.nickname}`} className={entry.isCurrentAgent ? styles.rankCurrent : styles.rankRow}>
              <span>#{entry.rank}</span>
              <strong>{entry.nickname}</strong>
              <span>{formatRate(entry.returnRate)}</span>
            </div>
          ))
        )}
      </section>

      <section className={styles.section}>
        <h2>附近对手</h2>
        {rank.nearby.map((entry) => (
          <div key={`${entry.rank}-${entry.nickname}`} className={entry.isCurrentAgent ? styles.rankCurrent : styles.rankRow}>
            <span>#{entry.rank}</span>
            <strong>{entry.nickname}</strong>
            <span>{formatRate(entry.returnRate)}</span>
          </div>
        ))}
      </section>
    </section>
  );
}
```

- [ ] **Step 7: Create page styles**

Create `styles/signal-arena.module.css` with compact dashboard styling:

```css
.page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f3ea;
  color: #171717;
  font-family: var(--font-ui);
}

.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  max-width: 1180px;
  margin: 0 auto 20px;
  border-bottom: 4px solid #171717;
  padding-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
}

.title {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 5.5rem);
  line-height: 0.9;
  text-transform: uppercase;
}

.updated {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  gap: 8px;
  max-width: 1180px;
  margin: 0 auto 28px;
}

.tab,
.tabActive {
  border: 3px solid #171717;
  padding: 10px 14px;
  color: inherit;
  font-weight: 900;
  text-decoration: none;
}

.tabActive {
  background: #ffd426;
}

.dashboard,
.rankPage,
.timeline {
  max-width: 1180px;
  margin: 0 auto;
}

.metricGrid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric,
.section,
.runCard,
.logItem,
.rankHero {
  border: 4px solid #171717;
  background: #fffdf4;
  padding: 18px;
}

.metric span,
.rankHero span {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 800;
}

.metric strong,
.rankHero strong {
  display: block;
  margin-top: 10px;
  font-size: 2rem;
}

.positive {
  background: #d8f7dd;
}

.negative {
  background: #ffd8d8;
}

.warning {
  background: #fff0ae;
}

.neutral {
  background: #fffdf4;
}

.section {
  margin-top: 16px;
}

.table {
  display: grid;
  gap: 8px;
}

.tableRow,
.rankRow,
.rankCurrent {
  display: grid;
  grid-template-columns: 1.2fr 0.9fr 0.8fr 0.9fr 0.8fr;
  gap: 12px;
  align-items: center;
  border-top: 2px solid #171717;
  padding: 10px 0;
}

.rankRow,
.rankCurrent {
  grid-template-columns: 72px 1fr 120px;
}

.rankCurrent {
  background: #d9e8ff;
}

.status {
  display: inline-flex;
  border: 2px solid #171717;
  padding: 4px 8px;
  background: #1e88e5;
  color: #fff;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 900;
}

.empty {
  margin: 0;
  color: #555;
}

.marketStrip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.marketStrip article {
  border: 4px solid #171717;
  background: #fffdf4;
  padding: 16px;
}

.marketStrip span,
.marketStrip strong,
.marketStrip em {
  display: block;
}

.timeline {
  display: grid;
  gap: 14px;
}

.rankHero {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

@media (max-width: 760px) {
  .page {
    padding: 20px;
  }

  .header {
    display: grid;
  }

  .metricGrid,
  .marketStrip {
    grid-template-columns: 1fr;
  }

  .tableRow {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Create the three routes**

Create `app/signal-arena/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SignalArenaDashboard } from "@/components/signal-arena/SignalArenaDashboard";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena",
  description: "MAYS UNIVERSE 的 AI 模拟炒股公开看板。"
};

export default async function SignalArenaPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="dashboard" updatedAt={data.dashboard.updatedAt}>
      <SignalArenaDashboard dashboard={data.dashboard} />
    </SignalArenaShell>
  );
}
```

Create `app/signal-arena/logs/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SignalArenaLogs } from "@/components/signal-arena/SignalArenaLogs";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena Logs",
  description: "AI Trader Runner 决策日志。"
};

export default async function SignalArenaLogsPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="logs" updatedAt={data.dashboard.updatedAt}>
      <SignalArenaLogs logs={data.logs} />
    </SignalArenaShell>
  );
}
```

Create `app/signal-arena/rank/page.tsx`:

```tsx
import type { Metadata } from "next";

import { SignalArenaRank } from "@/components/signal-arena/SignalArenaRank";
import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import { getSignalArenaPublicData } from "@/lib/signal-arena-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signal Arena Rank",
  description: "AI Trader Runner 竞技排名。"
};

export default async function SignalArenaRankPage() {
  const data = await getSignalArenaPublicData();

  return (
    <SignalArenaShell active="rank" updatedAt={data.rank.updatedAt}>
      <SignalArenaRank rank={data.rank} />
    </SignalArenaShell>
  );
}
```

- [ ] **Step 9: Run tests and typecheck**

Run:

```bash
pnpm test:signal-arena
pnpm typecheck
```

Expected: both pass.

- [ ] **Step 10: Commit**

```bash
git add app/signal-arena components/signal-arena styles/signal-arena.module.css scripts/signal-arena-layout.test.mjs
git commit -m "feat: add Signal Arena public pages"
```

---

## Task 3: Homepage Portal Entry

**Files:**
- Modify: `scripts/portal-layout.test.mjs`
- Modify: `app/page.tsx`
- Modify: `styles/portal.module.css`

- [ ] **Step 1: Extend the portal regression test**

Add these assertions to `scripts/portal-layout.test.mjs`:

```js
test("portal exposes Signal Arena while preserving sealed panel", () => {
  assert.match(portalPage, /SIGNAL ARENA/);
  assert.match(portalPage, /href:\s*"\/signal-arena"/);
  assert.match(portalPage, /maysssss\.cn\/signal-arena/);
  assert.match(portalPage, /CLASSIFIED/);
  assert.match(portalPage, /未完待续/);
  assert.match(portalPage, /sealedPanels/);
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:portal`

Expected: fails because `SIGNAL ARENA` is not present.

- [ ] **Step 3: Add the portal item**

In `app/page.tsx`, add this object to `portalItems` after `AI DAILY`:

```ts
  {
    eyebrow: "ARENA",
    title: "SIGNAL ARENA",
    href: "/signal-arena",
    domain: "maysssss.cn/signal-arena",
    className: styles.signalArenaPanel
  }
```

Do not modify `sealedPanels`.

- [ ] **Step 4: Add panel styling**

Append to `styles/portal.module.css` near the other panel variants:

```css
.signalArenaPanel {
  background:
    linear-gradient(135deg, rgba(255, 212, 38, 0.92), rgba(255, 253, 240, 0.84)),
    repeating-linear-gradient(
      -22deg,
      rgba(0, 0, 0, 0.18) 0 4px,
      transparent 4px 16px
    );
}

.signalArenaPanel .panelAction {
  background: var(--comic-green);
}
```

If `.panelAction` variants are not scoped this way in the existing file, match the local pattern used by `gamePanel`, `photoPanel`, `toolsPanel`, and `aiPanel`.

- [ ] **Step 5: Run portal and Signal Arena tests**

Run:

```bash
pnpm test:portal
pnpm test:signal-arena
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx styles/portal.module.css scripts/portal-layout.test.mjs
git commit -m "feat: add Signal Arena portal entry"
```

---

## Task 4: Worker Scaffold, D1 Schema, And Public API Shell

**Files:**
- Create: `workers/signal-arena-api/package.json`
- Create: `workers/signal-arena-api/tsconfig.json`
- Create: `workers/signal-arena-api/wrangler.toml`
- Create: `workers/signal-arena-api/schema.sql`
- Create: `workers/signal-arena-api/src/types.ts`
- Create: `workers/signal-arena-api/src/http.ts`
- Create: `workers/signal-arena-api/src/storage.ts`
- Create: `workers/signal-arena-api/src/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Create worker package metadata**

Create `workers/signal-arena-api/package.json`:

```json
{
  "name": "mays-signal-arena-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail",
    "typecheck": "tsc --noEmit",
    "test": "tsx src/prompt.test.ts"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.3",
    "wrangler": "^4.81.1"
  }
}
```

- [ ] **Step 2: Create worker TypeScript config**

Create `workers/signal-arena-api/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2021"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create wrangler config**

Create `workers/signal-arena-api/wrangler.toml`:

```toml
name = "mays-signal-arena-api"
main = "src/index.ts"
compatibility_date = "2026-05-22"

[[d1_databases]]
binding = "SIGNAL_ARENA_DB"
database_name = "signal-arena"
database_id = "replace-after-d1-create"

[[kv_namespaces]]
binding = "SIGNAL_ARENA_KV"
id = "replace-after-kv-create"

[triggers]
crons = ["*/15 1-7 * * 1-5"]

[vars]
CORS_ORIGIN = "https://maysssss.cn"
SIGNAL_ARENA_BASE_URL = "https://signal.coze.com"
SIGNAL_ARENA_AI_PROVIDER = "custom-responses"
SIGNAL_ARENA_AI_BASE_URL = "https://sub2.de5.net"
SIGNAL_ARENA_AI_STRICT_MODEL = "gpt-5.5"
SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT = "xhigh"
SIGNAL_ARENA_AI_LIGHT_MODEL = "gpt-5.4"
SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT = "low"
SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE = "true"
```

Secrets to configure with `wrangler secret put` later:

```bash
SIGNAL_ARENA_AGENT_API_KEY
SIGNAL_ARENA_AI_API_KEY
SIGNAL_ARENA_ADMIN_TOKEN
```

- [ ] **Step 4: Create D1 schema**

Create `workers/signal-arena-api/schema.sql`:

```sql
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
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_signal_arena_runs_started_at
ON signal_arena_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS signal_arena_snapshots (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source_status TEXT NOT NULL,
  dashboard_json TEXT NOT NULL,
  rank_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signal_arena_snapshots_created_at
ON signal_arena_snapshots (created_at DESC);
```

- [ ] **Step 5: Add Worker env and storage types**

Create `workers/signal-arena-api/src/types.ts`:

```ts
export interface Env {
  SIGNAL_ARENA_DB: D1Database;
  SIGNAL_ARENA_KV: KVNamespace;
  CORS_ORIGIN: string;
  SIGNAL_ARENA_BASE_URL: string;
  SIGNAL_ARENA_AGENT_API_KEY: string;
  SIGNAL_ARENA_ADMIN_TOKEN: string;
  SIGNAL_ARENA_AI_PROVIDER: string;
  SIGNAL_ARENA_AI_BASE_URL: string;
  SIGNAL_ARENA_AI_API_KEY: string;
  SIGNAL_ARENA_AI_STRICT_MODEL: string;
  SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT: string;
  SIGNAL_ARENA_AI_LIGHT_MODEL: string;
  SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT: string;
  SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE: string;
}

export type RunnerTrigger = "cron" | "manual";

export type PublicApiError = {
  success: false;
  error: string;
  message: string;
};
```

- [ ] **Step 6: Add HTTP helpers**

Create `workers/signal-arena-api/src/http.ts`:

```ts
import type { Env, PublicApiError } from "./types";

export function corsHeaders(env: Env, request: Request): HeadersInit {
  const allowedOrigins = [env.CORS_ORIGIN, "https://maysssss.cn", "http://localhost:3000"];
  const requestOrigin = request.headers.get("Origin") ?? "";
  const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.CORS_ORIGIN;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

export function jsonResponse(data: unknown, env: Env, request: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(env, request)
    }
  });
}

export function errorResponse(error: string, message: string, env: Env, request: Request, status = 500): Response {
  const body: PublicApiError = { success: false, error, message };
  return jsonResponse(body, env, request, status);
}

export function requireAdmin(request: Request, env: Env): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  return Boolean(token && token === env.SIGNAL_ARENA_ADMIN_TOKEN);
}
```

- [ ] **Step 7: Add storage placeholders**

Create `workers/signal-arena-api/src/storage.ts`:

```ts
import type { Env } from "./types";

const PUBLIC_CACHE_KEY = "public:all";
const RUNNER_LOCK_KEY = "runner:lock";

export async function getCachedPublicData<T>(env: Env): Promise<T | null> {
  return await env.SIGNAL_ARENA_KV.get<T>(PUBLIC_CACHE_KEY, "json");
}

export async function putCachedPublicData(env: Env, value: unknown, ttlSeconds: number): Promise<void> {
  await env.SIGNAL_ARENA_KV.put(PUBLIC_CACHE_KEY, JSON.stringify(value), {
    expirationTtl: ttlSeconds
  });
}

export async function acquireRunnerLock(env: Env, runId: string, ttlSeconds: number): Promise<boolean> {
  const existing = await env.SIGNAL_ARENA_KV.get(RUNNER_LOCK_KEY);
  if (existing) {
    return false;
  }

  await env.SIGNAL_ARENA_KV.put(RUNNER_LOCK_KEY, runId, {
    expirationTtl: ttlSeconds
  });
  return true;
}

export async function releaseRunnerLock(env: Env, runId: string): Promise<void> {
  const existing = await env.SIGNAL_ARENA_KV.get(RUNNER_LOCK_KEY);
  if (existing === runId) {
    await env.SIGNAL_ARENA_KV.delete(RUNNER_LOCK_KEY);
  }
}
```

- [ ] **Step 8: Add Worker entrypoint shell**

Create `workers/signal-arena-api/src/index.ts`:

```ts
import { corsHeaders, errorResponse, jsonResponse, requireAdmin } from "./http";
import { getCachedPublicData } from "./storage";
import type { Env } from "./types";

async function handleFetch(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(env, request) });
  }

  const url = new URL(request.url);

  if (url.pathname === "/health" && request.method === "GET") {
    return jsonResponse({ status: "ok" }, env, request);
  }

  if (url.pathname === "/api/public/all" && request.method === "GET") {
    const cached = await getCachedPublicData(env);
    if (cached) {
      return jsonResponse(cached, env, request);
    }
    return errorResponse("not_ready", "Signal Arena data is not ready yet.", env, request, 503);
  }

  if (url.pathname === "/api/admin/run" && request.method === "POST") {
    if (!requireAdmin(request, env)) {
      return errorResponse("unauthorized", "Admin token is required.", env, request, 401);
    }
    return jsonResponse({ success: true, status: "not_implemented" }, env, request);
  }

  return errorResponse("not_found", "Route not found.", env, request, 404);
}

export default {
  fetch: handleFetch,
  async scheduled(_event: ScheduledEvent, _env: Env): Promise<void> {
    // Runner is wired in Task 9.
  }
};
```

- [ ] **Step 9: Add root helper scripts**

Modify root `package.json` scripts:

```json
{
  "dev:signal-arena-api": "pnpm --dir workers/signal-arena-api dev",
  "test:signal-arena-worker": "pnpm --dir workers/signal-arena-api test",
  "typecheck:signal-arena-worker": "pnpm --dir workers/signal-arena-api typecheck"
}
```

- [ ] **Step 10: Install Worker dependencies and typecheck**

Run:

```bash
pnpm --dir workers/signal-arena-api install
pnpm typecheck:signal-arena-worker
```

Expected: Worker TypeScript passes.

- [ ] **Step 11: Commit**

```bash
git add package.json workers/signal-arena-api
git commit -m "feat: scaffold Signal Arena worker"
```

---

## Task 5: Signal Arena Upstream Client And Public Snapshot Cache

**Files:**
- Create: `workers/signal-arena-api/src/signal-api.ts`
- Create: `workers/signal-arena-api/src/public-data.ts`
- Modify: `workers/signal-arena-api/src/index.ts`
- Modify: `workers/signal-arena-api/src/types.ts`

- [ ] **Step 1: Add upstream types**

Append to `workers/signal-arena-api/src/types.ts`:

```ts
export type ArenaApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ArenaHomeData = {
  agent_id?: string;
  nickname?: string;
  initial_capital?: number;
  total_assets?: number;
  cash?: number;
  frozen_cash?: number;
  return_rate?: number;
  rank?: number;
};

export type ArenaPortfolioData = {
  holdings?: Array<{
    symbol: string;
    name: string;
    market: "CN" | "HK" | "US";
    shares: number;
    available_shares?: number;
    cost_price?: number;
    current_price?: number;
    market_value?: number;
    profit?: number;
    profit_rate?: number;
  }>;
};

export type ArenaLeaderboardData = {
  leaderboard?: Array<{
    rank: number;
    nickname: string;
    total_assets?: number;
    return_rate?: number;
    agent_id?: string;
  }>;
};

export type ArenaTradesData = {
  trades?: Array<{
    id?: string;
    order_id?: string;
    symbol: string;
    action: "buy" | "sell";
    shares: number;
    status: string;
    reason?: string;
    created_at?: string;
  }>;
};
```

- [ ] **Step 2: Create upstream client**

Create `workers/signal-arena-api/src/signal-api.ts`:

```ts
import type {
  ArenaApiResponse,
  ArenaHomeData,
  ArenaLeaderboardData,
  ArenaPortfolioData,
  ArenaTradesData,
  Env
} from "./types";

async function requestArena<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.SIGNAL_ARENA_BASE_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "agent-auth-api-key": env.SIGNAL_ARENA_AGENT_API_KEY,
      ...(init?.headers ?? {})
    }
  });

  const body = (await response.json()) as ArenaApiResponse<T>;

  if (!response.ok || body.success === false || !body.data) {
    throw new Error(body.message || body.error || `Signal Arena request failed: ${response.status}`);
  }

  return body.data;
}

export async function fetchArenaHome(env: Env): Promise<ArenaHomeData> {
  return await requestArena<ArenaHomeData>(env, "/api/v1/arena/home");
}

export async function fetchArenaPortfolio(env: Env): Promise<ArenaPortfolioData> {
  return await requestArena<ArenaPortfolioData>(env, "/api/v1/arena/portfolio");
}

export async function fetchArenaTrades(env: Env): Promise<ArenaTradesData> {
  return await requestArena<ArenaTradesData>(env, "/api/v1/arena/trades");
}

export async function fetchArenaLeaderboard(env: Env): Promise<ArenaLeaderboardData> {
  return await requestArena<ArenaLeaderboardData>(env, "/api/v1/arena/leaderboard");
}
```

- [ ] **Step 3: Create public snapshot builder**

Create `workers/signal-arena-api/src/public-data.ts`:

```ts
import {
  fetchArenaHome,
  fetchArenaLeaderboard,
  fetchArenaPortfolio,
  fetchArenaTrades
} from "./signal-api";
import { getCachedPublicData, putCachedPublicData } from "./storage";
import type { Env } from "./types";

const CACHE_TTL_SECONDS = 120;

function money(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export async function getPublicData(env: Env): Promise<unknown> {
  const cached = await getCachedPublicData<unknown>(env);
  if (cached) {
    return cached;
  }

  const [home, portfolio, trades, leaderboard] = await Promise.all([
    fetchArenaHome(env),
    fetchArenaPortfolio(env),
    fetchArenaTrades(env),
    fetchArenaLeaderboard(env)
  ]);

  const updatedAt = new Date().toISOString();
  const holdings = portfolio.holdings ?? [];
  const cnHoldings = holdings
    .filter((holding) => holding.market === "CN")
    .map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      market: holding.market,
      shares: holding.shares,
      availableShares: holding.available_shares ?? 0,
      costPrice: holding.cost_price ?? 0,
      currentPrice: holding.current_price ?? 0,
      marketValue: holding.market_value ?? 0,
      profit: holding.profit ?? 0,
      profitRate: holding.profit_rate ?? 0,
      positionRate: home.total_assets ? (holding.market_value ?? 0) / home.total_assets : 0
    }));

  const publicData = {
    dashboard: {
      updatedAt,
      sourceStatus: "live",
      totalAssets: home.total_assets ?? home.initial_capital ?? 0,
      initialCapital: home.initial_capital ?? 1000000,
      cash: home.cash ?? 0,
      frozenCash: home.frozen_cash ?? 0,
      returnRate: home.return_rate ?? 0,
      currentRank: home.rank ?? null,
      metrics: [
        { label: "总资产", value: money(home.total_assets ?? 0), tone: "neutral" },
        { label: "收益率", value: percent(home.return_rate ?? 0), tone: (home.return_rate ?? 0) >= 0 ? "positive" : "negative" },
        { label: "当前排名", value: home.rank ? `#${home.rank}` : "未同步", tone: "neutral" },
        { label: "可用现金", value: money(home.cash ?? 0), tone: "neutral" }
      ],
      cnHoldings,
      marketSummaries: ["CN", "HK", "US"].map((market) => {
        const marketHoldings = holdings.filter((holding) => holding.market === market);
        const totalValue = marketHoldings.reduce((sum, holding) => sum + (holding.market_value ?? 0), 0);
        const profit = marketHoldings.reduce((sum, holding) => sum + (holding.profit ?? 0), 0);
        return {
          market,
          label: market === "CN" ? "A 股" : market === "HK" ? "港股" : "美股",
          totalValue,
          profit,
          profitRate: totalValue > 0 ? profit / totalValue : 0,
          holdingsCount: marketHoldings.length
        };
      }),
      latestRun: null
    },
    logs: [],
    rank: {
      currentRank: home.rank ?? null,
      returnRate: home.return_rate ?? 0,
      leaderGap: null,
      leaders: (leaderboard.leaderboard ?? []).slice(0, 10).map((entry) => ({
        rank: entry.rank,
        nickname: entry.nickname,
        totalAssets: entry.total_assets ?? 0,
        returnRate: entry.return_rate ?? 0,
        isCurrentAgent: entry.rank === home.rank
      })),
      nearby: (leaderboard.leaderboard ?? []).filter((entry) => home.rank ? Math.abs(entry.rank - home.rank) <= 3 : false).map((entry) => ({
        rank: entry.rank,
        nickname: entry.nickname,
        totalAssets: entry.total_assets ?? 0,
        returnRate: entry.return_rate ?? 0,
        isCurrentAgent: entry.rank === home.rank
      })),
      updatedAt
    },
    recentTrades: trades.trades ?? []
  };

  await putCachedPublicData(env, publicData, CACHE_TTL_SECONDS);
  return publicData;
}
```

- [ ] **Step 4: Wire public endpoint**

Modify `workers/signal-arena-api/src/index.ts`:

```ts
import { getPublicData } from "./public-data";
```

Replace the `/api/public/all` handler with:

```ts
  if (url.pathname === "/api/public/all" && request.method === "GET") {
    try {
      return jsonResponse(await getPublicData(env), env, request);
    } catch (error) {
      const cached = await getCachedPublicData(env);
      if (cached) {
        return jsonResponse(cached, env, request);
      }
      return errorResponse(
        "upstream_unavailable",
        error instanceof Error ? error.message : "Signal Arena upstream unavailable.",
        env,
        request,
        502
      );
    }
  }
```

- [ ] **Step 5: Typecheck Worker**

Run: `pnpm typecheck:signal-arena-worker`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add workers/signal-arena-api/src
git commit -m "feat: add Signal Arena public worker data"
```

---

## Task 6: AI Prompt And Provider

**Files:**
- Create: `workers/signal-arena-api/src/prompt.ts`
- Create: `workers/signal-arena-api/src/ai-provider.ts`
- Create: `workers/signal-arena-api/src/prompt.test.ts`
- Modify: `workers/signal-arena-api/src/types.ts`

- [ ] **Step 1: Write prompt tests**

Create `workers/signal-arena-api/src/prompt.test.ts`:

```ts
import assert from "node:assert/strict";

import { buildDecisionPrompt, extractDecisionJson } from "./prompt";

const context = {
  now: "2026-05-22T10:00:00+08:00",
  account: { totalAssets: 1000000, cash: 300000, returnRate: 0.02, rank: 12 },
  holdings: [
    { symbol: "sh600519", name: "贵州茅台", shares: 100, availableShares: 100, positionRate: 0.12, profitRate: 0.03 }
  ],
  signals: [{ symbol: "sz000858", name: "五粮液", changeRate: 0.04 }],
  constraints: ["Only A-share symbols are tradable", "Buy and sell shares must be multiples of 100"]
};

const prompt = buildDecisionPrompt(context);
assert.match(prompt.system, /模拟交易 Agent/);
assert.match(prompt.user, /Only A-share symbols/);

const decision = extractDecisionJson('分析如下 {"market_view":"neutral","risk_level":"low","summary":"保持观察","candidates":[],"cash_plan":"保留现金","watchlist":[]}');
assert.equal(decision.market_view, "neutral");
assert.deepEqual(decision.candidates, []);
```

- [ ] **Step 2: Run the failing prompt test**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: fails because `prompt.ts` does not exist.

- [ ] **Step 3: Add decision types**

Append to `workers/signal-arena-api/src/types.ts`:

```ts
export type DecisionPromptContext = {
  now: string;
  account: {
    totalAssets: number;
    cash: number;
    returnRate: number;
    rank: number | null;
  };
  holdings: Array<{
    symbol: string;
    name: string;
    shares: number;
    availableShares: number;
    positionRate: number;
    profitRate: number;
  }>;
  signals: Array<{
    symbol: string;
    name: string;
    changeRate: number;
  }>;
  constraints: string[];
};

export type AiCandidateAction = {
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
};

export type AiDecision = {
  market_view: "cautious" | "neutral" | "aggressive";
  risk_level: "low" | "medium" | "high";
  summary: string;
  candidates: AiCandidateAction[];
  cash_plan: string;
  watchlist: string[];
};
```

- [ ] **Step 4: Implement prompt builder**

Create `workers/signal-arena-api/src/prompt.ts`:

```ts
import type { AiDecision, DecisionPromptContext } from "./types";

export function buildDecisionPrompt(context: DecisionPromptContext): { system: string; user: string } {
  return {
    system: [
      "你是 Signal Arena 的模拟交易 Agent。",
      "目标是在严格风险控制下提升虚拟账户收益率。",
      "你只提供模拟交易决策，不提供真实投资建议。",
      "你必须只输出 JSON，不要输出 Markdown 或解释性前后缀。"
    ].join("\n"),
    user: JSON.stringify(
      {
        task: "根据账户、持仓、市场信号和约束，提出本轮 A 股模拟交易候选动作。",
        output_schema: {
          market_view: "cautious|neutral|aggressive",
          risk_level: "low|medium|high",
          summary: "string",
          candidates: [
            {
              symbol: "sh600519",
              action: "buy|sell|hold",
              shares: 100,
              priority: 1,
              confidence: 0.7,
              reason: "string"
            }
          ],
          cash_plan: "string",
          watchlist: ["sh600519"]
        },
        context
      },
      null,
      2
    )
  };
}

export function extractDecisionJson(text: string): AiDecision {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI decision JSON not found");
  }

  const parsed = JSON.parse(text.slice(start, end + 1)) as AiDecision;

  if (!parsed.summary || !Array.isArray(parsed.candidates) || !parsed.cash_plan) {
    throw new Error("AI decision JSON is missing required fields");
  }

  return parsed;
}
```

- [ ] **Step 5: Implement Responses provider**

Create `workers/signal-arena-api/src/ai-provider.ts`:

```ts
import type { AiDecision, Env } from "./types";
import { extractDecisionJson } from "./prompt";

type ResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

function getOutputText(result: ResponsesApiResult): string {
  if (result.output_text) {
    return result.output_text;
  }

  const text = result.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n");

  if (!text) {
    throw new Error("Responses API returned no text output");
  }

  return text;
}

export async function requestStrictDecision(
  env: Env,
  prompt: { system: string; user: string }
): Promise<AiDecision> {
  const response = await fetch(`${env.SIGNAL_ARENA_AI_BASE_URL.replace(/\/$/, "")}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.SIGNAL_ARENA_AI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.SIGNAL_ARENA_AI_STRICT_MODEL,
      reasoning: { effort: env.SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT },
      store: env.SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE !== "true",
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status}`);
  }

  const result = (await response.json()) as ResponsesApiResult;
  return extractDecisionJson(getOutputText(result));
}
```

- [ ] **Step 6: Run prompt tests**

Run: `pnpm --dir workers/signal-arena-api test`

Expected: prompt test passes.

- [ ] **Step 7: Commit**

```bash
git add workers/signal-arena-api/src/prompt.ts workers/signal-arena-api/src/ai-provider.ts workers/signal-arena-api/src/prompt.test.ts workers/signal-arena-api/src/types.ts
git commit -m "feat: add Signal Arena AI provider"
```

---

## Task 7: A-Share Risk Engine

**Files:**
- Create: `workers/signal-arena-api/src/risk.ts`
- Create: `workers/signal-arena-api/src/risk.test.ts`
- Modify: `workers/signal-arena-api/src/types.ts`

- [ ] **Step 1: Write risk tests**

Create `workers/signal-arena-api/src/risk.test.ts`:

```ts
import assert from "node:assert/strict";

import { selectExecutableAction } from "./risk";
import type { AiDecision, RiskContext } from "./types";

const baseDecision: AiDecision = {
  market_view: "neutral",
  risk_level: "low",
  summary: "测试",
  cash_plan: "保留现金",
  watchlist: [],
  candidates: [
    {
      symbol: "sh600519",
      action: "buy",
      shares: 100,
      priority: 1,
      confidence: 0.8,
      reason: "测试买入"
    }
  ]
};

const baseContext: RiskContext = {
  isTradingSession: true,
  totalAssets: 1000000,
  cash: 300000,
  prices: { sh600519: 1400 },
  holdings: {
    sh600519: {
      shares: 0,
      availableShares: 0,
      marketValue: 0,
      positionRate: 0
    }
  }
};

assert.equal(selectExecutableAction(baseDecision, baseContext).allowed, true);

assert.deepEqual(
  selectExecutableAction(
    { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], shares: 50 }] },
    baseContext
  ).reasons,
  ["A 股交易股数必须是 100 的整数倍。"]
);

assert.deepEqual(
  selectExecutableAction(
    { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], symbol: "AAPL" }] },
    baseContext
  ).reasons,
  ["第一版只允许 A 股代码。"]
);

assert.equal(
  selectExecutableAction(
    { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], action: "hold" }] },
    baseContext
  ).allowed,
  false
);
```

- [ ] **Step 2: Run failing risk tests**

Run: `pnpm test:signal-arena-worker`

Expected: fails because `risk.ts` and `RiskContext` do not exist.

- [ ] **Step 3: Add risk types**

Append to `workers/signal-arena-api/src/types.ts`:

```ts
export type RiskContext = {
  isTradingSession: boolean;
  totalAssets: number;
  cash: number;
  prices: Record<string, number>;
  holdings: Record<
    string,
    {
      shares: number;
      availableShares: number;
      marketValue: number;
      positionRate: number;
    }
  >;
};

export type RiskSelection = {
  allowed: boolean;
  reasons: string[];
  selectedAction: AiCandidateAction | null;
};
```

- [ ] **Step 4: Implement risk engine**

Create `workers/signal-arena-api/src/risk.ts`:

```ts
import type { AiCandidateAction, AiDecision, RiskContext, RiskSelection } from "./types";

const A_SHARE_PATTERN = /^(sh|sz)\d{6}$/;
const MAX_POSITION_RATE = 0.2;
const MIN_CASH_RATE = 0.2;

function validateAction(action: AiCandidateAction, context: RiskContext): string[] {
  const reasons: string[] = [];

  if (!context.isTradingSession) {
    reasons.push("当前不是 A 股交易时段。");
  }

  if (!A_SHARE_PATTERN.test(action.symbol)) {
    reasons.push("第一版只允许 A 股代码。");
  }

  if (action.action === "hold") {
    reasons.push("本轮建议为 hold，无需下单。");
  }

  if (action.shares <= 0 || action.shares % 100 !== 0) {
    reasons.push("A 股交易股数必须是 100 的整数倍。");
  }

  const price = context.prices[action.symbol] ?? 0;
  const holding = context.holdings[action.symbol];

  if (action.action === "buy") {
    const estimatedCost = price * action.shares;
    const remainingCash = context.cash - estimatedCost;
    const targetPositionRate = ((holding?.marketValue ?? 0) + estimatedCost) / context.totalAssets;

    if (estimatedCost > context.cash) {
      reasons.push("可用现金不足。");
    }

    if (remainingCash / context.totalAssets < MIN_CASH_RATE) {
      reasons.push("买入后现金储备会低于 20%。");
    }

    if (targetPositionRate > MAX_POSITION_RATE) {
      reasons.push("单只股票目标仓位会超过 20%。");
    }
  }

  if (action.action === "sell") {
    if (!holding || action.shares > holding.availableShares) {
      reasons.push("卖出数量超过可卖数量或触发 T+1 限制。");
    }
  }

  if (!action.reason.trim()) {
    reasons.push("交易理由为空。");
  }

  return reasons;
}

export function selectExecutableAction(decision: AiDecision, context: RiskContext): RiskSelection {
  const sorted = [...decision.candidates].sort((a, b) => a.priority - b.priority);

  for (const action of sorted) {
    const reasons = validateAction(action, context);
    if (reasons.length === 0) {
      return {
        allowed: true,
        reasons: [],
        selectedAction: action
      };
    }

    if (action === sorted[0]) {
      return {
        allowed: false,
        reasons,
        selectedAction: action
      };
    }
  }

  return {
    allowed: false,
    reasons: ["AI 未给出候选动作。"],
    selectedAction: null
  };
}
```

- [ ] **Step 5: Run Worker tests**

Modify `workers/signal-arena-api/package.json` test script before running:

```json
{
  "test": "tsx src/prompt.test.ts && tsx src/risk.test.ts"
}
```

Run: `pnpm test:signal-arena-worker`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add workers/signal-arena-api/package.json workers/signal-arena-api/src/risk.ts workers/signal-arena-api/src/risk.test.ts workers/signal-arena-api/src/types.ts
git commit -m "feat: add Signal Arena risk engine"
```

---

## Task 8: Runner Orchestration And Dry Run

**Files:**
- Create: `workers/signal-arena-api/src/runner.ts`
- Modify: `workers/signal-arena-api/src/index.ts`
- Modify: `workers/signal-arena-api/src/signal-api.ts`
- Modify: `workers/signal-arena-api/src/storage.ts`
- Modify: `workers/signal-arena-api/src/types.ts`

- [ ] **Step 1: Add trading endpoint helper**

Append to `workers/signal-arena-api/src/signal-api.ts`:

```ts
import type { AiCandidateAction } from "./types";

export async function submitArenaTrade(env: Env, action: AiCandidateAction): Promise<unknown> {
  return await requestArena<unknown>(env, "/api/v1/arena/trade", {
    method: "POST",
    body: JSON.stringify({
      symbol: action.symbol,
      action: action.action,
      shares: action.shares,
      reason: action.reason
    })
  });
}
```

- [ ] **Step 2: Add run storage helper**

Append to `workers/signal-arena-api/src/storage.ts`:

```ts
export async function insertRun(env: Env, run: {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  trigger: string;
  marketSession: string;
  marketView: string | null;
  riskLevel: string | null;
  summary: string | null;
  candidatesJson: string;
  selectedActionJson: string | null;
  riskResultJson: string;
  orderResultJson: string | null;
  errorMessage: string | null;
}): Promise<void> {
  await env.SIGNAL_ARENA_DB.prepare(
    `INSERT INTO signal_arena_runs (
      id, started_at, finished_at, status, trigger, market_session,
      market_view, risk_level, summary, candidates_json, selected_action_json,
      risk_result_json, order_result_json, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      run.id,
      run.startedAt,
      run.finishedAt,
      run.status,
      run.trigger,
      run.marketSession,
      run.marketView,
      run.riskLevel,
      run.summary,
      run.candidatesJson,
      run.selectedActionJson,
      run.riskResultJson,
      run.orderResultJson,
      run.errorMessage
    )
    .run();
}
```

- [ ] **Step 3: Implement runner**

Create `workers/signal-arena-api/src/runner.ts`:

```ts
import { requestStrictDecision } from "./ai-provider";
import { buildDecisionPrompt } from "./prompt";
import { selectExecutableAction } from "./risk";
import {
  fetchArenaHome,
  fetchArenaPortfolio,
  fetchArenaTrades,
  submitArenaTrade
} from "./signal-api";
import { acquireRunnerLock, insertRun, releaseRunnerLock } from "./storage";
import type { DecisionPromptContext, Env, RiskContext, RunnerTrigger } from "./types";

function isCnTradingSession(date = new Date()): boolean {
  const shanghai = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const day = shanghai.getDay();
  const minutes = shanghai.getHours() * 60 + shanghai.getMinutes();

  if (day === 0 || day === 6) {
    return false;
  }

  return (minutes >= 570 && minutes <= 690) || (minutes >= 780 && minutes <= 900);
}

export async function runSignalArenaTrader(
  env: Env,
  options: { trigger: RunnerTrigger; dryRun: boolean }
): Promise<{ id: string; status: string }> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const locked = await acquireRunnerLock(env, id, 600);

  if (!locked) {
    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "skipped",
      trigger: options.trigger,
      marketSession: "lock_busy",
      marketView: null,
      riskLevel: null,
      summary: "上一次 Runner 尚未结束，本轮跳过。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: ["Runner lock is busy."] }),
      orderResultJson: null,
      errorMessage: null
    });
    return { id, status: "skipped" };
  }

  try {
    const isTradingSession = isCnTradingSession();

    if (!isTradingSession) {
      await insertRun(env, {
        id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "skipped",
        trigger: options.trigger,
        marketSession: "closed",
        marketView: null,
        riskLevel: null,
        summary: "当前不是 A 股交易时段，本轮不调用 AI。",
        candidatesJson: "[]",
        selectedActionJson: null,
        riskResultJson: JSON.stringify({ allowed: false, reasons: ["Market closed."] }),
        orderResultJson: null,
        errorMessage: null
      });
      return { id, status: "skipped" };
    }

    const [home, portfolio, trades] = await Promise.all([
      fetchArenaHome(env),
      fetchArenaPortfolio(env),
      fetchArenaTrades(env)
    ]);

    const holdings = (portfolio.holdings ?? []).filter((holding) => holding.market === "CN");
    const context: DecisionPromptContext = {
      now: new Date().toISOString(),
      account: {
        totalAssets: home.total_assets ?? 1000000,
        cash: home.cash ?? 0,
        returnRate: home.return_rate ?? 0,
        rank: home.rank ?? null
      },
      holdings: holdings.map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        availableShares: holding.available_shares ?? 0,
        positionRate: home.total_assets ? (holding.market_value ?? 0) / home.total_assets : 0,
        profitRate: holding.profit_rate ?? 0
      })),
      signals: [],
      constraints: [
        "Only A-share symbols are tradable in v1.",
        "Buy and sell shares must be multiples of 100.",
        "Execute at most one order per run.",
        "Keep at least 20% cash after buys.",
        "Single stock target position must stay below 20%."
      ]
    };

    const decision = await requestStrictDecision(env, buildDecisionPrompt(context));
    const prices = Object.fromEntries(holdings.map((holding) => [holding.symbol, holding.current_price ?? 0]));
    const riskContext: RiskContext = {
      isTradingSession,
      totalAssets: home.total_assets ?? 1000000,
      cash: home.cash ?? 0,
      prices,
      holdings: Object.fromEntries(
        holdings.map((holding) => [
          holding.symbol,
          {
            shares: holding.shares,
            availableShares: holding.available_shares ?? 0,
            marketValue: holding.market_value ?? 0,
            positionRate: home.total_assets ? (holding.market_value ?? 0) / home.total_assets : 0
          }
        ])
      )
    };
    const risk = selectExecutableAction(decision, riskContext);
    const orderResult = risk.allowed && risk.selectedAction && !options.dryRun
      ? await submitArenaTrade(env, risk.selectedAction)
      : null;

    const status = risk.allowed ? (options.dryRun ? "held" : "executed") : "blocked";

    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status,
      trigger: options.trigger,
      marketSession: "open",
      marketView: decision.market_view,
      riskLevel: decision.risk_level,
      summary: decision.summary,
      candidatesJson: JSON.stringify(decision.candidates),
      selectedActionJson: risk.selectedAction ? JSON.stringify(risk.selectedAction) : null,
      riskResultJson: JSON.stringify({ allowed: risk.allowed, reasons: risk.reasons }),
      orderResultJson: orderResult ? JSON.stringify(orderResult) : null,
      errorMessage: null
    });

    return { id, status };
  } catch (error) {
    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      trigger: options.trigger,
      marketSession: "unknown",
      marketView: null,
      riskLevel: null,
      summary: "Runner 执行失败。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: [] }),
      orderResultJson: null,
      errorMessage: error instanceof Error ? error.message : "Unknown runner error"
    });
    return { id, status: "failed" };
  } finally {
    await releaseRunnerLock(env, id);
  }
}
```

- [ ] **Step 4: Wire manual and scheduled runner**

Modify `workers/signal-arena-api/src/index.ts`:

```ts
import { runSignalArenaTrader } from "./runner";
```

Replace the admin handler with:

```ts
  if (url.pathname === "/api/admin/run" && request.method === "POST") {
    if (!requireAdmin(request, env)) {
      return errorResponse("unauthorized", "Admin token is required.", env, request, 401);
    }

    const dryRun = url.searchParams.get("dryRun") !== "false";
    return jsonResponse(await runSignalArenaTrader(env, { trigger: "manual", dryRun }), env, request);
  }
```

Replace the scheduled handler with:

```ts
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runSignalArenaTrader(env, { trigger: "cron", dryRun: false });
  }
```

- [ ] **Step 5: Typecheck Worker**

Run: `pnpm typecheck:signal-arena-worker`

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add workers/signal-arena-api/src
git commit -m "feat: add Signal Arena runner dry run"
```

---

## Task 9: Logs From D1 Into Public Pages

**Files:**
- Modify: `workers/signal-arena-api/src/storage.ts`
- Modify: `workers/signal-arena-api/src/public-data.ts`

- [ ] **Step 1: Add run query helper**

Append to `workers/signal-arena-api/src/storage.ts`:

```ts
type RunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger: "cron" | "manual";
  market_view: string | null;
  risk_level: "low" | "medium" | "high" | null;
  summary: string | null;
  candidates_json: string;
  selected_action_json: string | null;
  risk_result_json: string;
  order_result_json: string | null;
};

export async function listRecentRuns(env: Env, limit = 30): Promise<RunRow[]> {
  const result = await env.SIGNAL_ARENA_DB.prepare(
    `SELECT id, started_at, finished_at, status, trigger, market_view, risk_level, summary,
      candidates_json, selected_action_json, risk_result_json, order_result_json
     FROM signal_arena_runs
     ORDER BY started_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<RunRow>();

  return result.results ?? [];
}
```

- [ ] **Step 2: Include logs in public data**

Modify `workers/signal-arena-api/src/public-data.ts` to import `listRecentRuns` and map rows:

```ts
import { getCachedPublicData, listRecentRuns, putCachedPublicData } from "./storage";
```

Inside `getPublicData`, load runs:

```ts
  const runs = await listRecentRuns(env, 30);
```

Add a public order-result mapper near the log mapping:

```ts
function pickPublicOrderResult(value: unknown): { status: string | null; message: string | null } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { status: null, message: null };
  }

  const record = value as Record<string, unknown>;

  return {
    status: typeof record.status === "string" ? record.status : null,
    message: typeof record.message === "string" ? record.message : null
  };
}
```

Set `logs` and `latestRun` using:

```ts
  const logs = runs.map((run) => ({
    id: run.id,
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    status: run.status,
    trigger: run.trigger,
    marketView: run.market_view ?? "unknown",
    riskLevel: run.risk_level ?? "unknown",
    summary: run.summary ?? "无摘要",
    candidates: JSON.parse(run.candidates_json),
    selectedAction: run.selected_action_json ? JSON.parse(run.selected_action_json) : null,
    riskResult: JSON.parse(run.risk_result_json),
    orderResult: run.order_result_json
      ? pickPublicOrderResult(JSON.parse(run.order_result_json))
      : { status: null, message: null }
  }));
```

Public log mapping must not expose real upstream order IDs. Keep private upstream `order_id` and D1
`orderResultJson` inside the Worker boundary; public `orderResult` is `{ status, message }` only.

Use `latestRun: logs[0] ?? null` in `dashboard`, and `logs` at the top level.

- [ ] **Step 3: Typecheck Worker and frontend**

Run:

```bash
pnpm typecheck:signal-arena-worker
pnpm typecheck
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add workers/signal-arena-api/src/storage.ts workers/signal-arena-api/src/public-data.ts
git commit -m "feat: expose Signal Arena runner logs"
```

---

## Task 10: Deployment Config And Secret Checklist

**Files:**
- Create: `workers/signal-arena-api/README.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Write Worker README**

Create `workers/signal-arena-api/README.md`:

```md
# mays-signal-arena-api

Cloudflare Worker for the public Signal Arena dashboard and cloud AI Trader Runner.

## Required resources

- D1 database bound as `SIGNAL_ARENA_DB`
- KV namespace bound as `SIGNAL_ARENA_KV`
- Secrets:
  - `SIGNAL_ARENA_AGENT_API_KEY`
  - `SIGNAL_ARENA_AI_API_KEY`
  - `SIGNAL_ARENA_ADMIN_TOKEN`

## Local checks

```bash
pnpm --dir workers/signal-arena-api install
pnpm typecheck:signal-arena-worker
pnpm test:signal-arena-worker
```

## Dry run

```bash
curl -X POST "$SIGNAL_ARENA_API_URL/api/admin/run?dryRun=true" \
  -H "Authorization: Bearer $SIGNAL_ARENA_ADMIN_TOKEN"
```

Dry-run must create a run log but must not submit a trade.
```

- [ ] **Step 2: Add deployment notes**

Append to `docs/DEPLOYMENT.md`:

```md
## Signal Arena

`workers/signal-arena-api` owns Signal Arena upstream credentials, AI provider credentials, public dashboard snapshots, and cron-based AI Trader Runner execution.

Required Cloudflare setup:

```bash
cd workers/signal-arena-api
npx wrangler d1 create signal-arena
npx wrangler kv namespace create SIGNAL_ARENA_KV
npx wrangler d1 execute signal-arena --file=schema.sql
npx wrangler secret put SIGNAL_ARENA_AGENT_API_KEY
npx wrangler secret put SIGNAL_ARENA_AI_API_KEY
npx wrangler secret put SIGNAL_ARENA_ADMIN_TOKEN
npx wrangler deploy
```

After deployment, set `SIGNAL_ARENA_API_URL` for the frontend deployment environment so Next.js server routes can read public dashboard data.
```

- [ ] **Step 3: Update progress**

Add to `PROGRESS.md` under `已完成` after the Signal Arena design entry:

```md
- [x] 2026-05-22：完成 `SIGNAL ARENA` 公开看板与云端 AI Trader Runner implementation plan；范围包括三页公开只读看板、Cloudflare Cron Worker、自定义 Responses provider、A 股风控、dry-run 与部署 secret 清单
```

- [ ] **Step 4: Commit docs**

```bash
git add workers/signal-arena-api/README.md docs/DEPLOYMENT.md PROGRESS.md
git commit -m "docs: document Signal Arena deployment"
```

---

## Task 11: Full Verification And Local Browser QA

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test:signal-arena
pnpm test:portal
pnpm test:signal-arena-worker
```

Expected: all pass.

- [ ] **Step 2: Run layered project checks**

Run:

```bash
pnpm typecheck
pnpm lint
NEXT_PUBLIC_AI_DAILY_PASSWORD_HASH=7ac51619fb49566145ff14b6aa15ec0ceebf422cfc6dc22bf4a55d7ff5ddc445 STEAM_DATA_SOURCE=static pnpm build
```

Expected: all pass.

- [ ] **Step 3: Run Worker typecheck**

Run:

```bash
pnpm typecheck:signal-arena-worker
```

Expected: pass.

- [ ] **Step 4: Start or reuse local dev server**

Run:

```bash
pnpm dev
```

If port 3000 is already in use by the existing Next dev server, reuse it.

- [ ] **Step 5: Browser-check public pages**

Open:

- `http://localhost:3000/`
- `http://localhost:3000/signal-arena`
- `http://localhost:3000/signal-arena/logs`
- `http://localhost:3000/signal-arena/rank`

Verify:

- Homepage shows `SIGNAL ARENA`.
- Homepage still shows `CLASSIFIED / 未完待续`.
- Signal Arena pages render fallback data without secrets.
- Tabs navigate between the three pages.
- Text does not overlap on mobile-width viewport.

- [ ] **Step 6: Final commit for any verification fixes**

If verification required fixes:

```bash
git add <changed-files>
git commit -m "fix: stabilize Signal Arena verification"
```

If no fixes were needed, do not create an empty commit.

---

## Execution Notes

- Never commit the user-provided AI provider key or Signal Arena agent key.
- The first deployed Runner test must use `dryRun=true`.
- Do not turn on real cron trading until D1 schema, KV namespace, Worker secrets, and dry-run log visibility are confirmed.
- If Cloudflare Worker runtime cannot finish `gpt-5.5` + `xhigh` calls reliably, keep the same modules but move `runSignalArenaTrader` execution to GitHub Actions or another server runner.
- Keep all UI public and read-only.
