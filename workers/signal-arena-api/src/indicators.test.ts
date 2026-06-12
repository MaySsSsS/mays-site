import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateIndicators } from "./indicators";
import type { ArenaHistoryBar } from "./types";

function bars(count: number, start = 10): ArenaHistoryBar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = start + index;
    return {
      date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + index * 10
    };
  });
}

test("calculateIndicators computes MA, returns, breakout, volume ratio and drawdown", () => {
  const indicators = calculateIndicators(bars(80));

  assert.ok(indicators);
  assert.equal(indicators.close, 89);
  assert.equal(indicators.ma20, 79.5);
  assert.equal(indicators.ma60, 59.5);
  assert.ok((indicators.ma20Slope ?? 0) > 0);
  assert.ok((indicators.return5d ?? 0) > 0);
  assert.ok((indicators.return10d ?? 0) > 0);
  assert.ok((indicators.return20d ?? 0) > 0);
  assert.equal(indicators.high20, 90);
  assert.equal(Number((indicators.high20Distance ?? 0).toFixed(4)), -0.0111);
  assert.ok((indicators.volumeRatio5To20 ?? 0) > 1);
  assert.ok((indicators.volatility20 ?? 0) >= 0);
  assert.equal(Number((indicators.drawdown20 ?? 0).toFixed(4)), -0.0111);
});

test("calculateIndicators returns null for empty history", () => {
  assert.equal(calculateIndicators([]), null);
});
