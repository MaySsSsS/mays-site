import { arenaList } from "./arena-normalize";
import { getCachedCnStocks, getCachedStockHistory } from "./market-data";
import {
  Q_ALPHA_ACCOUNT_SCOPE,
  Q_ALPHA_DEFAULT_PARAMETERS,
  Q_ALPHA_STRATEGY_VERSION,
  buildQAlphaCandidatePool,
  runQAlphaV1
} from "./q-alpha-v1";
import { publicRunnerErrorFor } from "./run-error";
import { selectExecutableAction } from "./risk";
import {
  fetchArenaHome,
  fetchArenaPortfolio,
  fetchArenaSnapshots,
  fetchArenaTopMovers,
  fetchArenaTrades,
  submitArenaTrade
} from "./signal-api";
import { acquireRunnerLock, insertRun, insertSnapshot, releaseRunnerLock } from "./storage";
import type {
  ArenaHistoryBar,
  ArenaHomeData,
  ArenaHolding,
  ArenaPortfolioData,
  ArenaSnapshot,
  ArenaTopMover,
  ArenaTrade,
  Env,
  RiskContext,
  RunnerTrigger
} from "./types";

function accountScope(env: Env): string {
  return env.SIGNAL_ARENA_ACCOUNT_SCOPE || Q_ALPHA_ACCOUNT_SCOPE;
}

function strategyVersion(env: Env): string {
  return env.SIGNAL_ARENA_STRATEGY_VERSION || Q_ALPHA_STRATEGY_VERSION;
}

