import { arenaList } from "./arena-normalize";
import { fetchArenaStockHistory, fetchArenaStocks, fetchArenaStocksList } from "./signal-api";
import type { ArenaHistoryBar, ArenaStock, Env } from "./types";

const CN_MARKET = "CN";

function shanghaiDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function isCnSymbol(symbol: string): boolean {
  return /^(sh|sz)\d{6}$/.test(symbol);
}

function normalizeStock(stock: ArenaStock): ArenaStock | null {
  if (!stock.symbol || !isCnSymbol(stock.symbol)) {
    return null;
  }

  return {
    symbol: stock.symbol,
    name: stock.name ?? stock.symbol,
    market: stock.market ?? CN_MARKET,
    price: firstNumber(stock.price, stock.current_price),
    current_price: firstNumber(stock.current_price, stock.price),
    change_rate: firstNumber(stock.change_rate, stock.changeRate),
    volume: firstNumber(stock.volume)
  };
}

function normalizeBar(bar: ArenaHistoryBar): ArenaHistoryBar | null {
  const close = firstNumber(bar.close, bar.price);
  if (close === undefined) {
    return null;
  }

  return {
    date: bar.date ?? bar.timestamp ?? bar.time,
    time: bar.time,
    timestamp: bar.timestamp,
    open: firstNumber(bar.open, close),
    high: firstNumber(bar.high, close),
    low: firstNumber(bar.low, close),
    close,
    price: close,
    volume: firstNumber(bar.volume),
    amount: firstNumber(bar.amount)
  };
}

function uniqueStocks(stocks: ArenaStock[]): ArenaStock[] {
  const bySymbol = new Map<string, ArenaStock>();

  for (const stock of stocks) {
    const normalized = normalizeStock(stock);
    if (normalized && !bySymbol.has(normalized.symbol)) {
      bySymbol.set(normalized.symbol, normalized);
    }
  }

  return [...bySymbol.values()].sort((left, right) => left.symbol.localeCompare(right.symbol));
}

export async function getCachedCnStocks(env: Env, now = new Date()): Promise<ArenaStock[]> {
  const key = `market:stocks-list:CN:${shanghaiDate(now)}`;
  const cached = await env.SIGNAL_ARENA_KV.get<ArenaStock[]>(key, "json");
  if (Array.isArray(cached) && cached.length > 0) {
    return uniqueStocks(cached);
  }

  let stocks = uniqueStocks(arenaList<ArenaStock>(await fetchArenaStocksList(env), ["stocks", "items", "records", "data"]));

  if (stocks.length === 0) {
    stocks = uniqueStocks(arenaList<ArenaStock>(await fetchArenaStocks(env, CN_MARKET, 300), ["stocks", "items", "records", "data"]));
  }

  await env.SIGNAL_ARENA_KV.put(key, JSON.stringify(stocks), { expirationTtl: 36 * 60 * 60 });
  return stocks;
}

export async function getCachedStockHistory(env: Env, symbol: string, now = new Date()): Promise<ArenaHistoryBar[]> {
  const key = `market:history:${symbol}:${shanghaiDate(now)}`;
  const cached = await env.SIGNAL_ARENA_KV.get<ArenaHistoryBar[]>(key, "json");
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.map(normalizeBar).filter((bar): bar is ArenaHistoryBar => bar !== null);
  }

  const payload = await fetchArenaStockHistory(env, symbol);
  const bars = arenaList<ArenaHistoryBar>(payload, ["history", "daily", "bars", "snapshots", "items", "records", "data"])
    .map(normalizeBar)
    .filter((bar): bar is ArenaHistoryBar => bar !== null);

  await env.SIGNAL_ARENA_KV.put(key, JSON.stringify(bars), { expirationTtl: 36 * 60 * 60 });
  return bars;
}

export function __marketDataTestUtils() {
  return {
    shanghaiDate,
    uniqueStocks
  };
}
