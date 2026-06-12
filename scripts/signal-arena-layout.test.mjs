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
const dashboardPage = await readFile(new URL("../app/signal-arena/page.tsx", import.meta.url), "utf8").catch(() => "");
const loadingPage = await readFile(new URL("../app/signal-arena/loading.tsx", import.meta.url), "utf8").catch(() => "");
const logsPage = await readFile(new URL("../app/signal-arena/logs/page.tsx", import.meta.url), "utf8").catch(() => "");
const rankPage = await readFile(new URL("../app/signal-arena/rank/page.tsx", import.meta.url), "utf8").catch(() => "");
const dashboardComponent = await readFile(new URL("../components/signal-arena/SignalArenaDashboard.tsx", import.meta.url), "utf8").catch(() => "");
const logsComponent = await readFile(new URL("../components/signal-arena/SignalArenaLogs.tsx", import.meta.url), "utf8").catch(() => "");
const shellComponent = await readFile(new URL("../components/signal-arena/SignalArenaShell.tsx", import.meta.url), "utf8").catch(() => "");
const equityChartComponent = await readFile(new URL("../components/signal-arena/SignalArenaEquityChart.tsx", import.meta.url), "utf8").catch(() => "");
const decisionModalComponent = await readFile(new URL("../components/signal-arena/SignalArenaDecisionModal.tsx", import.meta.url), "utf8").catch(() => "");
const operationsPanelComponent = await readFile(new URL("../components/signal-arena/SignalArenaOperationsPanel.tsx", import.meta.url), "utf8").catch(() => "");

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
  assert.match(typeFile, /export type SignalArenaEquityPoint/);
  assert.match(typeFile, /export type SignalArenaDecisionTrace/);
  assert.match(typeFile, /export type SignalArenaOperations/);
  assert.match(typeFile, /export type SignalArenaDataSource/);
  assert.match(typeFile, /source\?: SignalArenaDataSource/);
  assert.match(typeFile, /equityHistory: SignalArenaEquityPoint\[\]/);
  assert.match(typeFile, /operations: SignalArenaOperations/);
  assert.doesNotMatch(typeFile, /apiKey|agent-auth-api-key|SIGNAL_ARENA_AI_API_KEY|SIGNAL_ARENA_ADMIN_TOKEN|orderId/);
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
  assert.match(sanitizerFile, /sanitizeDecisionTrace/);
  assert.match(sanitizerFile, /sanitizeEquityPoint/);
  assert.match(sanitizerFile, /sanitizeSourceMeta/);
  assert.match(sanitizerFile, /sanitizeOperations/);
  assert.match(sanitizerFile, /equityHistory: arrayValue\(value\.equityHistory\)/);
  assert.match(sanitizerFile, /operations: sanitizeOperations/);
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
        beforeState: { totalAssets: 100, cash: 80, returnRate: 0, currentRank: 1, holdingsCount: 0, private: "hidden" },
        decisionTrace: {
          beforeStateSummary: "现金充足。",
          decisionRoute: ["检查现金"],
          marketAssessment: ["市场中性"],
          portfolioAssessment: ["无持仓"],
          rejectedActions: [{ symbol: "sh600519", action: "buy", shares: 100, reason: "仓位不足", hidden: "x" }],
          publicExplanation: "继续观察。",
          privateThought: "hidden"
        },
        cashPlan: "保留现金",
        watchlist: ["sh600519", 42],
        afterSnapshot: { totalAssets: 100, cash: 80, returnRate: 0, currentRank: 1, holdingsCount: 0 },
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
        beforeState: { totalAssets: 100, cash: 80, returnRate: 0, currentRank: 1, holdingsCount: 0, private: "hidden" },
        decisionTrace: {
          beforeStateSummary: "现金充足。",
          decisionRoute: ["检查现金"],
          marketAssessment: ["市场中性"],
          portfolioAssessment: ["无持仓"],
          rejectedActions: [{ symbol: "sh600519", action: "buy", shares: 100, reason: "仓位不足", hidden: "x" }],
          publicExplanation: "继续观察。",
          privateThought: "hidden"
        },
        cashPlan: "保留现金",
        watchlist: ["sh600519", 42],
        afterSnapshot: { totalAssets: 100, cash: 80, returnRate: 0, currentRank: 1, holdingsCount: 0 },
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
    equityHistory: [
      {
        id: "point-1",
        runId: "run-1",
        capturedAt: "2026-05-22T00:00:00.000Z",
        totalAssets: 100,
        returnRate: 0,
        currentRank: 1,
        status: "executed",
        actionSummary: "BUY sh600519",
        privateField: "hidden"
      }
    ],
    operations: {
      tone: "attention",
      label: "注意",
      dataAgeSeconds: 300,
      latestRunStatus: "failed",
      latestRunFinishedAt: "2026-05-22T00:01:00.000Z",
      latestRunSummary: "Runner 执行失败。",
      equityPointCount: 1,
      equityCoverageDays: 0,
      logCount: 1,
      adminToken: "hidden"
    },
    workerOnly: "hidden"
  });

  assert.equal(result.logs[0].orderResult.status, "filled");
  assert.equal(result.logs[0].orderResult.message, "done");
  assert.deepEqual(Object.keys(result.logs[0].orderResult), ["status", "message"]);
  assert.deepEqual(Object.keys(result.dashboard.latestRun.orderResult), ["status", "message"]);
  assert.equal(result.logs[0].decisionTrace.beforeStateSummary, "现金充足。");
  assert.deepEqual(result.logs[0].decisionTrace.rejectedActions[0], {
    symbol: "sh600519",
    action: "buy",
    shares: 100,
    reason: "仓位不足"
  });
  assert.deepEqual(result.logs[0].watchlist, ["sh600519"]);
  assert.equal(result.equityHistory[0].runId, "run-1");
  assert.equal(result.equityHistory[0].source, undefined);
  assert.equal(result.operations.tone, "attention");
  assert.equal(result.operations.latestRunStatus, "failed");
  assert.equal("adminToken" in result.operations, false);
  assert.equal("privateField" in result.equityHistory[0], false);
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
  assert.ok(Array.isArray(fallback.equityHistory));
  assert.equal(typeof fallback.operations.label, "string");
  assert.equal(typeof fallback.operations.equityPointCount, "number");
  assert.equal(fallback.equityHistory[0]?.status, "snapshot");
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

