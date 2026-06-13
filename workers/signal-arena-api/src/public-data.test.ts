import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import worker from "./index";
import { fetchArenaTrades } from "./signal-api";
import { getPublicData } from "./public-data";
import type { SignalArenaRunRow, SignalArenaSnapshotRow } from "./storage";
import type { Env } from "./types";

const originalFetch = globalThis.fetch;
type WorkerSnapshot = Awaited<ReturnType<typeof getPublicData>>;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeKv(initial: Record<string, unknown> = {}): KVNamespace {
  const store = new Map<string, string>();

  for (const [key, value] of Object.entries(initial)) {
    store.set(key, JSON.stringify(value));
  }

  return {
    async get(key: string, type?: "json") {
      const raw = store.get(key);
      if (raw === undefined) {
        return null;
      }

      return type === "json" ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    }
  } as unknown as KVNamespace;
}

function makeEnv(kv = makeKv()): Env {
  return {
    SIGNAL_ARENA_DB: {} as D1Database,
    SIGNAL_ARENA_KV: kv,
    CORS_ORIGIN: "https://maysssss.cn",
    SIGNAL_ARENA_BASE_URL: "https://signal.example",
    SIGNAL_ARENA_AGENT_API_KEY: "agent-secret",
    SIGNAL_ARENA_ADMIN_TOKEN: "admin-secret"
  };
}

function makeDb(rows: SignalArenaRunRow[] = [], snapshots: SignalArenaSnapshotRow[] = []): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async all<T>() {
              const scope = typeof values[0] === "string" ? values[0] : null;
              const scopedRows = scope ? rows.filter((row) => row.account_scope === scope) : rows;
              const scopedSnapshots = scope ? snapshots.filter((snapshot) => snapshot.account_scope === scope) : snapshots;
              return {
                results: (sql.includes("signal_arena_snapshots") ? scopedSnapshots : scopedRows) as T[]
              };
            }
          };
        }
      };
    }
  } as unknown as D1Database;
}

