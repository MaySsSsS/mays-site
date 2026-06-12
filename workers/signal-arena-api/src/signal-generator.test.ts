import assert from "node:assert/strict";
import { test } from "node:test";

import { generateTradingSignals } from "./signal-generator";

test("generateTradingSignals turns raw movers and holdings into actionable signals", () => {
  const signals = generateTradingSignals({
    now: "2026-05-27T02:15:00.000Z",
    totalAssets: 1000000,
    cash: 720000,
    holdings: [
      {
        symbol: "sh600703",
        name: "三安光电",
        market: "CN",
        shares: 3000,
        available_shares: 3000,
        current_price: 16,
        market_value: 48000,
        profit_rate: 0.132
      },
      {
        symbol: "sz300529",
        name: "健帆生物",
        market: "CN",
        shares: 1300,
        available_shares: 1300,
        current_price: 18,
        market_value: 23400,
        profit_rate: -0.086
      }
    ],
    topMovers: [
      { symbol: "sz000858", name: "五粮液", change_rate: 0.036, price: 128, market: "CN" },
      { symbol: "sh600183", name: "生益科技", change_rate: 0.099, price: 28, market: "CN" },
      { symbol: "hk00700", name: "腾讯控股", change_rate: 0.05, price: 400, market: "HK" }
    ],
    recentTrades: []
  });

  assert.ok(signals.some((signal) => signal.symbol === "sz000858" && signal.signalType === "pullback_entry"));
  assert.ok(signals.some((signal) => signal.symbol === "sh600183" && signal.signalType === "momentum_watch"));
  assert.ok(signals.some((signal) => signal.symbol === "sh600703" && signal.signalType === "take_profit_watch"));
  assert.ok(signals.some((signal) => signal.symbol === "sz300529" && signal.signalType === "stop_loss_watch"));
  assert.equal(signals.some((signal) => signal.symbol === "hk00700"), false);
});

test("generateTradingSignals suppresses immediate rebuy after recent sells", () => {
  const signals = generateTradingSignals({
    now: "2026-05-27T02:15:00.000Z",
    totalAssets: 1000000,
    cash: 720000,
    holdings: [],
    topMovers: [{ symbol: "sz002916", name: "深南电路", change_rate: 0.032, price: 90, market: "CN" }],
    recentTrades: [
      {
        symbol: "sz002916",
        action: "sell",
        shares: 100,
        status: "executed",
        created_at: "2026-05-23T02:00:00.000Z"
      }
    ]
  });

  assert.equal(signals.some((signal) => signal.symbol === "sz002916" && signal.signalType === "pullback_entry"), false);
  assert.ok(signals.some((signal) => signal.symbol === "sz002916" && signal.signalType === "momentum_watch"));
  assert.ok(signals.some((signal) => signal.symbol === "sz002916" && signal.reason.includes("近期卖出")));
});
