import assert from "node:assert/strict";
import { test } from "node:test";

import { Q_ALPHA_ACCOUNT_SCOPE, Q_ALPHA_STRATEGY_VERSION, runQAlphaV1 } from "./q-alpha-v1";
import type { ArenaHistoryBar, ArenaHolding } from "./types";

function trendBars(count = 80, start = 20, step = 0.35): ArenaHistoryBar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = start + index * step;
    return {
      date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close - 0.2,
      high: close + 0.3,
      low: close - 0.3,
      close,
      volume: 100000 + index * 1200
    };
  });
}

function fallingBars(count = 80): ArenaHistoryBar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 80 - index * 0.5;
    return {
      date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close + 0.2,
      high: close + 0.3,
      low: close - 0.4,
      close,
      volume: 100000
    };
  });
}

const baseInput = {
  now: new Date("2026-06-12T02:00:00.000Z"),
  dryRun: true,
  accountScope: Q_ALPHA_ACCOUNT_SCOPE,
  strategyVersion: Q_ALPHA_STRATEGY_VERSION,
  totalAssets: 1000000,
  cash: 600000,
  holdings: [] as ArenaHolding[],
  topMovers: [{ symbol: "sh600519", name: "贵州茅台", market: "CN", change_rate: 0.03, price: 48 }],
  recentTrades: [],
  stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
  histories: { sh600519: trendBars() }
};

test("runQAlphaV1 deterministically buys a 70+ score candidate", () => {
  const first = runQAlphaV1(baseInput);
  const second = runQAlphaV1(baseInput);

  assert.deepEqual(first, second);
  assert.equal(first.selectedAction?.action, "buy");
  assert.equal(first.selectedAction?.symbol, "sh600519");
  assert.equal(first.selectedAction?.shares, 2500);
  assert.ok(first.strategyTrace.candidateRanking[0]?.score >= 70);
  assert.equal(first.strategyTrace.accountScope, "quant-v1");
});

test("runQAlphaV1 observes when history has fewer than 60 daily bars", () => {
  const result = runQAlphaV1({
    ...baseInput,
    histories: { sh600519: trendBars(30) }
  });

  assert.equal(result.selectedAction, null);
  assert.equal(result.strategyTrace.historyCoverage.coveredSymbols, 0);
  assert.deepEqual(result.strategyTrace.historyCoverage.insufficientSymbols, ["sh600519"]);
  assert.match(result.strategyTrace.rejectedReasons.join(" "), /没有 70 分以上/);
});

test("runQAlphaV1 sells stop-loss holdings before considering buys", () => {
  const result = runQAlphaV1({
    ...baseInput,
    cash: 300000,
    holdings: [
      {
        symbol: "sh600703",
        name: "三安光电",
        market: "CN",
        shares: 1000,
        available_shares: 1000,
        current_price: 20,
        market_value: 20000,
        profit_rate: -0.09
      }
    ],
    topMovers: [{ symbol: "sh600519", name: "贵州茅台", market: "CN", change_rate: 0.03, price: 48 }],
    stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
    histories: {
      sh600703: fallingBars(),
      sh600519: trendBars()
    }
  });

  assert.equal(result.selectedAction?.action, "sell");
  assert.equal(result.selectedAction?.symbol, "sh600703");
  assert.match(result.selectedAction?.reason ?? "", /止损触发/);
});

test("runQAlphaV1 records T+1 unavailable shares instead of selling", () => {
  const result = runQAlphaV1({
    ...baseInput,
    holdings: [
      {
        symbol: "sh600703",
        name: "三安光电",
        market: "CN",
        shares: 1000,
        available_shares: 0,
        current_price: 20,
        market_value: 20000,
        profit_rate: -0.09
      }
    ],
    histories: {
      sh600703: fallingBars(),
      sh600519: trendBars()
    }
  });

  assert.notEqual(result.selectedAction?.symbol, "sh600703");
  assert.match(result.strategyTrace.rejectedReasons.join(" "), /暂无可卖数量/);
});