test("Signal Arena routes are dynamic and use the server data client", () => {
  for (const file of [dashboardPage, logsPage, rankPage]) {
    assert.match(file, /dynamic = "force-dynamic"/);
    assert.match(file, /getSignalArenaPublicData/);
  }

  assert.match(dashboardPage, /<SignalArenaShell active="dashboard"/);
  assert.match(dashboardPage, /<SignalArenaDashboard\s+dashboard=/);
  assert.match(logsPage, /<SignalArenaShell active="logs"/);
  assert.match(logsPage, /<SignalArenaLogs logs=/);
  assert.match(rankPage, /<SignalArenaShell active="rank"/);
  assert.match(rankPage, /<SignalArenaRank rank=/);
});

test("Signal Arena dashboard and shell expose empty and active states", () => {
  assert.match(sanitizerFile, /metrics: arrayValue\(value\.metrics\)\.map\(sanitizeMetric\)/);
  assert.match(sanitizerFile, /marketSummaries: arrayValue\(value\.marketSummaries\)\.map\(sanitizeMarketSummary\)/);
  assert.match(dashboardComponent, /关键指标暂未同步/);
  assert.match(dashboardComponent, /市场分布暂未同步/);
  assert.match(shellComponent, /aria-current=\{item\.id === active \? "page" : undefined\}/);
});

test("Signal Arena shell provides a clear route back to the portal home", () => {
  assert.match(shellComponent, /href="\/"/);
  assert.match(shellComponent, /返回首页/);
  assert.match(shellComponent, /styles\.homeLink/);
});

test("Signal Arena route has an instant loading state for slow server data", () => {
  assert.match(loadingPage, /SignalArenaShell/);
  assert.match(loadingPage, /active="dashboard"/);
  assert.match(loadingPage, /正在同步/);
  assert.match(loadingPage, /styles\.loadingGrid/);
  assert.match(loadingPage, /styles\.loadingBlock/);
});

test("Signal Arena dashboard includes equity curve and decision modal contracts", () => {
  assert.match(dashboardComponent, /SignalArenaEquityChart/);
  assert.match(dashboardComponent, /SignalArenaDecisionModal/);
  assert.match(dashboardComponent, /defaultRange="30P"/);
  assert.match(equityChartComponent, /"30P"/);
  assert.match(equityChartComponent, /"90P"/);
  assert.match(equityChartComponent, /"ALL"/);
  assert.match(equityChartComponent, /近 30 点/);
  assert.match(equityChartComponent, /近 90 点/);
  assert.match(equityChartComponent, /点位数量/);
  assert.match(equityChartComponent, /pointLimit/);
  assert.match(equityChartComponent, /echarts/);
  assert.match(equityChartComponent, /lineStyle/);
  assert.match(equityChartComponent, /type: "category"/);
  assert.match(equityChartComponent, /xAxisLabels/);
  assert.doesNotMatch(equityChartComponent, /type: "time"/);
  assert.match(equityChartComponent, /chartFallbackList/);
  assert.match(decisionModalComponent, /决策路线/);
  assert.match(decisionModalComponent, /操作前账户状态/);
  assert.match(decisionModalComponent, /执行结果/);
  assert.match(decisionModalComponent, /候选判断/);
  assert.match(decisionModalComponent, /AI 本轮选择观望/);
  assert.match(decisionModalComponent, /前置信号/);
  assert.match(typeFile, /signalContext: SignalArenaTradingSignal\[\]/);
});

test("Signal Arena operations UI and log filters are wired", () => {
  assert.match(dashboardComponent, /SignalArenaOperationsPanel/);
  assert.match(dashboardPage, /operations=\{data\.operations\}/);
  assert.match(operationsPanelComponent, /运行状态/);
  assert.match(operationsPanelComponent, /快照覆盖/);
  assert.match(logsComponent, /执行\/持有/);
  assert.match(logsComponent, /setActiveFilter/);
  assert.match(logsComponent, /本轮没有生成可执行决策。/);
  assert.match(logsComponent, /log\.riskResult\.reasons\.join/);
  assert.doesNotMatch(logsComponent, /错误来自 AI provider 或上游执行流程/);
  assert.match(logsComponent, /本轮没有候选买卖动作，AI 已给出观望判断。/);
  const riskReasonExpression = 'log.riskResult.reasons.join(" / ") || "无风控拦截。"';
  assert.equal(logsComponent.split(riskReasonExpression).length - 1, 1);
});

test("Signal Arena local history backfill is merged and labeled", () => {
  assert.match(dataFile, /historyData/);
  assert.match(dataFile, /withLocalHistory/);
  assert.match(dataFile, /mergeEquityHistory/);
  assert.match(dataFile, /mergeLogs/);
  assert.match(equityChartComponent, /sourceLabel/);
  assert.match(equityChartComponent, /confidence/);
  assert.match(logsComponent, /SOURCE_FILTERS/);
  assert.match(logsComponent, /来源筛选/);
  assert.match(logsComponent, /sourceBadge/);
  assert.match(decisionModalComponent, /HISTORICAL REPORT/);
  assert.match(decisionModalComponent, /历史报告摘要/);
});
