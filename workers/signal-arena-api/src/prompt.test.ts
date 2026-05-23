import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDecisionPrompt, extractDecisionJson } from "./prompt";

const context = {
  now: "2026-05-22T10:00:00+08:00",
  account: { totalAssets: 1000000, cash: 300000, returnRate: 0.02, rank: 12 },
  holdings: [
    {
      symbol: "sh600519",
      name: "贵州茅台",
      shares: 100,
      availableShares: 100,
      positionRate: 0.12,
      profitRate: 0.03
    }
  ],
  signals: [{ symbol: "sz000858", name: "五粮液", changeRate: 0.04 }],
  constraints: ["Only A-share symbols are tradable", "Buy and sell shares must be multiples of 100"]
};

test("buildDecisionPrompt produces a Chinese system prompt and structured user payload", () => {
  const prompt = buildDecisionPrompt(context);

  assert.match(prompt.system, /模拟交易 Agent/);
  assert.match(prompt.user, /Only A-share symbols/);
  assert.match(prompt.user, /Buy and sell shares must be multiples of 100/);
});

test("extractDecisionJson parses the decision payload from surrounding text", () => {
  const decision = extractDecisionJson(
    '分析如下 {"market_view":"neutral","risk_level":"low","summary":"保持观察","candidates":[],"cash_plan":"保留现金","watchlist":[]}'
  );

  assert.equal(decision.market_view, "neutral");
  assert.deepEqual(decision.candidates, []);
  assert.deepEqual(decision.watchlist, []);
  assert.equal(decision.cash_plan, "保留现金");
});