function makeSnapshot(updatedAt: string, sourceStatus: WorkerSnapshot["dashboard"]["sourceStatus"]): WorkerSnapshot {
  return {
    dashboard: {
      updatedAt,
      sourceStatus,
      totalAssets: 1000000,
      initialCapital: 1000000,
      cash: 500000,
      frozenCash: 0,
      returnRate: 0.1,
      currentRank: 2,
      metrics: [],
      cnHoldings: [],
      marketSummaries: [],
      latestRun: null
    },
    logs: [],
    rank: {
      currentRank: 2,
      returnRate: 0.1,
      leaderGap: null,
      previousGap: null,
      topTenGap: null,
      leaders: [],
      nearby: [],
      updatedAt
    },
    equityHistory: [],
    operations: {
      tone: "watch",
      label: "观察",
      dataAgeSeconds: null,
      latestRunStatus: null,
      latestRunFinishedAt: null,
      latestRunSummary: null,
      equityPointCount: 0,
      equityCoverageDays: 0,
      logCount: 0
    },
    recentTrades: [],
    strategy: {
      name: "Q-Alpha",
      version: "Q-Alpha v1",
      accountScope: "quant-v1",
      runMode: "live",
      parameters: {
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
      }
    },
    account: {
      scope: "quant-v1",
      strategyVersion: "Q-Alpha v1",
      displayName: "Quant Lab"
    }
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

test("fresh cache is returned without hitting upstream", async () => {
  const cached = makeSnapshot(new Date().toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all:quant-v1": cached }));
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.dashboard.updatedAt, cached.dashboard.updatedAt);
  assert.equal(result.dashboard.sourceStatus, "live");
  assert.equal(fetchCalls, 0);
});

test("dashboard snapshot seeds equity history when no stored snapshots exist", async () => {
  const cached = makeSnapshot(new Date().toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all:quant-v1": cached }));

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.equityHistory.length, 1);
  assert.equal(result.equityHistory[0]?.totalAssets, cached.dashboard.totalAssets);
  assert.equal(result.equityHistory[0]?.status, "snapshot");
});

test("public data includes generated operations status", async () => {
  const cached = makeSnapshot(new Date().toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all:quant-v1": cached }));

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.operations.tone, "healthy");
  assert.equal(result.operations.equityPointCount, 1);
  assert.equal(result.operations.logCount, 0);
});

test("cached public data is sanitized before returning", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": {
        dashboard: {
          updatedAt,
          sourceStatus: "live",
          totalAssets: 1000000,
          initialCapital: 1000000,
          cash: 500000,
          frozenCash: 0,
          returnRate: 0.1,
          currentRank: 2,
          metrics: [],
          cnHoldings: [],
          marketSummaries: [],
          latestRun: {
            id: "run-1",
            startedAt: updatedAt,
            finishedAt: null,
            status: "executed",
            trigger: "manual",
            marketView: "neutral",
            riskLevel: "low",
            summary: "ok",
            candidates: [],
            selectedAction: null,
            riskResult: { allowed: true, reasons: [] },
            orderResult: { status: "filled", message: "done", orderId: "private-order" }
          }
        },
        logs: [],
        rank: {
          currentRank: 2,
          returnRate: 0.1,
          leaderGap: null,
          leaders: [{ rank: 2, nickname: "Me", totalAssets: 1000000, returnRate: 0.1, isCurrentAgent: true, agent_id: "hidden" }],
          nearby: [],
          updatedAt
        },
        operations: {
          tone: "attention",
          label: "注意",
          dataAgeSeconds: 10,
          latestRunStatus: "failed",
          latestRunFinishedAt: updatedAt,
          latestRunSummary: "Runner 执行失败。",
          equityPointCount: 1,
          equityCoverageDays: 0,
          logCount: 1,
          adminToken: "private-admin-token"
        },
        recentTrades: [
          {
            symbol: "sh600519",
            action: "buy",
            shares: 100,
            status: "filled",
            reason: "ok",
            createdAt: updatedAt,
            order_id: "private-order"
          }
        ],
        strategy: {
          name: "Q-Alpha",
          version: "Q-Alpha v1",
          accountScope: "quant-v1",
          runMode: "live",
          parameters: {}
        },
        account: {
          scope: "quant-v1",
          strategyVersion: "Q-Alpha v1",
          displayName: "Quant Lab"
        },
        agent_id: "hidden",
        order_id: "private-top-level"
      }
    })
  );

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);
  const bodyText = JSON.stringify(result);

  assert.equal(bodyText.includes("private-order"), false);
  assert.equal(bodyText.includes("agent_id"), false);
  assert.equal(bodyText.includes("private-admin-token"), false);
  assert.equal(result.recentTrades[0]?.symbol, "sh600519");
  assert.equal(result.recentTrades[0]?.reason, "ok");
});

test("public data merges D1 logs without leaking private order data", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb([
    {
      id: "run-1",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "executed",
      trigger: "cron",
      market_view: "neutral",
      risk_level: "low",
      summary: "保持观察",
      candidates_json: JSON.stringify([
        {
          symbol: "sh600519",
          action: "buy",
          shares: 100,
          priority: 1,
          confidence: 0.8,
          reason: "测试"
        }
      ]),
      selected_action_json: JSON.stringify({
        symbol: "sh600519",
        action: "buy",
        shares: 100,
        priority: 1,
        confidence: 0.8,
        reason: "测试"
      }),
      risk_result_json: JSON.stringify({ allowed: true, reasons: [] }),
      order_result_json: JSON.stringify({ status: "filled", message: "done", orderId: "private-order" }),
      before_state_json: null,
      decision_trace_json: null,
      after_snapshot_json: null,
      account_scope: "quant-v1",
      strategy_version: "Q-Alpha v1"
    }
  ]);

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);
  const bodyText = JSON.stringify(result);

  assert.equal(result.logs.length, 1);
  assert.equal(result.dashboard.latestRun?.id, "run-1");
  assert.equal(result.logs[0]?.orderResult.status, "filled");
  assert.equal(result.logs[0]?.orderResult.message, "done");
  assert.equal(bodyText.includes("private-order"), false);
});

