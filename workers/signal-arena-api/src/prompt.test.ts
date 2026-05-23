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
  recentTrades: [],
  topMovers: [],
  snapshots: [],
  constraints: ["Only A-share symbols are tradable", "Buy and sell shares must be multiples of 100"]
};

test("buildDecisionPrompt produces a Chinese system prompt and structured user payload", () => {
  const prompt = buildDecisionPrompt(context);

  assert.match(prompt.system, /模拟交易 Agent/);
  assert.match(prompt.user, /Only A-share symbols/);
  assert.match(prompt.user, /Buy and sell shares must be multiples of 100/);
});

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

test("extractDecisionJson parses the decision payload from surrounding text", () => {
  const decision = extractDecisionJson(
    '分析如下 {"market_view":"neutral","risk_level":"low","summary":"保持观察","candidates":[],"cash_plan":"保留现金","watchlist":[]}'
  );

  assert.equal(decision.market_view, "neutral");
  assert.deepEqual(decision.candidates, []);
  assert.deepEqual(decision.watchlist, []);
  assert.equal(decision.cash_plan, "保留现金");
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
