import {
  fetchArenaHome,
  fetchArenaLeaderboard,
  fetchArenaPortfolio,
  fetchArenaTrades
} from "./signal-api";
import { getCachedPublicData, listRecentRuns, putCachedPublicData } from "./storage";
import type {
  ArenaHomeData,
  ArenaLeaderboardData,
  ArenaPortfolioData,
  ArenaTradesData,
  Env
} from "./types";

const CACHE_TTL_SECONDS = 120;

type PublicMetric = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "negative" | "warning";
};

type PublicHolding = {
  symbol: string;
  name: string;
  market: "CN" | "HK" | "US";
  shares: number;
  availableShares: number;
  costPrice: number;
  currentPrice: number;
  marketValue: number;
  profit: number;
  profitRate: number;
  positionRate: number;
};

type PublicMarketSummary = {
  market: "CN" | "HK" | "US";
  label: string;
  totalValue: number;
  profit: number;
  profitRate: number;
  holdingsCount: number;
};

type PublicTrade = {
  symbol: string;
  action: "buy" | "sell";
  shares: number;
  status: string;
  reason: string | null;
  createdAt: string | null;
};

type PublicRunLog = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "executed" | "held" | "blocked" | "skipped" | "failed";
  trigger: "cron" | "manual";
  marketView: string;
  riskLevel: "low" | "medium" | "high" | "unknown";
  summary: string;
  candidates: Array<{
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    priority: number;
    confidence: number;
    reason: string;
  }>;
  selectedAction: {
    symbol: string;
    action: "buy" | "sell" | "hold";
    shares: number;
    priority: number;
    confidence: number;
    reason: string;
  } | null;
  riskResult: {
    allowed: boolean;
    reasons: string[];
  };
  orderResult: {
    status: string | null;
    message: string | null;
  };
};

type PublicRankEntry = {
  rank: number;
  nickname: string;
  totalAssets: number;
  returnRate: number;
  isCurrentAgent: boolean;
};

type PublicRank = {
  currentRank: number | null;
  returnRate: number;
  leaderGap: number | null;
  leaders: PublicRankEntry[];
  nearby: PublicRankEntry[];
  updatedAt: string;
};

type PublicDashboard = {
  updatedAt: string;
  sourceStatus: "live" | "stale" | "fallback" | "error";
  totalAssets: number;
  initialCapital: number;
  cash: number;
  frozenCash: number;
  returnRate: number;
  currentRank: number | null;
  metrics: PublicMetric[];
  cnHoldings: PublicHolding[];
  marketSummaries: PublicMarketSummary[];
  latestRun: PublicRunLog | null;
};