test("public data only exposes quant-v1 scoped runs with strategy traces", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb([
    {
      id: "run-quant",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "held",
      trigger: "cron",
      market_view: "neutral",
      risk_level: "medium",
      summary: "Q-Alpha v1 本轮观望",
      candidates_json: "[]",
      selected_action_json: null,
      risk_result_json: JSON.stringify({ allowed: false, reasons: ["策略最终选择观望，未提交交易动作。"] }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: null,
      strategy_trace_json: JSON.stringify({
        strategyName: "Q-Alpha",
        strategyVersion: "Q-Alpha v1",
        accountScope: "quant-v1",
        runMode: "live",
        parameters: { buyThreshold: 70, secret: "hidden" },
        candidateCount: 1,
        historyCoverage: { requestedSymbols: 1, coveredSymbols: 1, insufficientSymbols: [] },
        candidateRanking: [
          {
            symbol: "sh600519",
            name: "贵州茅台",
            score: 72,
            source: ["top-movers"],
            factorScore: { trend: 30, momentum: 20, private: 999 },
            indicators: { close: 48, ma20: 42, ma60: 36, secretAlpha: "hidden" },
            holding: { shares: 1000, availableShares: 500, profitRate: 0.08, positionRate: 0.12, privateCost: "hidden" },
            rejectionReasons: [],
            entryReasons: ["趋势结构向上"]
          }
        ],
        rejectedReasons: ["今日已达到新增买入上限 1 个。"],
        finalRule: "本轮观望",
        finalAction: { symbol: "sh600519", action: "hold", shares: 0, priority: 9, confidence: 0.5, reason: "观察" },
        riskReasons: ["策略最终选择观望，未提交交易动作。"],
        recentSnapshots: [{ captured_at: updatedAt, total_assets: 1000000, return_rate: 0.01, current_rank: 8, private: "hidden" }],
        marketRegime: "mixed",
        privateThought: "hidden"
      }),
      strategy_parameters_json: JSON.stringify({ buyThreshold: 70 }),
      after_snapshot_json: null,
      account_scope: "quant-v1",
      strategy_version: "Q-Alpha v1"
    },
    {
      id: "run-legacy",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "executed",
      trigger: "cron",
      market_view: "neutral",
      risk_level: "low",
      summary: "旧 AI 账号不应出现",
      candidates_json: "[]",
      selected_action_json: null,
      risk_result_json: JSON.stringify({ allowed: true, reasons: [] }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: null,
      after_snapshot_json: null,
      account_scope: "legacy-ai",
      strategy_version: "AI"
    },
    {
      id: "run-unscoped-old",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "executed",
      trigger: "cron",
      market_view: "neutral",
      risk_level: "low",
      summary: "迁移前旧 AI 账号不应出现",
      candidates_json: "[]",
      selected_action_json: null,
      risk_result_json: JSON.stringify({ allowed: true, reasons: [] }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: null,
      after_snapshot_json: null
    }
  ]);

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);
  const bodyText = JSON.stringify(result);

  assert.equal(result.logs.length, 1);
  assert.equal(result.logs[0]?.id, "run-quant");
  assert.equal(result.logs[0]?.strategyTrace?.candidateRanking[0]?.score, 72);
  assert.equal(result.logs[0]?.strategyTrace?.candidateRanking[0]?.factorScore.trend, 30);
  assert.equal(result.logs[0]?.strategyTrace?.candidateRanking[0]?.indicators?.close, 48);
  assert.equal(result.logs[0]?.strategyTrace?.candidateRanking[0]?.holding?.availableShares, 500);
  assert.equal(result.logs[0]?.strategyTrace?.finalAction?.action, "hold");
  assert.equal(result.logs[0]?.strategyTrace?.riskReasons[0], "策略最终选择观望，未提交交易动作。");
  assert.equal(result.logs[0]?.strategyTrace?.recentSnapshots[0]?.rank, 8);
  assert.equal(bodyText.includes("run-legacy"), false);
  assert.equal(bodyText.includes("run-unscoped-old"), false);
  assert.equal(bodyText.includes("privateThought"), false);
  assert.equal(bodyText.includes("secretAlpha"), false);
  assert.equal(bodyText.includes("privateCost"), false);
});

test("public data presents legacy hold-only blocked runs as held decisions", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb([
    {
      id: "run-hold",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "blocked",
      trigger: "cron",
      market_view: "cautious",
      risk_level: "medium",
      summary: "AI 已完成判断，本轮持有观察",
      candidates_json: JSON.stringify([
        {
          symbol: "sh600519",
          action: "hold",
          shares: 0,
          priority: 1,
          confidence: 0.7,
          reason: "继续观察"
        }
      ]),
      selected_action_json: JSON.stringify({
        symbol: "sh600519",
        action: "hold",
        shares: 0,
        priority: 1,
        confidence: 0.7,
        reason: "继续观察"
      }),
      risk_result_json: JSON.stringify({
        allowed: false,
        reasons: ["本轮建议为 hold，无需下单。", "A 股交易股数必须是 100 的整数倍。"]
      }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: JSON.stringify({
        decisionRoute: ["检查账户", "选择持有观察"],
        publicExplanation: "AI 已完成判断，本轮不提交订单。"
      }),
      after_snapshot_json: null,
      account_scope: "quant-v1",
      strategy_version: "Q-Alpha v1"
    }
  ]);

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.logs[0]?.status, "held");
  assert.equal(result.dashboard.latestRun?.status, "held");
  assert.deepEqual(result.logs[0]?.riskResult.reasons, ["AI 最终选择 HOLD，观望/持有，不需要下单。"]);
});

