import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const typeFile = await readFile(new URL("../types/signal-arena.ts", import.meta.url), "utf8").catch(() => "");
const dataFile = await readFile(new URL("../lib/signal-arena-data.ts", import.meta.url), "utf8").catch(() => "");
const sanitizerFile = await readFile(new URL("../lib/signal-arena-sanitize.ts", import.meta.url), "utf8").catch(() => "");
const fallbackJson = await readFile(new URL("../public/data/signal-arena/fallback.json", import.meta.url), "utf8");
const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
const planFile = await readFile(new URL("../docs/superpowers/plans/2026-05-22-signal-arena.md", import.meta.url), "utf8");

async function importSanitizerForTest() {
  const compiled = ts.transpileModule(sanitizerFile, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = await mkdtemp(join(tmpdir(), "signal-arena-sanitize-"));
  const modulePath = join(tempDir, "signal-arena-sanitize.mjs");

  await writeFile(modulePath, compiled.outputText);
  return import(new URL(`file://${modulePath}`).href);
}

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

test("Signal Arena sanitizer removes private and unknown worker fields", async () => {
  const { toSignalArenaPublicData } = await importSanitizerForTest();
  const result = toSignalArenaPublicData({
    dashboard: {
      updatedAt: "2026-05-22T00:00:00.000Z",
      sourceStatus: "live",
      totalAssets: 100,
      initialCapital: 100,
      cash: 100,
      frozenCash: 0,
      returnRate: 0,
      currentRank: null,
      metrics: [{ label: "总资产", value: "100", tone: "neutral", hidden: "x" }],
      cnHoldings: [],
      marketSummaries: [],
      latestRun: {
        id: "run-1",
        startedAt: "2026-05-22T00:00:00.000Z",
        finishedAt: null,
        status: "executed",
        trigger: "manual",
        marketView: "neutral",
        riskLevel: "low",
        summary: "ok",
        candidates: [],
        selectedAction: null,
        riskResult: { allowed: true, reasons: [] },
        orderResult: { status: "filled", message: "done", orderId: "private-order" },
        privateField: "hidden"
      }
    },
    logs: [
      {
        id: "run-1",
        startedAt: "2026-05-22T00:00:00.000Z",
        finishedAt: null,
        status: "executed",
        trigger: "manual",
        marketView: "neutral",
        riskLevel: "low",
        summary: "ok",
        candidates: [],
        selectedAction: null,
        riskResult: { allowed: true, reasons: [] },
        orderResult: { status: "filled", message: "done", orderId: "private-order" },
        privateField: "hidden"
      }
    ],
    rank: {
      currentRank: 1,
      returnRate: 0,
      leaderGap: null,
      leaders: [],
      nearby: [],
      updatedAt: "2026-05-22T00:00:00.000Z"
    },
    workerOnly: "hidden"
  });

  assert.equal(result.logs[0].orderResult.status, "filled");
  assert.equal(result.logs[0].orderResult.message, "done");
  assert.deepEqual(Object.keys(result.logs[0].orderResult), ["status", "message"]);
  assert.deepEqual(Object.keys(result.dashboard.latestRun.orderResult), ["status", "message"]);
  assert.equal("privateField" in result.logs[0], false);
  assert.equal("workerOnly" in result, false);
  assert.equal("hidden" in result.dashboard.metrics[0], false);
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
