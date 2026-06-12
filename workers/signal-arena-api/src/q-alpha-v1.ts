import { calculateIndicators, normalizeDailyBars, type StockIndicators } from "./indicators";
import type { ArenaHistoryBar, ArenaHolding, ArenaStock, ArenaTopMover, ArenaTrade, StrategyAction } from "./types";

export const Q_ALPHA_ACCOUNT_SCOPE = "quant-v1";
export const Q_ALPHA_STRATEGY_VERSION = "Q-Alpha v1";

export type QAlphaParameters = {
  buyThreshold: number;
  sellScoreThreshold: number;
  targetPositionRate: number;
  maxPositionRate: number;
  rebalancePositionRate: number;
  minCashRate: number;
  maxHoldings: number;
  stopLossRate: number;
  takeProfitRate: number;
  recentSellPenaltyDays: number;
  maxHistorySymbolsPerRun: number;
  maxDailyBuys: number;
};

export type QAlphaFactorScore = {
  trend: number;
  momentum: number;
  breakout: number;
  volume: number;
  portfolioFit: number;
  penalties: number;
  total: number;
};

export type QAlphaCandidateTrace = {
  symbol: string;
  name: string;
  source: string[];
  score: number;
  factorScore: QAlphaFactorScore;
  indicators: StockIndicators | null;
  holding: {
    shares: number;
    availableShares: number;
    profitRate: number;
    positionRate: number;
  } | null;
  rejectionReasons: string[];
  entryReasons: string[];
};

export type QAlphaStrategyTrace = {
  strategyName: string;
  strategyVersion: string;
  accountScope: string;
  runMode: "dry-run" | "live";
  parameters: QAlphaParameters;
  candidateCount: number;
  historyCoverage: {
    requestedSymbols: number;
    coveredSymbols: number;
    insufficientSymbols: string[];
  };
  factorScores: QAlphaCandidateTrace[];
  candidateRanking: QAlphaCandidateTrace[];
  rejectedReasons: string[];
  finalRule: string;
  finalAction: StrategyAction | null;
  marketRegime: "trend" | "mixed" | "weak" | "unknown";
};

export type QAlphaStrategyInput = {
  now: Date;
  dryRun: boolean;
  accountScope: string;
  strategyVersion: string;
  totalAssets: number;
  cash: number;
  holdings: ArenaHolding[];
  topMovers: ArenaTopMover[];
  recentTrades: ArenaTrade[];
  stockUniverse: ArenaStock[];
  histories: Record<string, ArenaHistoryBar[]>;
};

export type QAlphaStrategyResult = {
  marketView: "cautious" | "neutral" | "aggressive";
  riskLevel: "low" | "medium" | "high";
  summary: string;
  candidates: StrategyAction[];
  selectedAction: StrategyAction | null;
  strategyTrace: QAlphaStrategyTrace;
};

export const Q_ALPHA_DEFAULT_PARAMETERS: QAlphaParameters = {
  buyThreshold: 70,
  sellScoreThreshold: 45,
  targetPositionRate: 0.12,
  maxPositionRate: 0.2,
  rebalancePositionRate: 0.15,
  minCashRate: 0.2,
  maxHoldings: 6,
  stopLossRate: -0.08,
  takeProfitRate: 0.12,
  recentSellPenaltyDays: 7,
  maxHistorySymbolsPerRun: 24,
  maxDailyBuys: 1
};

const A_SHARE_PATTERN = /^(sh|sz)\d{6}$/;

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function isCnSymbol(symbol: string): boolean {
  return A_SHARE_PATTERN.test(symbol);
}

function shanghaiDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function daysBetween(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / (24 * 60 * 60 * 1000);
}

