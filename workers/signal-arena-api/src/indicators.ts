import type { ArenaHistoryBar } from "./types";

export type NormalizedDailyBar = {
  date: string | null;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type StockIndicators = {
  close: number;
  ma20: number | null;
  ma60: number | null;
  ma20Slope: number | null;
  return5d: number | null;
  return10d: number | null;
  return20d: number | null;
  high20: number | null;
  high20Distance: number | null;
  volumeRatio5To20: number | null;
  volatility20: number | null;
  drawdown20: number | null;
};

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number | null {
  const avg = average(values);
  if (avg === null || values.length < 2) {
    return null;
  }

  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function trailing(values: number[], count: number): number[] {
  return values.length >= count ? values.slice(values.length - count) : [];
}

function returnOver(closes: number[], days: number): number | null {
  if (closes.length <= days) {
    return null;
  }

  const current = closes[closes.length - 1];
  const previous = closes[closes.length - 1 - days];
  return previous > 0 ? current / previous - 1 : null;
}

export function normalizeDailyBars(bars: ArenaHistoryBar[]): NormalizedDailyBar[] {
  return bars
    .map((bar) => {
      const close = numberValue(bar.close ?? bar.price);
      if (close === null) {
        return null;
      }

      return {
        date: typeof bar.date === "string" ? bar.date : typeof bar.timestamp === "string" ? bar.timestamp : null,
        open: numberValue(bar.open) ?? close,
        high: numberValue(bar.high) ?? close,
        low: numberValue(bar.low) ?? close,
        close,
        volume: numberValue(bar.volume)
      };
    })
    .filter((bar): bar is NormalizedDailyBar => bar !== null);
}

export function calculateIndicators(input: ArenaHistoryBar[] | NormalizedDailyBar[]): StockIndicators | null {
  const bars = "close" in (input[0] ?? {}) && "high" in (input[0] ?? {})
    ? (input as NormalizedDailyBar[])
    : normalizeDailyBars(input as ArenaHistoryBar[]);

  if (bars.length === 0) {
    return null;
  }

  const closes = bars.map((bar) => bar.close);
  const highs = bars.map((bar) => bar.high);
  const volumes = bars.map((bar) => bar.volume).filter((value): value is number => value !== null);
  const latestClose = closes[closes.length - 1];
  const ma20 = average(trailing(closes, 20));
  const ma60 = average(trailing(closes, 60));
  const priorMa20Window = closes.length >= 25 ? closes.slice(closes.length - 25, closes.length - 5) : [];
  const priorMa20 = average(priorMa20Window);
  const high20Values = trailing(highs, 20);
  const high20 = high20Values.length > 0 ? Math.max(...high20Values) : null;
  const recentVolumes5 = trailing(volumes, 5);
  const recentVolumes20 = trailing(volumes, 20);
  const avgVolume5 = average(recentVolumes5);
  const avgVolume20 = average(recentVolumes20);
  const returns20 = trailing(closes, 21)
    .slice(1)
    .map((close, index) => {
      const previous = closes[closes.length - 21 + index];
      return previous > 0 ? close / previous - 1 : 0;
    });

  return {
    close: latestClose,
    ma20,
    ma60,
    ma20Slope: ma20 !== null && priorMa20 !== null && priorMa20 > 0 ? ma20 / priorMa20 - 1 : null,
    return5d: returnOver(closes, 5),
    return10d: returnOver(closes, 10),
    return20d: returnOver(closes, 20),
    high20,
    high20Distance: high20 !== null && high20 > 0 ? latestClose / high20 - 1 : null,
    volumeRatio5To20: avgVolume5 !== null && avgVolume20 !== null && avgVolume20 > 0 ? avgVolume5 / avgVolume20 : null,
    volatility20: standardDeviation(returns20),
    drawdown20: high20 !== null && high20 > 0 ? latestClose / high20 - 1 : null
  };
}

export function __indicatorTestUtils() {
  return {
    average,
    standardDeviation,
    returnOver
  };
}