test("public data explains legacy combined sell limit risk reasons", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb([
    {
      id: "run-sell-limit",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "blocked",
      trigger: "cron",
      market_view: "neutral",
      risk_level: "medium",
      summary: "旧版卖出风控拦截",
      candidates_json: "[]",
      selected_action_json: JSON.stringify({
        symbol: "sh600703",
        action: "sell",
        shares: 1000,
        priority: 1,
        confidence: 0.68,
        reason: "分批止盈"
      }),
      risk_result_json: JSON.stringify({
        allowed: false,
        reasons: ["卖出数量超过可卖数量或触发 T+1 限制。"]
      }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: null,
      after_snapshot_json: null,
      account_scope: "quant-v1",
      strategy_version: "Q-Alpha v1"
    }
  ]);

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.logs[0]?.status, "blocked");
  assert.deepEqual(result.logs[0]?.riskResult.reasons, [
    "旧版 Runner 将“超出可卖数量”和“T+1”合并提示；新版本已拆分，后续会显示具体原因。"
  ]);
});

test("public data presents AI provider timeout failures as no-decision runs", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb([
    {
      id: "run-ai-timeout",
      started_at: updatedAt,
      finished_at: updatedAt,
      status: "failed",
      trigger: "cron",
      market_view: null,
      risk_level: null,
      summary: "Runner 执行失败。",
      candidates_json: "[]",
      selected_action_json: null,
      risk_result_json: JSON.stringify({ allowed: false, reasons: [] }),
      order_result_json: null,
      before_state_json: null,
      decision_trace_json: null,
      after_snapshot_json: null,
      error_message: "AI provider returned 524",
      account_scope: "quant-v1",
      strategy_version: "Q-Alpha v1"
    } as SignalArenaRunRow & { error_message: string }
  ]);

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.equal(result.logs[0]?.status, "failed");
  assert.equal(result.logs[0]?.summary, "AI 服务响应超时，本轮未生成交易决策。");
  assert.deepEqual(result.logs[0]?.riskResult.reasons, ["AI 服务响应超时，本轮未提交订单。"]);
  assert.equal(result.dashboard.latestRun?.summary, "AI 服务响应超时，本轮未生成交易决策。");
});