function tradeTime(trade: ArenaTrade): Date | null {
  const value = trade.created_at ?? trade.executed_at ?? trade.submitted_at;
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasRecentSell(symbol: string, trades: ArenaTrade[], now: Date, days: number): boolean {
  return trades.some((trade) => {
    const time = tradeTime(trade);
    return trade.symbol === symbol && trade.action === "sell" && time !== null && daysBetween(now, time) <= days;
  });
}

function boughtToday(trades: ArenaTrade[], now: Date): number {
  const today = shanghaiDate(now);
  return trades.filter((trade) => {
    const time = tradeTime(trade);
    return trade.action === "buy" && time !== null && shanghaiDate(time) === today;
  }).length;
}

function holdingPrice(holding: ArenaHolding): number {
  return numberValue(holding.current_price, holding.cost_price, holding.avg_cost) ?? 0;
}

function holdingName(holding: ArenaHolding): string {
  return holding.name || holding.symbol;
}

export function buildQAlphaCandidatePool(input: Omit<QAlphaStrategyInput, "histories">, maxCount: number): Array<{ symbol: string; name: string; source: string[] }> {
  const map = new Map<string, { symbol: string; name: string; source: string[] }>();

  const add = (symbol: string, name: string | undefined, source: string) => {
    if (!isCnSymbol(symbol)) {
      return;
    }

    const current = map.get(symbol);
    if (current) {
      if (!current.source.includes(source)) {
        current.source.push(source);
      }
      return;
    }

    map.set(symbol, { symbol, name: name ?? symbol, source: [source] });
  };

  for (const holding of input.holdings) {
    add(holding.symbol, holdingName(holding), "holding");
  }

  for (const mover of input.topMovers) {
    add(mover.symbol, mover.name, "top-movers");
  }

  const universe = input.stockUniverse.filter((stock) => isCnSymbol(stock.symbol));
  const seed = Number(shanghaiDate(input.now).replaceAll("-", "")) + input.now.getUTCHours() * 7 + input.now.getUTCMinutes();
  const start = universe.length > 0 ? seed % universe.length : 0;
  for (let index = 0; index < universe.length && map.size < maxCount; index += 1) {
    const stock = universe[(start + index * 17) % universe.length];
    add(stock.symbol, stock.name, "rotation");
  }

  return [...map.values()].slice(0, maxCount);
}

function scoreCandidate(args: {
  symbol: string;
  totalAssets: number;
  cash: number;
  holdingsCount: number;
  holding: ArenaHolding | undefined;
  indicators: StockIndicators | null;
  recentSell: boolean;
}): QAlphaFactorScore {
  const { indicators, holding, totalAssets, cash, holdingsCount, recentSell } = args;
  if (!indicators) {
    return { trend: 0, momentum: 0, breakout: 0, volume: 0, portfolioFit: 0, penalties: 0, total: 0 };
  }

  let trend = 0;
  if (indicators.ma20 !== null && indicators.ma60 !== null && indicators.ma20 > indicators.ma60) trend += 12;
  if (indicators.ma20 !== null && indicators.close > indicators.ma20) trend += 10;
  if (indicators.ma20Slope !== null && indicators.ma20Slope > 0) trend += 8;

  let momentum = 0;
  if (indicators.return5d !== null && indicators.return5d > 0 && indicators.return5d < 0.12) momentum += 8;
  if (indicators.return10d !== null && indicators.return10d > 0 && indicators.return10d < 0.18) momentum += 8;
  if (indicators.return20d !== null && indicators.return20d > 0 && indicators.return20d < 0.3) momentum += 9;

  let breakout = 0;
  if (indicators.high20Distance !== null) {
    if (indicators.high20Distance >= -0.01) breakout += 15;
    else if (indicators.high20Distance >= -0.04) breakout += 10;
    else if (indicators.high20Distance >= -0.08) breakout += 5;
  }

  let volume = 0;
  if (indicators.volumeRatio5To20 !== null) {
    if (indicators.volumeRatio5To20 >= 1.05 && indicators.volumeRatio5To20 <= 2.2) volume += 10;
    else if (indicators.volumeRatio5To20 >= 0.85 && indicators.volumeRatio5To20 < 1.05) volume += 5;
  }

  const marketValue = numberValue(holding?.market_value) ?? 0;
  const positionRate = totalAssets > 0 ? marketValue / totalAssets : 0;
  let portfolioFit = 0;
  if (cash / Math.max(totalAssets, 1) >= 0.25) portfolioFit += 4;
  if (!holding && holdingsCount < Q_ALPHA_DEFAULT_PARAMETERS.maxHoldings) portfolioFit += 4;
  if (holding && positionRate < Q_ALPHA_DEFAULT_PARAMETERS.maxPositionRate) portfolioFit += 3;
  if (portfolioFit > 10) portfolioFit = 10;

  let penalties = 0;
  if (indicators.volatility20 !== null && indicators.volatility20 > 0.045) penalties += 8;
  if (indicators.return5d !== null && indicators.return5d > 0.12) penalties += 8;
  if (indicators.return20d !== null && indicators.return20d > 0.35) penalties += 8;
  if (recentSell) penalties += 10;

  return {
    trend,
    momentum,
    breakout,
    volume,
    portfolioFit,
    penalties,
    total: Math.max(0, Math.min(100, trend + momentum + breakout + volume + portfolioFit - penalties))
  };
}

function holdingTrace(holding: ArenaHolding | undefined, totalAssets: number) {
  if (!holding) {
    return null;
  }

  const marketValue = numberValue(holding.market_value) ?? holdingPrice(holding) * holding.shares;
  return {
    shares: holding.shares,
    availableShares: holding.available_shares ?? holding.shares,
    profitRate: numberValue(holding.profit_rate) ?? 0,
    positionRate: totalAssets > 0 ? marketValue / totalAssets : 0
  };
}

function entryReasons(score: QAlphaFactorScore, indicators: StockIndicators | null): string[] {
  const reasons: string[] = [];
  if (!indicators) {
    return reasons;
  }

  if (score.trend >= 20) reasons.push("趋势结构向上");
  if (score.momentum >= 16) reasons.push("5/10/20 日动量共振");
  if (score.breakout >= 10) reasons.push("接近或突破 20 日高点");
  if (score.volume >= 5) reasons.push("量能确认未失真");
  if (score.portfolioFit >= 6) reasons.push("组合仓位允许新增或调整");
  return reasons;
}

function candidateRejections(args: {
  indicators: StockIndicators | null;
  score: QAlphaFactorScore;
  holding: ArenaHolding | undefined;
  recentSell: boolean;
  parameters: QAlphaParameters;
}): string[] {
  const { indicators, score, holding, recentSell, parameters } = args;
  const reasons: string[] = [];

  if (!indicators) {
    reasons.push("历史数据不足 60 根日线，无法计算 MA60。");
  } else {
    if (score.total < parameters.buyThreshold) reasons.push(`总分 ${score.total} 低于买入阈值 ${parameters.buyThreshold}。`);
    if (indicators.return5d !== null && indicators.return5d > 0.12) reasons.push("5 日涨幅过热，避免追高。");
    if (indicators.volatility20 !== null && indicators.volatility20 > 0.045) reasons.push("20 日波动率偏高。");
  }

  if (holding && (holding.available_shares ?? holding.shares) <= 0) {
    reasons.push("持仓暂无可卖数量，卖出规则受 T+1/可卖数量约束。");
  }

  if (recentSell) {
    reasons.push("最近 7 天刚卖出，降低重新买入优先级。");
  }

  return reasons;
}

function roundLot(shares: number): number {
  return Math.floor(shares / 100) * 100;
}

function buildAction(symbol: string, action: "buy" | "sell" | "hold", shares: number, priority: number, confidence: number, reason: string): StrategyAction {
  return { symbol, action, shares, priority, confidence, reason };
}

function marketRegime(candidates: QAlphaCandidateTrace[]): QAlphaStrategyTrace["marketRegime"] {
  const valid = candidates.filter((candidate) => candidate.indicators !== null);
  if (valid.length === 0) {
    return "unknown";
  }

  const strong = valid.filter((candidate) => candidate.score >= 70).length / valid.length;
  const weak = valid.filter((candidate) => candidate.score < 45).length / valid.length;
  if (strong >= 0.25) return "trend";
  if (weak >= 0.5) return "weak";
  return "mixed";
}

export function runQAlphaV1(input: QAlphaStrategyInput, parameters = Q_ALPHA_DEFAULT_PARAMETERS): QAlphaStrategyResult {
  const holdingBySymbol = new Map(input.holdings.map((holding) => [holding.symbol, holding]));
  const candidates = buildQAlphaCandidatePool(input, parameters.maxHistorySymbolsPerRun);
  const insufficientSymbols: string[] = [];
  const traces = candidates.map((candidate) => {
    const bars = normalizeDailyBars(input.histories[candidate.symbol] ?? []);
    const indicators = bars.length >= 60 ? calculateIndicators(bars) : null;
    if (!indicators) {
      insufficientSymbols.push(candidate.symbol);
    }

    const holding = holdingBySymbol.get(candidate.symbol);
    const recentSell = hasRecentSell(candidate.symbol, input.recentTrades, input.now, parameters.recentSellPenaltyDays);
    const factorScore = scoreCandidate({
      symbol: candidate.symbol,
      totalAssets: input.totalAssets,
      cash: input.cash,
      holdingsCount: input.holdings.length,
      holding,
      indicators,
      recentSell
    });

    return {
      symbol: candidate.symbol,
      name: candidate.name,
      source: candidate.source,
      score: factorScore.total,
      factorScore,
      indicators,
      holding: holdingTrace(holding, input.totalAssets),
      rejectionReasons: candidateRejections({ indicators, score: factorScore, holding, recentSell, parameters }),
      entryReasons: entryReasons(factorScore, indicators)
    };
  });

  const ranking = [...traces].sort((left, right) => right.score - left.score || left.symbol.localeCompare(right.symbol));
  const rejectedReasons: string[] = [];
  const actionable: StrategyAction[] = [];

  const sellCandidate = traces
    .filter((trace) => trace.holding && trace.indicators)
    .map((trace) => {
      const holding = holdingBySymbol.get(trace.symbol);
      const availableShares = holding?.available_shares ?? holding?.shares ?? 0;
      const positionRate = trace.holding?.positionRate ?? 0;
      const profitRate = trace.holding?.profitRate ?? 0;
      const priceBelowMa20 = trace.indicators?.ma20 !== null && trace.indicators ? trace.indicators.close < trace.indicators.ma20 : false;
      let action: StrategyAction | null = null;
      let priority = 99;

      if (availableShares <= 0) {
        rejectedReasons.push(`${trace.symbol} 卖出被跳过：暂无可卖数量，可能受 T+1 限制。`);
        return { action: null, priority };
      }

      if (profitRate <= parameters.stopLossRate) {
        action = buildAction(trace.symbol, "sell", roundLot(availableShares), 1, 0.9, `止损触发：持仓收益率 ${(profitRate * 100).toFixed(2)}% <= -8%。`);
        priority = 1;
      } else if (trace.score < parameters.sellScoreThreshold && priceBelowMa20) {
        action = buildAction(trace.symbol, "sell", roundLot(availableShares), 2, 0.82, `趋势破坏：策略分 ${trace.score} 且价格跌破 MA20。`);
        priority = 2;
      } else if (profitRate >= parameters.takeProfitRate && ((trace.indicators?.return10d ?? 0) < 0 || priceBelowMa20)) {
        const halfShares = roundLot(availableShares / 2);
        if (halfShares > 0) {
          action = buildAction(trace.symbol, "sell", halfShares, 3, 0.76, `止盈保护：浮盈 ${(profitRate * 100).toFixed(2)}%，动量转弱或跌破 MA20。`);
          priority = 3;
        }
      } else if (positionRate > parameters.maxPositionRate) {
        const price = trace.indicators?.close ?? holdingPrice(holding as ArenaHolding);
        const targetValue = input.totalAssets * parameters.rebalancePositionRate;
        const currentValue = input.totalAssets * positionRate;
        const shares = roundLot((currentValue - targetValue) / Math.max(price, 1));
        if (shares > 0) {
          action = buildAction(trace.symbol, "sell", Math.min(shares, roundLot(availableShares)), 4, 0.72, "仓位再平衡：单票仓位超过 20%，降至约 15%。");
          priority = 4;
        }
      }

      return { action, priority };
    })
    .filter((item): item is { action: StrategyAction; priority: number } => item.action !== null)
    .sort((left, right) => left.priority - right.priority)[0]?.action ?? null;

  if (sellCandidate) {
    actionable.push(sellCandidate);
  }

  const buysToday = boughtToday(input.recentTrades, input.now);
  const bestBuy = ranking.find((trace) => !trace.holding && trace.score >= parameters.buyThreshold && trace.indicators !== null);
  let selectedAction = sellCandidate;
  let finalRule = sellCandidate ? sellCandidate.reason : "没有持仓触发卖出规则。";

  if (!selectedAction && bestBuy) {
    if (buysToday >= parameters.maxDailyBuys) {
      rejectedReasons.push("今日已达到新增买入上限 1 个。");
    } else if (input.holdings.length >= parameters.maxHoldings) {
      rejectedReasons.push(`持仓数量已达到上限 ${parameters.maxHoldings} 只。`);
    } else {
      const price = bestBuy.indicators?.close ?? 0;
      const targetCost = Math.min(input.totalAssets * parameters.targetPositionRate, input.totalAssets * parameters.maxPositionRate);
      const maxCashCost = Math.max(0, input.cash - input.totalAssets * parameters.minCashRate);
      const shares = roundLot(Math.min(targetCost, maxCashCost) / Math.max(price, 1));

      if (shares >= 100) {
        selectedAction = buildAction(
          bestBuy.symbol,
          "buy",
          shares,
          1,
          Math.min(0.95, bestBuy.score / 100),
          `策略分 ${bestBuy.score} 达到买入阈值，${bestBuy.entryReasons.join("、") || "多因子评分占优"}。`
        );
        actionable.push(selectedAction);
        finalRule = selectedAction.reason;
      } else {
        rejectedReasons.push(`${bestBuy.symbol} 达到买入阈值，但扣除 20% 现金底线后不足 100 股。`);
      }
    }
  }

  if (!selectedAction && !bestBuy) {
    rejectedReasons.push("没有 70 分以上且历史数据充足的新增买入候选。");
    finalRule = "无卖出触发，也无 70 分以上买入候选，本轮观望。";
  }

  const regime = marketRegime(traces);
  const riskLevel = selectedAction?.action === "sell" ? "medium" : regime === "trend" ? "low" : regime === "weak" ? "high" : "medium";
  const marketView = regime === "trend" ? "aggressive" : regime === "weak" ? "cautious" : "neutral";
  const strategyTrace: QAlphaStrategyTrace = {
    strategyName: "Q-Alpha",
    strategyVersion: input.strategyVersion,
    accountScope: input.accountScope,
    runMode: input.dryRun ? "dry-run" : "live",
    parameters,
    candidateCount: traces.length,
    historyCoverage: {
      requestedSymbols: candidates.length,
      coveredSymbols: traces.length - insufficientSymbols.length,
      insufficientSymbols
    },
    factorScores: traces,
    candidateRanking: ranking,
    rejectedReasons,
    finalRule,
    finalAction: selectedAction,
    marketRegime: regime
  };

  return {
    marketView,
    riskLevel,
    summary: selectedAction
      ? `Q-Alpha v1 触发${selectedAction.action === "buy" ? "买入" : "卖出"}：${selectedAction.symbol} ${selectedAction.shares} 股。`
      : "Q-Alpha v1 本轮未触发可执行交易，策略观望。",
    candidates: actionable,
    selectedAction,
    strategyTrace
  };
}
