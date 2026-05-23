import { requestStrictDecision } from "./ai-provider";
import { buildDecisionPrompt } from "./prompt";
import { selectExecutableAction } from "./risk";
import { fetchArenaHome, fetchArenaPortfolio, fetchArenaTrades, submitArenaTrade } from "./signal-api";
import { acquireRunnerLock, insertRun, releaseRunnerLock } from "./storage";
import type { DecisionPromptContext, Env, RiskContext, RunnerTrigger } from "./types";

function isCnTradingSession(date = new Date()): boolean {
  const shanghai = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const day = shanghai.getDay();
  const minutes = shanghai.getHours() * 60 + shanghai.getMinutes();

  if (day === 0 || day === 6) {
    return false;
  }

  return (minutes >= 570 && minutes <= 690) || (minutes >= 780 && minutes <= 900);
}

export async function runSignalArenaTrader(
  env: Env,
  options: { trigger: RunnerTrigger; dryRun: boolean }
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
    const isTradingSession = isCnTradingSession();

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

    const [home, portfolio, _trades] = await Promise.all([
      fetchArenaHome(env),
      fetchArenaPortfolio(env),
      fetchArenaTrades(env)
    ]);

    const totalAssets = home.total_assets ?? home.initial_capital ?? 1000000;
    const holdings = (portfolio.holdings ?? []).filter((holding) => holding.market === "CN");
    const context: DecisionPromptContext = {
      now: new Date().toISOString(),
      account: {
        totalAssets,
        cash: home.cash ?? 0,
        returnRate: home.return_rate ?? 0,
        rank: home.rank ?? null
      },
      holdings: holdings.map((holding) => ({
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        availableShares: holding.available_shares ?? 0,
        positionRate: totalAssets > 0 ? (holding.market_value ?? 0) / totalAssets : 0,
        profitRate: holding.profit_rate ?? 0
      })),
      signals: [],
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
      cash: home.cash ?? 0,
      prices,
      holdings: Object.fromEntries(
        holdings.map((holding) => [
          holding.symbol,
          {
            shares: holding.shares,
            availableShares: holding.available_shares ?? 0,
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

    const status = risk.allowed ? (options.dryRun ? "held" : "executed") : "blocked";

    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
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
      errorMessage: null
    });

    return { id, status };
  } catch (error) {
    await insertRun(env, {
      id,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      trigger: options.trigger,
      marketSession: "unknown",
      marketView: null,
      riskLevel: null,
      summary: "Runner 执行失败。",
      candidatesJson: "[]",
      selectedActionJson: null,
      riskResultJson: JSON.stringify({ allowed: false, reasons: [] }),
      orderResultJson: null,
      errorMessage: error instanceof Error ? error.message : "Unknown runner error"
    });
    return { id, status: "failed" };
  } finally {
    await releaseRunnerLock(env, id);
  }
}