function isCnTradingSession(date = new Date()): boolean {
  const shanghai = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const day = shanghai.getDay();
  const minutes = shanghai.getHours() * 60 + shanghai.getMinutes() + shanghai.getSeconds() / 60;

  if (day === 0 || day === 6) {
    return false;
  }

  return (minutes >= 570 && minutes < 690) || (minutes >= 780 && minutes < 897);
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function isArenaMarketClosed(value: unknown): boolean {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";

  return ["closed", "close", "market_closed", "not_open", "not-open", "non_trading", "non-trading", "休市", "未开盘"].some((token) =>
    status.includes(token)
  );
}

function portfolioHoldings(portfolio: ArenaPortfolioData): ArenaHolding[] {
  return arenaList<ArenaHolding>(portfolio, ["holdings", "positions", "items", "records", "data"]);
}

function tradeRecords(trades: unknown): ArenaTrade[] {
  return arenaList<ArenaTrade>(trades, ["trades", "orders", "records", "items", "data"]);
}

function topMoverList(topMovers: unknown): ArenaTopMover[] {
  return arenaList<ArenaTopMover>(topMovers, ["movers", "top_movers", "items", "records", "data"]);
}

function snapshotRecords(snapshots: unknown): ArenaSnapshot[] {
  return arenaList<ArenaSnapshot>(snapshots, ["snapshots", "records", "items", "data"]);
}

function accountState(home: ArenaHomeData, portfolio: ArenaPortfolioData, holdings: ArenaHolding[]): {
  totalAssets: number;
  cash: number;
  returnRate: number;
  currentRank: number | null;
  holdingsCount: number;
} {
  return {
    totalAssets:
      firstNumber(home.total_assets, home.portfolio?.total_value, portfolio.portfolio?.total_value, home.initial_capital) ?? 0,
    cash: firstNumber(home.cash, home.portfolio?.cash, portfolio.portfolio?.cash) ?? 0,
    returnRate: firstNumber(home.return_rate, home.portfolio?.return_rate, portfolio.portfolio?.return_rate) ?? 0,
    currentRank: home.rank ?? null,
    holdingsCount: holdings.length
  };
}

function priceBySymbol(holdings: ArenaHolding[], histories: Record<string, ArenaHistoryBar[]>): Record<string, number> {
  const prices: Record<string, number> = {};

  for (const [symbol, history] of Object.entries(histories)) {
    const latestBar = history.length > 0 ? history[history.length - 1] : undefined;
    const latestHistoryPrice = firstNumber(latestBar?.close, latestBar?.price);
    if (latestHistoryPrice !== undefined) {
      prices[symbol] = latestHistoryPrice;
    }
  }

  for (const holding of holdings) {
    prices[holding.symbol] = firstNumber(holding.current_price, prices[holding.symbol], holding.avg_cost, holding.cost_price) ?? 0;
  }

  return prices;
}

async function loadHistories(
  env: Env,
  now: Date,
  symbols: string[]
): Promise<Record<string, ArenaHistoryBar[]>> {
  const histories: Record<string, ArenaHistoryBar[]> = {};

  await Promise.all(
    symbols.slice(0, Q_ALPHA_DEFAULT_PARAMETERS.maxHistorySymbolsPerRun).map(async (symbol) => {
      histories[symbol] = await getCachedStockHistory(env, symbol, now);
    })
  );

  return histories;
}

async function insertSkippedRun(
  env: Env,
  args: {
    id: string;
    startedAt: string;
    trigger: RunnerTrigger;
    marketSession: string;
    summary: string;
    reason: string;
  }
): Promise<void> {
  await insertRun(env, {
    id: args.id,
    startedAt: args.startedAt,
    finishedAt: new Date().toISOString(),
    status: "skipped",
    trigger: args.trigger,
    marketSession: args.marketSession,
    marketView: null,
    riskLevel: null,
    summary: args.summary,
    candidatesJson: "[]",
    selectedActionJson: null,
    riskResultJson: JSON.stringify({ allowed: false, reasons: [args.reason] }),
    orderResultJson: null,
    errorMessage: null,
    accountScope: accountScope(env),
    strategyVersion: strategyVersion(env),
    strategyParametersJson: JSON.stringify(Q_ALPHA_DEFAULT_PARAMETERS)
  });
}

export async function runSignalArenaTrader(
  env: Env,
  options: { trigger: RunnerTrigger; dryRun: boolean; now?: Date }
): Promise<{ id: string; status: string }> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const now = options.now ?? new Date();
  const scope = accountScope(env);
  const version = strategyVersion(env);
  const locked = await acquireRunnerLock(env, id, 600);

  if (!locked) {
    await insertSkippedRun(env, {
      id,
      startedAt,
      trigger: options.trigger,
      marketSession: "lock_busy",
      summary: "上一次 Quant Lab Runner 尚未结束，本轮跳过。",
      reason: "Runner lock is busy."
    });
    return { id, status: "skipped" };
  }

  try {
    const isTradingSession = isCnTradingSession(now);

    if (!isTradingSession) {
      await insertSkippedRun(env, {
        id,
        startedAt,
        trigger: options.trigger,
        marketSession: "closed",
        summary: "当前不是 A 股交易时段，Q-Alpha v1 本轮跳过。",
        reason: "Market closed."
      });
      return { id, status: "skipped" };
    }

    const home = await fetchArenaHome(env);

    if (isArenaMarketClosed(home.market_status)) {
      await insertSkippedRun(env, {
        id,
        startedAt,
        trigger: options.trigger,
        marketSession: "closed",
        summary: "上游显示 A 股当前未开盘，Q-Alpha v1 本轮跳过。",
        reason: "Arena market is closed."
      });
      return { id, status: "skipped" };
    }

    const [portfolio, tradesPayload, topMoversPayload, snapshotsPayload, stockUniverse] = await Promise.all([
      fetchArenaPortfolio(env),
      fetchArenaTrades(env),
      fetchArenaTopMovers(env),
      fetchArenaSnapshots(env),
      getCachedCnStocks(env, now)
    ]);

    const allHoldings = portfolioHoldings(portfolio);
    const holdings = allHoldings.filter((holding) => holding.market === "CN");
    const beforeState = accountState(home, portfolio, allHoldings);
    const recentTrades = tradeRecords(tradesPayload);
    const topMovers = topMoverList(topMoversPayload).filter((mover) => mover.market === undefined || mover.market === "CN");
    const snapshots = snapshotRecords(snapshotsPayload);
    const candidatePool = buildQAlphaCandidatePool({
      now,
      dryRun: options.dryRun,
      accountScope: scope,
      strategyVersion: version,
      totalAssets: beforeState.totalAssets,
      cash: beforeState.cash,
      holdings,
      topMovers,
      recentTrades,
      stockUniverse
    }, Q_ALPHA_DEFAULT_PARAMETERS.maxHistorySymbolsPerRun);
    const symbols = candidatePool.map((candidate) => candidate.symbol);
    const histories = await loadHistories(env, now, symbols);
    const strategy = runQAlphaV1({
      now,
      dryRun: options.dryRun,
      accountScope: scope,
      strategyVersion: version,
      totalAssets: beforeState.totalAssets,
      cash: beforeState.cash,
      holdings,
      topMovers,
      recentTrades,
      stockUniverse,
      histories
    });

    const riskContext: RiskContext = {
      isTradingSession,
      totalAssets: beforeState.totalAssets,
      cash: beforeState.cash,
      prices: priceBySymbol(holdings, histories),
      holdings: Object.fromEntries(
        holdings.map((holding) => [
          holding.symbol,
          {
            shares: holding.shares,
            availableShares: holding.available_shares ?? holding.shares,
            marketValue: holding.market_value ?? 0,
            positionRate: beforeState.totalAssets > 0 ? (holding.market_value ?? 0) / beforeState.totalAssets : 0
          }
        ])
      )
    };
    const risk = selectExecutableAction(strategy.selectedAction, riskContext);
    const orderResult =
      risk.allowed && risk.selectedAction && !options.dryRun
        ? await submitArenaTrade(env, risk.selectedAction)
        : null;
    const status = !risk.selectedAction ? "held" : risk.allowed ? (options.dryRun ? "held" : "executed") : "blocked";
    const finishedAt = new Date().toISOString();
    const afterSnapshot = beforeState;
    const strategyTrace = {
      ...strategy.strategyTrace,
      finalAction: risk.selectedAction,
      riskReasons: risk.reasons,
      recentSnapshots: snapshots.slice(0, 10)
    };

    await insertRun(env, {
      id,
      startedAt,
      finishedAt,
      status,
      trigger: options.trigger,
      marketSession: "open",
      marketView: strategy.marketView,
      riskLevel: strategy.riskLevel,
      summary: strategy.summary,
      candidatesJson: JSON.stringify(strategy.candidates),
      selectedActionJson: risk.selectedAction ? JSON.stringify(risk.selectedAction) : null,
      riskResultJson: JSON.stringify({ allowed: risk.allowed, reasons: risk.reasons }),
      orderResultJson: orderResult ? JSON.stringify(orderResult) : null,
      beforeStateJson: JSON.stringify(beforeState),
      decisionTraceJson: null,
      strategyTraceJson: JSON.stringify(strategyTrace),
      strategyParametersJson: JSON.stringify(Q_ALPHA_DEFAULT_PARAMETERS),
      afterSnapshotJson: JSON.stringify(afterSnapshot),
      errorMessage: null,
      accountScope: scope,
      strategyVersion: version
    });

    await insertSnapshot(env, {
      id: crypto.randomUUID(),
      runId: id,
      createdAt: finishedAt,
      sourceStatus: "live",
      dashboardJson: JSON.stringify({
        totalAssets: afterSnapshot.totalAssets,
        cash: afterSnapshot.cash,
        returnRate: afterSnapshot.returnRate,
        currentRank: afterSnapshot.currentRank,
        accountScope: scope,
        strategyVersion: version
      }),
      rankJson: JSON.stringify({
        currentRank: afterSnapshot.currentRank,
        returnRate: afterSnapshot.returnRate,
        accountScope: scope,
        strategyVersion: version
      }),
      accountScope: scope,
      strategyVersion: version
    });

    return { id, status };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown runner error";
    const publicError = publicRunnerErrorFor(errorMessage);

    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      trigger: options.trigger,
      marketSession: "unknown",
      marketView: null,
      riskLevel: null,
      summary: publicError?.summary ?? "Quant Lab Runner 执行失败。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: publicError?.riskReasons ?? [] }),
      orderResultJson: null,
      errorMessage,
      accountScope: scope,
      strategyVersion: version,
      strategyParametersJson: JSON.stringify(Q_ALPHA_DEFAULT_PARAMETERS)
    });
    return { id, status: "failed" };
  } finally {
    await releaseRunnerLock(env, id);
  }
}