test("public data merges D1 snapshots and decision traces into equity history", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all:quant-v1": makeSnapshot(updatedAt, "live")
    })
  );
  env.SIGNAL_ARENA_DB = makeDb(
    [
      {
        id: "run-1",
        started_at: "2026-05-22T00:05:00.000Z",
        finished_at: "2026-05-22T00:06:00.000Z",
        status: "executed",
        trigger: "cron",
        market_view: "neutral",
        risk_level: "low",
        summary: "保持观察",
        candidates_json: "[]",
        selected_action_json: null,
        risk_result_json: JSON.stringify({ allowed: true, reasons: [] }),
        order_result_json: JSON.stringify({ status: "held", message: "no order", orderId: "private-order" }),
        before_state_json: JSON.stringify({ totalAssets: 1200000, cash: 300000, returnRate: 0.2, currentRank: 2, holdingsCount: 1 }),
        decision_trace_json: JSON.stringify({
          beforeStateSummary: "现金充足，仓位适中。",
          decisionRoute: ["检查现金"],
          marketAssessment: ["涨幅榜未形成明确主线"],
          portfolioAssessment: ["持仓未触发止损"],
          signalContext: [
            {
              symbol: "sz000858",
              name: "五粮液",
              signalType: "pullback_entry",
              suggestedAction: "buy",
              confidence: 0.62,
              risk: "medium",
              changeRate: 0.036,
              price: 128,
              reason: "温和走强，纳入小仓位候选。"
            }
          ],
          rejectedActions: [],
          publicExplanation: "继续观察。",
          privateThought: "hidden"
        }),
        after_snapshot_json: JSON.stringify({ totalAssets: 1200000, cash: 300000, returnRate: 0.2, currentRank: 2, holdingsCount: 1 }),
        account_scope: "quant-v1",
        strategy_version: "Q-Alpha v1"
      }
    ],
    [
      {
        id: "snapshot-1",
        run_id: "run-1",
        created_at: "2026-05-22T00:06:00.000Z",
        source_status: "live",
        dashboard_json: JSON.stringify({
          totalAssets: 1200000,
          cash: 300000,
          returnRate: 0.2,
          currentRank: 2
        }),
        rank_json: "{}",
        account_scope: "quant-v1",
        strategy_version: "Q-Alpha v1"
      }
    ]
  );

  globalThis.fetch = async () => {
    throw new Error("unexpected upstream call");
  };

  const result = await getPublicData(env);

  assert.ok(Array.isArray(result.equityHistory));
  assert.equal(result.equityHistory[0]?.runId, "run-1");
  assert.equal(result.equityHistory[0]?.totalAssets, 1200000);
  assert.equal(result.logs[0]?.decisionTrace?.decisionRoute[0], "检查现金");
  assert.equal(result.logs[0]?.decisionTrace?.signalContext[0]?.signalType, "pullback_entry");
  assert.equal(result.logs[0]?.decisionTrace?.signalContext[0]?.suggestedAction, "buy");
  assert.equal(JSON.stringify(result).includes("private-order"), false);
  assert.equal(JSON.stringify(result).includes("privateThought"), false);
});

