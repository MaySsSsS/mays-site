import { requestStrictDecision } from "./ai-provider";
import { arenaList } from "./arena-normalize";
import { buildDecisionPrompt } from "./prompt";
import { publicRunnerErrorFor } from "./run-error";
import { selectExecutableAction } from "./risk";
import { generateTradingSignals } from "./signal-generator";
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
  ArenaHomeData,
  ArenaHolding,
  ArenaPortfolioData,
  ArenaSnapshot,
  ArenaTopMover,
  ArenaTrade,
  DecisionPromptContext,
  Env,
  RiskContext,
  RunnerTrigger
} from "./types";

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

function noteReason(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return typeof record.reason === "string" ? record.reason : null;
  }

  return null;
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

export async function runSignalArenaTrader(
  env: Env,
  options: { trigger: RunnerTrigger; dryRun: boolean; now?: Date }
): Promise<{ id: string; status: string }> {
  const id = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const locked = await acquireRunnerLock(env, id, 600);

  if (!locked) {
    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "skipped",
      trigger: options.trigger,
      marketSession: "lock_busy",
      marketView: null,
      riskLevel: null,
      summary: "上一次 Runner 尚未结束，本轮跳过。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: ["Runner lock is busy."] }),
      orderResultJson: null,
      errorMessage: null
    });
    return { id, status: "skipped" };
  }

  try {
    const isTradingSession = isCnTradingSession(options.now);

    if (!isTradingSession) {
      await insertRun(env, {
        id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "skipped",
        trigger: options.trigger,
        marketSession: "closed",
        marketView: null,
        riskLevel: null,
        summary: "当前不是 A 股交易时段，本轮不调用 AI。",
        candidatesJson: "[]",
        selectedActionJson: null,
        riskResultJson: JSON.stringify({ allowed: false, reasons: ["Market closed."] }),
        orderResultJson: null,
        errorMessage: null
      });
      return { id, status: "skipped" };
    }

    const home = await fetchArenaHome(env);

    if (isArenaMarketClosed(home.market_status)) {
      await insertRun(env, {
        id,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: "skipped",
        trigger: options.trigger,
        marketSession: "closed",
        marketView: null,
        riskLevel: null,
        summary: "上游显示 A 股当前未开盘，本轮不调用 AI。",
        candidatesJson: "[]",
        selectedActionJson: null,
        riskResultJson: JSON.stringify({ allowed: false, reasons: ["Arena market is closed."] }),
        orderResultJson: null,
        errorMessage: null
      });
      return { id, status: "skipped" };
    }

    const [portfolio, trades, topMovers, snapshots] = await Promise.all([
      fetchArenaPortfolio(env),
      fetchArenaTrades(env),
      fetchArenaTopMovers(env),
      fetchArenaSnapshots(env)
    ]);

    const allHoldings = portfolioHoldings(portfolio);
    const beforeState = accountState(home, portfolio, allHoldings);
    const totalAssets = beforeState.totalAssets;
    const holdings = allHoldings.filter((holding) => holding.market === "CN");
    const recentTrades = tradeRecords(trades);
    const topMoverRecords = topMoverList(topMovers);
    const snapshotsRecords = snapshotRecords(snapshots);
    const signals = generateTradingSignals({
      now: (options.now ?? new Date()).toISOString(),
      totalAssets,
      cash: beforeState.cash,
      holdings,
      topMovers: topMoverRecords,
      recentTrades
    });
    const context: DecisionPromptContext = {
      now: (options.now ?? new Date()).toISOString(),
      account: {
        totalAssets,
        cash: beforeState.cash,
        returnRate: beforeState.returnRate,
        rank: beforeState.currentRank
      },
      holdings: holdings.map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        availableShares: holding.available_shares ?? holding.shares,
        positionRate: totalAssets > 0 ? (holding.market_value ?? 0) / totalAssets : 0,
        profitRate: holding.profit_rate ?? 0
      })),
      signals,
      recentTrades: recentTrades.slice(0, 20).map((trade) => ({
        symbol: trade.symbol,
        action: trade.action,
        shares: trade.shares,
        status: trade.status,
        reason: trade.reason ?? noteReason(trade.note),
        createdAt: trade.created_at ?? trade.submitted_at ?? trade.executed_at ?? null
      })),
      topMovers: topMoverRecords.slice(0, 20).map((mover) => ({
        symbol: mover.symbol,
        name: mover.name ?? mover.symbol,
        changeRate: firstNumber(mover.change_rate, mover.changeRate) ?? 0,
        price: firstNumber(mover.price) ?? null
      })),
      snapshots: snapshotsRecords.slice(0, 20).map((snapshot) => ({
        capturedAt: snapshot.created_at ?? snapshot.captured_at ?? null,
        totalAssets: firstNumber(snapshot.total_assets, snapshot.total_value) ?? 0,
        returnRate: firstNumber(snapshot.return_rate) ?? 0,
        rank: firstNumber(snapshot.rank, snapshot.current_rank) ?? null
      })),
      constraints: [
        "Only A-share symbols are tradable in v1.",
        "Buy and sell shares must be multiples of 100.",
        "Execute at most one order per run.",
        "Keep at least 20% cash after buys.",
        "Single stock target position must stay below 20%."
      ]
    };

    const decision = await requestStrictDecision(env, buildDecisionPrompt(context));
    const prices = Object.fromEntries(
      holdings.map((holding) => [holding.symbol, holding.current_price ?? 0])
    );
    const riskContext: RiskContext = {
      isTradingSession,
      totalAssets,
      cash: beforeState.cash,
      prices,
      holdings: Object.fromEntries(
        holdings.map((holding) => [
          holding.symbol,
          {
            shares: holding.shares,
            availableShares: holding.available_shares ?? holding.shares,
            marketValue: holding.market_value ?? 0,
            positionRate: totalAssets > 0 ? (holding.market_value ?? 0) / totalAssets : 0
          }
        ])
      )
    };
    const risk = selectExecutableAction(decision, riskContext);
    const orderResult =
      risk.allowed && risk.selectedAction && !options.dryRun
        ? await submitArenaTrade(env, risk.selectedAction)
        : null;

    const isObserveDecision = risk.selectedAction?.action === "hold" || (!risk.selectedAction && decision.final_action === null);
    const status = isObserveDecision ? "held" : risk.allowed ? (options.dryRun ? "held" : "executed") : "blocked";
    const finishedAt = new Date().toISOString();
    const afterSnapshot = beforeState;
    const decisionTrace = {
      beforeStateSummary: decision.before_state_summary,
      decisionRoute: decision.decision_route,
      marketAssessment: decision.market_assessment,
      portfolioAssessment: decision.portfolio_assessment,
      rejectedActions: decision.rejected_actions,
      publicExplanation: decision.public_explanation,
      cashPlan: decision.cash_plan,
      watchlist: decision.watchlist,
      signalContext: signals
    };

    await insertRun(env, {
      id,
      startedAt,
      finishedAt,
      status,
      trigger: options.trigger,
      marketSession: "open",
      marketView: decision.market_view,
      riskLevel: decision.risk_level,
      summary: decision.summary,
      candidatesJson: JSON.stringify(decision.candidates),
      selectedActionJson: risk.selectedAction ? JSON.stringify(risk.selectedAction) : null,
      riskResultJson: JSON.stringify({ allowed: risk.allowed, reasons: risk.reasons }),
      orderResultJson: orderResult ? JSON.stringify(orderResult) : null,
      beforeStateJson: JSON.stringify(beforeState),
      decisionTraceJson: JSON.stringify(decisionTrace),
      afterSnapshotJson: JSON.stringify(afterSnapshot),
      errorMessage: null
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
        currentRank: afterSnapshot.currentRank
      }),
      rankJson: JSON.stringify({
        currentRank: afterSnapshot.currentRank,
        returnRate: afterSnapshot.returnRate
      })
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
      summary: publicError?.summary ?? "Runner 执行失败。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: publicError?.riskReasons ?? [] }),
      orderResultJson: null,
      errorMessage
    });
    return { id, status: "failed" };
  } finally {
    await releaseRunnerLock(env, id);
  }
}