type PublicSnapshot = {
  dashboard: PublicDashboard;
  logs: PublicRunLog[];
  rank: PublicRank;
  recentTrades: PublicTrade[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function money(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function maybeNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function noteReason(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  return nullableString(value.reason ?? value.message ?? value.summary);
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function enumValue<T extends string>(value: unknown, options: Set<T>, fallback: T): T {
  return typeof value === "string" && options.has(value as T) ? (value as T) : fallback;
}

const MARKET_VALUES = new Set<PublicHolding["market"]>(["CN", "HK", "US"]);
const RUN_STATUSES = new Set<PublicRunLog["status"]>(["executed", "held", "blocked", "skipped", "failed"]);
const CANDIDATE_ACTIONS = new Set<"buy" | "sell" | "hold">(["buy", "sell", "hold"]);
const TRADE_ACTIONS = new Set<PublicTrade["action"]>(["buy", "sell"]);
const SOURCE_STATUSES = new Set<PublicDashboard["sourceStatus"]>(["live", "stale", "fallback", "error"]);
const RISK_LEVELS = new Set<PublicRunLog["riskLevel"]>(["low", "medium", "high", "unknown"]);

function isFreshSnapshot(snapshot: PublicSnapshot): boolean {
  const updatedAt = Date.parse(snapshot.dashboard.updatedAt);
  if (Number.isNaN(updatedAt)) {
    return false;
  }

  return Date.now() - updatedAt < CACHE_TTL_SECONDS * 1000;
}

function withSourceStatus(
  snapshot: PublicSnapshot,
  sourceStatus: PublicDashboard["sourceStatus"]
): PublicSnapshot {
  return {
    ...snapshot,
    dashboard: {
      ...snapshot.dashboard,
      sourceStatus
    }
  };
}

function sanitizePublicCandidateAction(value: unknown): {
  symbol: string;
  action: "buy" | "sell" | "hold";
  shares: number;
  priority: number;
  confidence: number;
  reason: string;
} {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, CANDIDATE_ACTIONS, "buy"),
    shares: numberValue(record.shares),
    priority: numberValue(record.priority),
    confidence: numberValue(record.confidence),
    reason: stringValue(record.reason)
  };
}

function sanitizePublicRunLog(value: unknown): PublicRunLog {
  const record = isRecord(value) ? value : {};
  const riskResult = isRecord(record.riskResult) ? record.riskResult : {};
  const orderResult = isRecord(record.orderResult) ? record.orderResult : {};

  return {
    id: stringValue(record.id),
    startedAt: stringValue(record.startedAt),
    finishedAt: nullableString(record.finishedAt),
    status: enumValue(record.status, RUN_STATUSES, "skipped"),
    trigger: enumValue(record.trigger, new Set(["cron", "manual"]), "manual"),
    marketView: stringValue(record.marketView),
    riskLevel: enumValue(record.riskLevel, RISK_LEVELS, "unknown"),
    summary: stringValue(record.summary),
    candidates: arrayValue(record.candidates).map(sanitizePublicCandidateAction),
    selectedAction: isRecord(record.selectedAction) ? sanitizePublicCandidateAction(record.selectedAction) : null,
    riskResult: {
      allowed: typeof riskResult.allowed === "boolean" ? riskResult.allowed : false,
      reasons: arrayValue(riskResult.reasons).map((reason) => stringValue(reason))
    },
    orderResult: {
      status: nullableString(orderResult.status),
      message: nullableString(orderResult.message)
    }
  };
}

function pickPublicOrderResult(value: unknown): { status: string | null; message: string | null } {
  if (!isRecord(value)) {
    return { status: null, message: null };
  }

  return {
    status: typeof value.status === "string" ? value.status : null,
    message: typeof value.message === "string" ? value.message : null
  };
}

function sanitizePublicTrade(value: unknown): PublicTrade {
  const record = isRecord(value) ? value : {};

  return {
    symbol: stringValue(record.symbol),
    action: enumValue(record.action, TRADE_ACTIONS, "buy"),
    shares: numberValue(record.shares),
    status: stringValue(record.status, "unknown"),
    reason: nullableString(record.reason),
    createdAt: nullableString(record.createdAt ?? record.created_at)
  };
}

function sanitizePublicRankEntry(value: unknown, currentRank: number | null): PublicRankEntry {
  const record = isRecord(value) ? value : {};

  return {
    rank: numberValue(record.rank),
    nickname: stringValue(record.nickname),
    totalAssets: numberValue(record.totalAssets),
    returnRate: numberValue(record.returnRate),
    isCurrentAgent:
      typeof record.isCurrentAgent === "boolean" ? record.isCurrentAgent : numberValue(record.rank) === currentRank
  };
}

function sanitizePublicRank(value: unknown): PublicRank {
  const record = isRecord(value) ? value : {};
  const currentRank = nullableNumber(record.currentRank);

  return {
    currentRank,
    returnRate: numberValue(record.returnRate),
    leaderGap: nullableNumber(record.leaderGap),
    leaders: arrayValue(record.leaders).map((entry) => sanitizePublicRankEntry(entry, currentRank)),
    nearby: arrayValue(record.nearby).map((entry) => sanitizePublicRankEntry(entry, currentRank)),
    updatedAt: stringValue(record.updatedAt)
  };
}

function sanitizePublicHolding(value: unknown, totalAssets: number): PublicHolding {
  const record = isRecord(value) ? value : {};
  const marketValue = numberValue(record.marketValue);

  return {
    symbol: stringValue(record.symbol),
    name: stringValue(record.name),
    market: enumValue(record.market, MARKET_VALUES, "CN"),
    shares: numberValue(record.shares),
    availableShares: numberValue(record.availableShares),
    costPrice: numberValue(record.costPrice),
    currentPrice: numberValue(record.currentPrice),
    marketValue,
    profit: numberValue(record.profit),
    profitRate: numberValue(record.profitRate),
    positionRate: totalAssets > 0 ? marketValue / totalAssets : 0
  };
}

function sanitizePublicDashboard(value: unknown): PublicDashboard {
  const record = isRecord(value) ? value : {};
  const totalAssets = numberValue(record.totalAssets);

  return {
    updatedAt: stringValue(record.updatedAt),
    sourceStatus: enumValue(record.sourceStatus, SOURCE_STATUSES, "error"),
    totalAssets,
    initialCapital: numberValue(record.initialCapital),
    cash: numberValue(record.cash),
    frozenCash: numberValue(record.frozenCash),
    returnRate: numberValue(record.returnRate),
    currentRank: nullableNumber(record.currentRank),
    metrics: arrayValue(record.metrics).map((metric) => {
      const metricRecord = isRecord(metric) ? metric : {};

      return {
        label: stringValue(metricRecord.label),
        value: stringValue(metricRecord.value),
        tone: enumValue(metricRecord.tone, new Set(["neutral", "positive", "negative", "warning"]), "neutral")
      };
    }),
    cnHoldings: arrayValue(record.cnHoldings).map((holding) => sanitizePublicHolding(holding, totalAssets)),
    marketSummaries: arrayValue(record.marketSummaries).map((market) => {
      const marketRecord = isRecord(market) ? market : {};

      return {
        market: enumValue(marketRecord.market, MARKET_VALUES, "CN"),
        label: stringValue(marketRecord.label),
        totalValue: numberValue(marketRecord.totalValue),
        profit: numberValue(marketRecord.profit),
        profitRate: numberValue(marketRecord.profitRate),
        holdingsCount: numberValue(marketRecord.holdingsCount)
      };
    }),
    latestRun: isRecord(record.latestRun) ? sanitizePublicRunLog(record.latestRun) : null
  };
}

function sanitizePublicSnapshot(value: unknown): PublicSnapshot | null {
  if (!isRecord(value) || !isRecord(value.dashboard) || !isRecord(value.rank)) {
    return null;
  }

  return {
    dashboard: sanitizePublicDashboard(value.dashboard),
    logs: arrayValue(value.logs).map(sanitizePublicRunLog),
    rank: sanitizePublicRank(value.rank),
    recentTrades: arrayValue(value.recentTrades).map(sanitizePublicTrade)
  };
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRunRowToPublicRunLog(row: {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger: "cron" | "manual";
  market_view: string | null;
  risk_level: "low" | "medium" | "high" | null;
  summary: string | null;
  candidates_json: string;
  selected_action_json: string | null;
  risk_result_json: string;
  order_result_json: string | null;
}): PublicRunLog {
  return sanitizePublicRunLog({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    trigger: row.trigger,
    marketView: row.market_view ?? "unknown",
    riskLevel: row.risk_level ?? "unknown",
    summary: row.summary ?? "无摘要",
    candidates: parseJson<unknown[]>(row.candidates_json, []),
    selectedAction: parseJson<unknown>(row.selected_action_json, null),
    riskResult: parseJson<unknown>(row.risk_result_json, { allowed: false, reasons: [] }),
    orderResult: pickPublicOrderResult(parseJson<unknown>(row.order_result_json, null))
  });
}

function mergeLogs(snapshot: PublicSnapshot, logs: PublicRunLog[]): PublicSnapshot {
  return {
    ...snapshot,
    dashboard: {
      ...snapshot.dashboard,
      latestRun: logs[0] ?? null
    },
    logs
  };
}

function toPublicHolding(holding: NonNullable<ArenaPortfolioData["holdings"]>[number], totalAssets: number): PublicHolding {
  const marketValue = holding.market_value ?? 0;

  return {
    symbol: holding.symbol,
    name: holding.name,
    market: holding.market,
    shares: holding.shares,
    availableShares: holding.available_shares ?? holding.shares,
    costPrice: holding.cost_price ?? holding.avg_cost ?? 0,
    currentPrice: holding.current_price ?? 0,
    marketValue,
    profit: holding.profit ?? holding.profit_loss ?? 0,
    profitRate: holding.profit_rate ?? 0,
    positionRate: totalAssets > 0 ? marketValue / totalAssets : 0
  };
}

function toPublicSnapshot(
  home: ArenaHomeData,
  portfolio: ArenaPortfolioData,
  trades: ArenaTradesData,
  leaderboard: ArenaLeaderboardData
): PublicSnapshot {
  const updatedAt = new Date().toISOString();
  const holdings = portfolio.holdings ?? [];
  const totalAssets =
    maybeNumber(home.total_assets, home.portfolio?.total_value, portfolio.portfolio?.total_value, home.initial_capital) ?? 0;
  const initialCapital = maybeNumber(home.initial_capital, portfolio.portfolio?.total_invested) ?? 1000000;
  const cash = maybeNumber(home.cash, home.portfolio?.cash, portfolio.portfolio?.cash) ?? 0;
  const returnRate = maybeNumber(home.return_rate, home.portfolio?.return_rate, portfolio.portfolio?.return_rate) ?? 0;
  const currentRank = home.rank ?? null;
  const publicHoldings = holdings.map((holding) => toPublicHolding(holding, totalAssets));
  const currentAgentId = home.agent_id ?? home.agent?.id ?? null;

  const leaderEntries = (leaderboard.leaderboard ?? []).slice(0, 10).map((entry) => ({
    rank: entry.rank,
    nickname: entry.nickname ?? entry.agent?.nickname ?? entry.agent?.username ?? "unknown",
    totalAssets: entry.total_assets ?? entry.total_value ?? 0,
    returnRate: entry.return_rate ?? 0,
    isCurrentAgent: currentAgentId
      ? Boolean((entry.agent_id ?? entry.agent?.id) ? (entry.agent_id ?? entry.agent?.id) === currentAgentId : entry.rank === currentRank)
      : entry.rank === currentRank
  }));

  const nearbyEntries = currentRank === null
    ? []
    : (leaderboard.leaderboard ?? [])
        .filter((entry) => Math.abs(entry.rank - currentRank) <= 3)
        .map((entry) => ({
          rank: entry.rank,
          nickname: entry.nickname ?? entry.agent?.nickname ?? entry.agent?.username ?? "unknown",
          totalAssets: entry.total_assets ?? entry.total_value ?? 0,
          returnRate: entry.return_rate ?? 0,
          isCurrentAgent: currentAgentId
            ? Boolean((entry.agent_id ?? entry.agent?.id) ? (entry.agent_id ?? entry.agent?.id) === currentAgentId : entry.rank === currentRank)
            : entry.rank === currentRank
        }));

  const topLeader = leaderEntries[0] ?? null;
  const leaderGap = topLeader && currentRank !== null ? Math.max(topLeader.totalAssets - totalAssets, 0) : null;
  const recentTrades = (trades.trades ?? []).slice(0, 20).map((trade) => ({
    symbol: trade.symbol,
    action: trade.action,
    shares: trade.shares,
    status: trade.status,
    reason: nullableString(trade.reason) ?? noteReason(trade.note),
    createdAt: nullableString(trade.created_at ?? trade.submitted_at ?? trade.executed_at)
  }));

  return {
    dashboard: {
      updatedAt,
      sourceStatus: "live",
      totalAssets,
      initialCapital,
      cash,
      frozenCash: home.frozen_cash ?? 0,
      returnRate,
      currentRank,
      metrics: [
        { label: "总资产", value: money(totalAssets), tone: "neutral" },
        { label: "收益率", value: percent(returnRate), tone: returnRate >= 0 ? "positive" : "negative" },
        { label: "当前排名", value: currentRank === null ? "未同步" : `#${currentRank}`, tone: "neutral" },
        { label: "可用现金", value: money(cash), tone: "neutral" }
      ],
      cnHoldings: publicHoldings.filter((holding) => holding.market === "CN"),
      marketSummaries: (["CN", "HK", "US"] as const).map((market) => {
        const marketHoldings = publicHoldings.filter((holding) => holding.market === market);
        const totalValue = marketHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
        const profit = marketHoldings.reduce((sum, holding) => sum + holding.profit, 0);

        return {
          market,
          label: market === "CN" ? "A 股" : market === "HK" ? "港股" : "美股",
          totalValue,
          profit,
          profitRate: totalValue > 0 ? profit / totalValue : 0,
          holdingsCount: marketHoldings.length
        };
      }),
      latestRun: null
    },
    logs: [],
    rank: {
      currentRank,
      returnRate,
      leaderGap,
      leaders: leaderEntries,
      nearby: nearbyEntries,
      updatedAt
    },
    recentTrades
  };
}

export async function getPublicData(env: Env): Promise<PublicSnapshot> {
  let cached: PublicSnapshot | null = null;
  const runs = (await listRecentRuns(env, 30)).map(mapRunRowToPublicRunLog);

  try {
    const candidate = sanitizePublicSnapshot(await getCachedPublicData<unknown>(env));
    if (candidate) {
      cached = candidate;
      if (isFreshSnapshot(candidate)) {
        return mergeLogs(candidate, runs);
      }
    }
  } catch {
    cached = null;
  }

  try {
    const [home, portfolio, trades, leaderboard] = await Promise.all([
      fetchArenaHome(env),
      fetchArenaPortfolio(env),
      fetchArenaTrades(env),
      fetchArenaLeaderboard(env)
    ]);

    const publicData = toPublicSnapshot(home, portfolio, trades, leaderboard);
    const snapshotWithLogs = mergeLogs(publicData, runs);
    await putCachedPublicData(env, snapshotWithLogs);
    return snapshotWithLogs;
  } catch {
    if (cached) {
      return mergeLogs(withSourceStatus(cached, "stale"), runs);
    }

    throw new Error("Signal Arena upstream unavailable.");
  }
}