test("stale cache is returned when upstream fails", async () => {
  const cached = makeSnapshot(new Date(Date.now() - 10 * 60 * 1000).toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all:quant-v1": cached }));

  globalThis.fetch = async () => {
    throw new Error("upstream down");
  };

  const result = await getPublicData(env);

  assert.equal(result.dashboard.sourceStatus, "stale");
  assert.equal(result.dashboard.updatedAt, cached.dashboard.updatedAt);
});

test("public endpoint returns quant fallback when no cache and upstream fails", async () => {
  const env = makeEnv(makeKv());

  globalThis.fetch = async () => {
    throw new Error("upstream down");
  };

  const response = await worker.fetch(new Request("https://maysssss.cn/api/public/all"), env);
  const body = (await response.json()) as WorkerSnapshot;

  assert.equal(response.status, 200);
  assert.equal(body.dashboard.sourceStatus, "fallback");
  assert.equal(body.account.scope, "quant-v1");
  assert.equal(body.strategy.version, "Q-Alpha v1");
  assert.equal(body.operations.tone, "attention");
  assert.equal(body.operations.latestRunSummary, "Signal Arena 上游暂不可用，等待 Quant Lab 首次同步。");
});

test("public endpoint explains invalid Agent World key without leaking secrets", async () => {
  const env = makeEnv(makeKv());

  globalThis.fetch = async () => jsonResponse({
    success: false,
    error: "unauthorized",
    message: "缺少或无效的 Agent Auth 凭证",
    hint: "API Key 无效或已过期。"
  }, 401);

  const response = await worker.fetch(new Request("https://maysssss.cn/api/public/all"), env);
  const body = (await response.json()) as WorkerSnapshot;
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(body.dashboard.sourceStatus, "fallback");
  assert.equal(body.operations.latestRunSummary, "Signal Arena Agent World key 无效或已过期，等待更新有效量化账号 key 后同步。");
  assert.equal(serialized.includes(env.SIGNAL_ARENA_AGENT_API_KEY), false);
  assert.equal(serialized.includes("agent-world-"), false);
});

test("upstream refresh stays public and keeps private fields out", async () => {
  const env = makeEnv(makeKv());
  const currentDate = new Date().toISOString();
  const calls: Array<{ pathname: string; headers: Headers }> = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    calls.push({
      pathname: url.pathname,
      headers: new Headers(init?.headers ?? (typeof input !== "string" && !(input instanceof URL) ? input.headers : undefined))
    });

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          agent: {
            id: "agent-123",
            username: "me"
          },
          joined: true,
          portfolio: {
            cash: 300000,
            total_value: 1200000,
            return_rate: 0.2,
            total_fees: 0
          },
          rank: 2,
          total_participants: 3000,
          pending_orders: 0,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: {
            cash: 300000,
            holdings_value: 900000,
            total_value: 1200000,
            total_invested: 1000000,
            return_rate: 0.2,
            total_fees: 0
          },
          holdings: [
            {
              symbol: "sh600519",
              name: "贵州茅台",
              market: "CN",
              shares: 100,
              avg_cost: 1200,
              current_price: 1300,
              market_value: 130000,
              profit_loss: 10000,
              profit_rate: 0.0833
            }
          ]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({
        success: true,
        data: {
          trades: [
            {
              id: "trade-1",
              order_id: "private-order",
              symbol: "sh600519",
              name: "贵州茅台",
              market: "CN",
              action: "buy",
              shares: 100,
              price: 1300,
              total_amount: 130000,
              commission: 32.5,
              stamp_tax: 0,
              total_fees: 32.5,
              status: "filled",
              note: { reason: "滚动买入", orderId: "private-order" },
              submitted_at: "2026-05-22T00:00:00.000Z",
              executed_at: "2026-05-22T00:15:00.000Z"
            }
          ]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/leaderboard") {
      return jsonResponse({
        success: true,
        data: {
          leaderboard: [
            {
              rank: 1,
              agent: { id: "agent-alpha", username: "alpha", nickname: "Alpha", avatar_url: "private-url" },
              total_value: 1300000,
              total_invested: 1000000,
              return_rate: 0.3
            },
            {
              rank: 2,
              agent: { id: "agent-123", username: "me", nickname: "Me", avatar_url: "private-url" },
              total_value: 1200000,
              total_invested: 1000000,
              return_rate: 0.2
            }
          ]
        }
      });
    }

    throw new Error(`unexpected endpoint ${url.pathname}`);
  };

  const result = await getPublicData(env);
  const bodyText = JSON.stringify(result);

  assert.equal(result.dashboard.sourceStatus, "live");
  assert.equal(result.dashboard.totalAssets, 1200000);
  assert.equal(result.dashboard.cash, 300000);
  assert.equal(result.dashboard.cnHoldings[0]?.costPrice, 1200);
  assert.equal(result.dashboard.cnHoldings[0]?.profit, 10000);
  assert.equal(result.rank.currentRank, 2);
  assert.equal(result.rank.leaders[0]?.totalAssets, 1300000);
  assert.equal(result.rank.leaders[0]?.nickname, "Alpha");
  assert.equal(result.rank.leaders.find((entry) => entry.rank === 2)?.isCurrentAgent, true);
  assert.equal(result.recentTrades[0]?.symbol, "sh600519");
  assert.equal(result.recentTrades[0]?.reason, "滚动买入");
  assert.equal(bodyText.includes("agent-123"), false);
  assert.equal(bodyText.includes("private-url"), false);
  assert.equal(bodyText.includes("order_id"), false);
  assert.equal(calls.map((call) => call.pathname).join(","), "/api/v1/arena/home,/api/v1/arena/portfolio,/api/v1/arena/trades,/api/v1/arena/leaderboard");
  assert.equal(calls[0].headers.get("agent-auth-api-key"), "agent-secret");
  assert.equal(calls[0].headers.get("Content-Type"), "application/json");
  assert.ok(result.dashboard.updatedAt >= currentDate);
});

test("upstream refresh tolerates wrapped list payloads", async () => {
  const env = makeEnv(makeKv());
  env.SIGNAL_ARENA_DB = makeDb();

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          agent_id: "agent-123",
          initial_capital: 1000000,
          total_assets: 1200000,
          cash: 300000,
          return_rate: 0.2,
          rank: 2
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: {
            cash: 300000,
            total_value: 1200000,
            total_invested: 1000000,
            return_rate: 0.2
          },
          holdings: {
            items: [
              {
                symbol: "sh600519",
                name: "贵州茅台",
                shares: 100,
                avg_cost: 1200,
                current_price: 1300,
                market_value: 130000,
                profit_loss: 10000,
                profit_rate: 0.0833
              }
            ]
          }
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({
        success: true,
        data: {
          trades: {
            records: [
              {
                symbol: "sh600519",
                action: "buy",
                shares: 100,
                status: "filled",
                note: { reason: "包装交易记录" },
                submitted_at: "2026-05-22T00:00:00.000Z"
              }
            ]
          }
        }
      });
    }

    if (url.pathname === "/api/v1/arena/leaderboard") {
      return jsonResponse({
        success: true,
        data: {
          leaderboard: {
            records: [
              {
                rank: 1,
                nickname: "Alpha",
                total_value: 1300000,
                return_rate: 0.3
              },
              {
                rank: 2,
                agent_id: "agent-123",
                nickname: "Me",
                total_value: 1200000,
                return_rate: 0.2
              }
            ]
          }
        }
      });
    }

    throw new Error(`unexpected endpoint ${url.pathname}`);
  };

  const result = await getPublicData(env);

  assert.equal(result.dashboard.sourceStatus, "live");
  assert.equal(result.dashboard.cnHoldings[0]?.symbol, "sh600519");
  assert.equal(result.dashboard.cnHoldings[0]?.market, "CN");
  assert.equal(result.dashboard.marketSummaries.find((market) => market.market === "CN")?.holdingsCount, 1);
  assert.equal(result.rank.leaders[0]?.nickname, "Alpha");
  assert.equal(result.rank.leaders.find((entry) => entry.rank === 2)?.isCurrentAgent, true);
  assert.equal(result.recentTrades[0]?.reason, "包装交易记录");
});

test("trade client sends the expected endpoint and auth header", async () => {
  const env = makeEnv();
  const calls: Array<{ pathname: string; headers: Headers }> = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    calls.push({
      pathname: url.pathname,
      headers: new Headers(init?.headers ?? (typeof input !== "string" && !(input instanceof URL) ? input.headers : undefined))
    });

    return jsonResponse({ success: true, data: { trades: [] } });
  };

  await fetchArenaTrades(env);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].pathname, "/api/v1/arena/trades");
  assert.equal(calls[0].headers.get("agent-auth-api-key"), "agent-secret");
  assert.equal(calls[0].headers.get("Content-Type"), "application/json");
});
