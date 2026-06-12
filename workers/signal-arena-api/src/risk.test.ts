import assert from "node:assert/strict";
import { test } from "node:test";

import { selectExecutableAction } from "./risk";
import type { RiskContext, StrategyAction } from "./types";

const baseAction: StrategyAction = {
  symbol: "sh600519",
  action: "buy",
  shares: 100,
  priority: 1,
  confidence: 0.8,
  reason: "测试买入"
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
  assert.equal(selectExecutableAction(baseAction, baseContext).allowed, true);
});

test("selectExecutableAction rejects non-100-share orders", () => {
  assert.deepEqual(selectExecutableAction({ ...baseAction, shares: 50 }, baseContext).reasons, [
    "A 股交易股数必须是 100 的整数倍。"
  ]);
});

test("selectExecutableAction rejects non A-share symbols", () => {
  assert.deepEqual(selectExecutableAction({ ...baseAction, symbol: "AAPL" }, baseContext).reasons, [
    "第一版只允许 A 股代码。",
    "缺少有效成交价格，无法校验现金和仓位。"
  ]);
});

test("selectExecutableAction rejects orders without a usable price", () => {
  assert.deepEqual(
    selectExecutableAction(baseAction, {
      ...baseContext,
      prices: {}
    }).reasons,
    ["缺少有效成交价格，无法校验现金和仓位。"]
  );
});

test("selectExecutableAction rejects hold-only candidates", () => {
  assert.equal(selectExecutableAction({ ...baseAction, action: "hold", shares: 0 }, baseContext).allowed, false);
});

test("selectExecutableAction treats null final action as an observe decision", () => {
  const result = selectExecutableAction(null, baseContext);

  assert.equal(result.allowed, false);
  assert.equal(result.selectedAction, null);
  assert.deepEqual(result.reasons, ["策略最终选择观望，未提交交易动作。"]);
});

test("selectExecutableAction treats hold final action as a non-order decision", () => {
  const holdAction = {
    ...baseAction,
    action: "hold" as const,
    shares: 0,
    reason: "继续持有观察"
  };
  const result = selectExecutableAction(holdAction, baseContext);

  assert.equal(result.allowed, false);
  assert.equal(result.selectedAction?.action, "hold");
  assert.deepEqual(result.reasons, ["策略最终选择 HOLD，观望/持有，不需要下单。"]);
});

test("selectExecutableAction explains sell quantity and T+1 limits separately", () => {
  const sellAction = {
    ...baseAction,
    action: "sell" as const,
    shares: 200
  };

  const noAvailableShares = selectExecutableAction(sellAction, {
    ...baseContext,
    holdings: {
      sh600519: {
        shares: 100,
        availableShares: 0,
        marketValue: 140000,
        positionRate: 0.14
      }
    }
  });

  assert.deepEqual(noAvailableShares.reasons, ["当前持仓暂无可卖数量，可能触发 T+1 限制。"]);

  const overAvailableShares = selectExecutableAction(sellAction, {
    ...baseContext,
    holdings: {
      sh600519: {
        shares: 300,
        availableShares: 100,
        marketValue: 140000,
        positionRate: 0.14
      }
    }
  });

  assert.deepEqual(overAvailableShares.reasons, ["卖出数量超过可卖数量，当前最多可卖 100 股。"]);
});
