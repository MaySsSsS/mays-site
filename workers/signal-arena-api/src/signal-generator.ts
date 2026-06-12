import type { ArenaHolding, ArenaTopMover, ArenaTrade, TradingSignal } from "./types";

type SignalGeneratorInput = {
  now: string;
  totalAssets: number;
  cash: number;
  holdings: ArenaHolding[];
  topMovers: ArenaTopMover[];
  recentTrades: ArenaTrade[];
};

const MAX_SIGNALS = 12;

function isAshareSymbol(symbol: string): boolean {
  return /^(sh|sz)\d{6}$/i.test(symbol);
}

function isCnMover(mover: ArenaTopMover): boolean {
  return isAshareSymbol(mover.symbol) && (!mover.market || mover.market === "CN");
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function daysBetween(now: string, then: string | undefined): number | null {
  if (!then) {
    return null;
  }

  const nowTime = Date.parse(now);
  const thenTime = Date.parse(then);
  if (!Number.isFinite(nowTime) || !Number.isFinite(thenTime)) {
    return null;
  }

  return Math.abs(nowTime - thenTime) / (24 * 60 * 60 * 1000);
}

function recentSellSymbols(now: string, trades: ArenaTrade[]): Set<string> {
  return new Set(
    trades
      .filter((trade) => trade.action === "sell")
      .filter((trade) => {
        const age = daysBetween(now, trade.created_at ?? trade.submitted_at ?? trade.executed_at);
        return age !== null && age <= 7;
      })
      .map((trade) => trade.symbol)
  );
}

function clampConfidence(value: number): number {
  return Number(Math.min(Math.max(value, 0.1), 0.9).toFixed(2));
}

function dedupeAndSort(signals: TradingSignal[]): TradingSignal[] {
  const best = new Map<string, TradingSignal>();

  for (const signal of signals) {
    const key = `${signal.symbol}:${signal.signalType}`;
    const existing = best.get(key);
    if (!existing || signal.confidence > existing.confidence) {
      best.set(key, signal);
    }
  }

  return [...best.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SIGNALS);
}

export function generateTradingSignals(input: SignalGeneratorInput): TradingSignal[] {
  const signals: TradingSignal[] = [];
  const cashRatio = input.totalAssets > 0 ? input.cash / input.totalAssets : 0;
  const holdingSymbols = new Set(input.holdings.map((holding) => holding.symbol));
  const recentlySold = recentSellSymbols(input.now, input.recentTrades);

  for (const mover of input.topMovers.filter(isCnMover)) {
    const changeRate = numberOrNull(mover.change_rate ?? mover.changeRate) ?? 0;
    const price = numberOrNull(mover.price);
    const name = mover.name ?? mover.symbol;

    if (changeRate >= 0.075) {
      signals.push({
        symbol: mover.symbol,
        name,
        signalType: "momentum_watch",
        suggestedAction: "hold",
        confidence: clampConfidence(0.46 + Math.min(changeRate, 0.12)),
        risk: "high",
        changeRate,
        price,
        reason: `短线涨幅 ${(changeRate * 100).toFixed(2)}%，纳入强势观察，但当前更偏追高风险。`
      });
      continue;
    }

    if (recentlySold.has(mover.symbol)) {
      signals.push({
        symbol: mover.symbol,
        name,
        signalType: "momentum_watch",
        suggestedAction: "hold",
        confidence: 0.5,
        risk: "medium",
        changeRate,
        price,
        reason: `近期卖出过 ${mover.symbol}，避免刚卖出后立刻追回，只纳入观察。`
      });
      continue;
    }

    if (changeRate >= 0.018 && changeRate <= 0.05 && cashRatio >= 0.35 && !holdingSymbols.has(mover.symbol)) {
      signals.push({
        symbol: mover.symbol,
        name,
        signalType: "pullback_entry",
        suggestedAction: "buy",
        confidence: clampConfidence(0.58 + changeRate),
        risk: "medium",
        changeRate,
        price,
        reason: `A 股温和走强 ${(changeRate * 100).toFixed(2)}%，现金比例 ${(cashRatio * 100).toFixed(1)}%，可作为小仓位候选而非追高。`
      });
      continue;
    }

    if (changeRate > 0.05) {
      signals.push({
        symbol: mover.symbol,
        name,
        signalType: "momentum_watch",
        suggestedAction: "hold",
        confidence: clampConfidence(0.52 + changeRate / 2),
        risk: "medium",
        changeRate,
        price,
        reason: `涨幅 ${(changeRate * 100).toFixed(2)}%，强度已出现，但需要等待回撤或更多确认。`
      });
    }
  }

  for (const holding of input.holdings.filter((item) => item.market === "CN" && isAshareSymbol(item.symbol))) {
    const profitRate = numberOrNull(holding.profit_rate) ?? 0;
    const positionRate = input.totalAssets > 0 ? (numberOrNull(holding.market_value) ?? 0) / input.totalAssets : 0;
    const price = numberOrNull(holding.current_price);

    if (profitRate >= 0.1) {
      signals.push({
        symbol: holding.symbol,
        name: holding.name,
        signalType: "take_profit_watch",
        suggestedAction: profitRate >= 0.15 ? "sell" : "hold",
        confidence: clampConfidence(0.55 + profitRate),
        risk: "medium",
        changeRate: null,
        price,
        reason: `持仓浮盈 ${(profitRate * 100).toFixed(2)}%，需要评估继续持有或分批止盈。`
      });
    }

    if (profitRate <= -0.06) {
      signals.push({
        symbol: holding.symbol,
        name: holding.name,
        signalType: "stop_loss_watch",
        suggestedAction: profitRate <= -0.08 ? "sell" : "hold",
        confidence: clampConfidence(0.58 + Math.abs(profitRate)),
        risk: "high",
        changeRate: null,
        price,
        reason: `持仓浮亏 ${(profitRate * 100).toFixed(2)}%，需要评估是否止损或降低风险。`
      });
    }

    if (positionRate >= 0.15) {
      signals.push({
        symbol: holding.symbol,
        name: holding.name,
        signalType: "position_rebalance",
        suggestedAction: "sell",
        confidence: 0.66,
        risk: "high",
        changeRate: null,
        price,
        reason: `单票仓位 ${(positionRate * 100).toFixed(2)}%，接近集中度约束，需要评估减仓。`
      });
    }
  }

  if (cashRatio < 0.25) {
    signals.push({
      symbol: "CASH",
      name: "现金约束",
      signalType: "position_rebalance",
      suggestedAction: "hold",
      confidence: 0.7,
      risk: "high",
      changeRate: null,
      price: null,
      reason: `现金比例 ${(cashRatio * 100).toFixed(1)}%，低于防守阈值，本轮应限制新增买入。`
    });
  }

  return dedupeAndSort(signals);
}
