import assert from "node:assert/strict";
import { test } from "node:test";

import { selectExecutableAction } from "./risk";
import type { AiDecision, RiskContext } from "./types";

const baseDecision: AiDecision = {
  market_view: "neutral",
  risk_level: "low",
  summary: "测试",
  before_state_summary: "现金充足。",
  decision_route: ["检查现金"],
  market_assessment: ["市场中性"],
  portfolio_assessment: ["仓位可控"],
  cash_plan: "保留现金",
  watchlist: [],
  rejected_actions: [],
  final_action: null,
  public_explanation: "测试说明",
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
  cash: 500000,
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

test("selectExecutableAction accepts a valid A-share buy candidate", () => {
  assert.equal(selectExecutableAction(baseDecision, baseContext).allowed, true);
});

test("selectExecutableAction rejects non-100-share orders", () => {
  assert.deepEqual(
    selectExecutableAction(
      { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], shares: 50 }] },
      baseContext
    ).reasons,
    ["A 股交易股数必须是 100 的整数倍。"]
  );
});

test("selectExecutableAction rejects non A-share symbols", () => {
  assert.deepEqual(
    selectExecutableAction(
      { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], symbol: "AAPL" }] },
      baseContext
    ).reasons,
    ["第一版只允许 A 股代码。"]
  );
});

test("selectExecutableAction rejects hold-only candidates", () => {
  assert.equal(
    selectExecutableAction(
      { ...baseDecision, candidates: [{ ...baseDecision.candidates[0], action: "hold" }] },
      baseContext
    ).allowed,
    false
  );
});
