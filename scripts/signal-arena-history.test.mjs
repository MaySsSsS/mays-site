import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

const sourceFile = await readFile(new URL("../lib/signal-arena-history.ts", import.meta.url), "utf8").catch(() => "");
const syncScript = await readFile(new URL("./sync-signal-arena-history.mjs", import.meta.url), "utf8").catch(() => "");

async function importHistoryModule() {
  const compiled = ts.transpileModule(sourceFile, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const tempDir = await mkdtemp(join(tmpdir(), "signal-arena-history-"));
  const modulePath = join(tempDir, "signal-arena-history.mjs");

  await writeFile(modulePath, compiled.outputText);
  return import(new URL(`file://${modulePath}`).href);
}

test("Signal Arena history parser module exists with public builders", () => {
  assert.match(sourceFile, /export function parseWorkBuddyHistoryRun/);
  assert.match(sourceFile, /export function buildSignalArenaHistoryPayload/);
  assert.match(sourceFile, /sanitizeHistoricalText/);
  assert.doesNotMatch(sourceFile, /agent-world-[a-z0-9]+|gx-[a-z0-9]+/i);
});

test("WorkBuddy output is parsed into imported log and equity point", async () => {
  const { parseWorkBuddyHistoryRun } = await importHistoryModule();
  const parsed = parseWorkBuddyHistoryRun({
    created_at: 1776165465926,
    result_success: 1,
    runs_json: JSON.stringify([
      {
        success: true,
        output:
          "【股市】19:17\n排名: 1213/12414 | 总值: ¥101.58万 | 收益率: +1.58%\n市场状态: 已收盘\n今日操作: 市场已收盘，无操作\n持仓: 观望，无交易\n\n---\n脚本运行正常，已收盘，无操作机会。"
      }
    ])
  });

  assert.equal(parsed.log.source, "imported");
  assert.equal(parsed.log.sourceLabel, "历史导入");
  assert.equal(parsed.log.confidence, "high");
  assert.equal(parsed.log.status, "held");
  assert.equal(parsed.log.marketView, "已收盘");
  assert.equal(parsed.log.summary, "市场已收盘，无操作");
  assert.equal(parsed.log.beforeState.totalAssets, 1015800);
  assert.equal(parsed.log.beforeState.returnRate, 0.0158);
  assert.equal(parsed.equityPoint.source, "imported");
  assert.equal(parsed.equityPoint.totalAssets, 1015800);
  assert.equal(parsed.equityPoint.returnRate, 0.0158);
  assert.equal(parsed.equityPoint.currentRank, 1213);
});

test("history parser sanitizes raw agent noise and secrets", async () => {
  const { parseWorkBuddyHistoryRun } = await importHistoryModule();
  const parsed = parseWorkBuddyHistoryRun({
    created_at: 1776165465926,
    result_success: 1,
    runs_json: JSON.stringify([
      {
        success: true,
        output:
          "【股市】10:52\n排名: 2840/15697 | 总值: ¥103.67万 | 收益率: +3.67%\n市场状态: 上午盘交易中\n今日操作: 止盈卖出 三安光电(sh600703) x3700 (盈17.8%)\n持仓: /Users/local/.workbuddy/arena_trade.py agent-auth-api-key: secret SIGNAL_ARENA_AI_API_KEY=secret"
      }
    ])
  });

  assert.doesNotMatch(parsed.log.rawSummary, /\/Users\/local|agent-auth-api-key|SIGNAL_ARENA_AI_API_KEY|secret/);
  assert.doesNotMatch(parsed.log.decisionTrace.publicExplanation, /\/Users\/local|agent-auth-api-key|SIGNAL_ARENA_AI_API_KEY|secret/);
});

test("history parser does not expose agent process chatter as public summary", async () => {
  const { parseWorkBuddyHistoryRun } = await importHistoryModule();
  const parsed = parseWorkBuddyHistoryRun({
    created_at: 1779528450520,
    result_success: 1,
    runs_json: JSON.stringify([
      {
        output:
          "脚本已成功执行。The API call timed out. Let me try the portfolio endpoint.\nPortfolio details:\n- Cash: ¥618,404.04\n- Total value: ¥1,106,758.04\n- Return rate: +10.68%"
      }
    ])
  });

  assert.match(parsed.log.rawSummary, /总资产: ¥1,106,758/);
  assert.doesNotMatch(parsed.log.rawSummary, /The API call timed out|Let me try|Now I have/);
  assert.doesNotMatch(parsed.log.decisionTrace.publicExplanation, /The API call timed out|Let me try|Now I have/);
});

test("failed history records create failed logs without equity points", async () => {
  const { parseWorkBuddyHistoryRun } = await importHistoryModule();
  const parsed = parseWorkBuddyHistoryRun({
    created_at: 1776165465926,
    result_success: 0,
    runs_json: JSON.stringify([{ success: false, output: "交易执行出错: timeout" }])
  });

  assert.equal(parsed.log.status, "failed");
  assert.equal(parsed.equityPoint, null);
  assert.match(parsed.log.summary, /历史任务执行失败/);
});

test("history parser prefers explicit total value and return rate labels", async () => {
  const { parseWorkBuddyHistoryRun } = await importHistoryModule();
  const parsed = parseWorkBuddyHistoryRun({
    created_at: 1779528450520,
    result_success: 1,
    runs_json: JSON.stringify([
      {
        output:
          "脚本已成功执行。\nPortfolio details:\n- Cash: ¥618,404.04\n- Holdings value: ¥488,354\n- Total value: ¥1,106,758.04\n- Return rate: +10.68%\n- Rank: not from portfolio endpoint\nHoldings:\n1. sh600176 中国巨石 +23.3% 触发止盈"
      }
    ])
  });

  assert.equal(parsed.equityPoint.totalAssets, 1106758);
  assert.equal(parsed.equityPoint.returnRate, 0.1068);
});

test("history payload sorts logs newest first and equity points oldest first", async () => {
  const { buildSignalArenaHistoryPayload } = await importHistoryModule();
  const payload = buildSignalArenaHistoryPayload([
    {
      created_at: 2000,
      result_success: 1,
      runs_json: JSON.stringify([{ output: "排名: 2/10 | 总值: ¥101.00万 | 收益率: +1.00%\n市场状态: 已收盘\n今日操作: 观望" }])
    },
    {
      created_at: 1000,
      result_success: 1,
      runs_json: JSON.stringify([{ output: "排名: 3/10 | 总值: ¥100.00万 | 收益率: +0.00%\n市场状态: 盘前\n今日操作: 观望" }])
    }
  ]);

  assert.equal(payload.logs[0].startedAt, new Date(2000).toISOString());
  assert.equal(payload.equityHistory[0].capturedAt, new Date(1000).toISOString());
  assert.equal(payload.meta.importedRuns, 2);
  assert.equal(payload.meta.equityPoints, 2);
});

test("history sync script reads sqlite and writes sanitized JSON artifact", () => {
  assert.match(syncScript, /sqlite3/);
  assert.match(syncScript, /automation_runs/);
  assert.match(syncScript, /automation_id/);
  assert.match(syncScript, /public\/data\/signal-arena\/history\.json/);
  assert.doesNotMatch(syncScript, /wrangler deploy|pnpm deploy|CLOUDFLARE_API_TOKEN/);
});
