import assert from "node:assert/strict";
import { test } from "node:test";

import { selectExecutableAction } from "./risk";
import type { AiDecision, RiskContext } from "./types";

const baseAction = {
  symbol: "sh600519",
  action: "buy" as const,
  shares: 100,
  priority: 1,
  confidence: 0.8,
  reason: "测试买入"
};

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
  final_action: baseAction,
  public_explanation: "测试说明",
  candidates: [baseAction]
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
      {
        ...baseDecision,
        final_action: { ...baseAction, shares: 50 },
        candidates: [{ ...baseAction, shares: 50 }]
      },
      baseContext
    ).reasons,
    ["A 股交易股数必须是 100 的整数倍。"]
  );
});

test("selectExecutableAction rejects non A-share symbols", () => {
  assert.deepEqual(
    selectExecutableAction(
      {
        ...baseDecision,
        final_action: { ...baseAction, symbol: "AAPL" },
        candidates: [{ ...baseAction, symbol: "AAPL" }]
      },
      baseContext
    ).reasons,
    ["第一版只允许 A 股代码。"]
  );
});

test("selectExecutableAction rejects hold-only candidates", () => {
  assert.equal(
    selectExecutableAction(
      {
        ...baseDecision,
        final_action: { ...baseAction, action: "hold" },
        candidates: [{ ...baseAction, action: "hold" }]
      },
      baseContext
    ).allowed,
    false
  );
});

test("selectExecutableAction treats null final action as an observe decision", () => {
  const result = selectExecutableAction(
    {
      ...baseDecision,
      final_action: null,
      candidates: [{ ...baseDecision.candidates[0], action: "buy", shares: 100 }]
    },
    baseContext
  );

  assert.equal(result.allowed, false);
  assert.equal(result.selectedAction, null);
  assert.deepEqual(result.reasons, ["AI 最终选择观望，未提交交易动作。"]);
});

test("selectExecutableAction treats hold final action as a non-order decision", () => {
  const holdAction = {
    ...baseDecision.candidates[0],
    action: "hold" as const,
    shares: 0,
    reason: "继续持有观察"
  };
  const result = selectExecutableAction(
    {
      ...baseDecision,
      final_action: holdAction,
      candidates: [holdAction]
    },
    baseContext
  );

  assert.equal(result.allowed, false);
  assert.equal(result.selectedAction?.action, "hold");
  assert.deepEqual(result.reasons, ["AI 最终选择 HOLD，观望/持有，不需要下单。"]);
});

test("selectExecutableAction explains sell quantity and T+1 limits separately", () => {
  const sellAction = {
    ...baseDecision.candidates[0],
    action: "sell" as const,
    shares: 200
  };

  const noAvailableShares = selectExecutableAction(
    {
      ...baseDecision,
      final_action: sellAction,
      candidates: [sellAction]
    },
    {
      ...baseContext,
      holdings: {
        sh600519: {
          shares: 100,
          availableShares: 0,
          marketValue: 140000,
          positionRate: 0.14
        }
      }
    }
  );

  assert.deepEqual(noAvailableShares.reasons, ["当前持仓暂无可卖数量，可能触发 T+1 限制。"]);

  const overAvailableShares = selectExecutableAction(
    {
      ...baseDecision,
      final_action: sellAction,
      candidates: [sellAction]
    },
    {
      ...baseContext,
      holdings: {
        sh600519: {
          shares: 300,
          availableShares: 100,
          marketValue: 140000,
          positionRate: 0.14
        }
      }
    }
  );

  assert.deepEqual(overAvailableShares.reasons, ["卖出数量超过可卖数量，当前最多可卖 100 股。"]);
});
