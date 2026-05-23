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
    SIGNAL_ARENA_ADMIN_TOKEN: "admin-secret",
    SIGNAL_ARENA_AI_PROVIDER: "custom-responses",
    SIGNAL_ARENA_AI_BASE_URL: "https://ai.example",
    SIGNAL_ARENA_AI_API_KEY: "ai-secret",
    SIGNAL_ARENA_AI_STRICT_MODEL: "gpt-5.5",
    SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT: "xhigh",
    SIGNAL_ARENA_AI_LIGHT_MODEL: "gpt-5.4",
    SIGNAL_ARENA_AI_LIGHT_REASONING_EFFORT: "low",
    SIGNAL_ARENA_AI_DISABLE_RESPONSE_STORAGE: "true"
  };
}

function makeDb(rows: SignalArenaRunRow[] = [], snapshots: SignalArenaSnapshotRow[] = []): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return {
            async all<T>() {
              return {
                results: (sql.includes("signal_arena_snapshots") ? snapshots : rows) as T[]
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
    recentTrades: []
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
  const env = makeEnv(makeKv({ "public:all": cached }));
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
  const env = makeEnv(makeKv({ "public:all": cached }));

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
  const env = makeEnv(makeKv({ "public:all": cached }));

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
      "public:all": {
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
      "public:all": makeSnapshot(updatedAt, "live")
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
      after_snapshot_json: null
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

test("public data merges D1 snapshots and decision traces into equity history", async () => {
  const updatedAt = new Date().toISOString();
  const env = makeEnv(
    makeKv({
      "public:all": makeSnapshot(updatedAt, "live")
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
          rejectedActions: [],
          publicExplanation: "继续观察。",
          privateThought: "hidden"
        }),
        after_snapshot_json: JSON.stringify({ totalAssets: 1200000, cash: 300000, returnRate: 0.2, currentRank: 2, holdingsCount: 1 })
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
        rank_json: "{}"
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
  assert.equal(JSON.stringify(result).includes("private-order"), false);
  assert.equal(JSON.stringify(result).includes("privateThought"), false);
});

test("stale cache is returned when upstream fails", async () => {
  const cached = makeSnapshot(new Date(Date.now() - 10 * 60 * 1000).toISOString(), "live");
  const env = makeEnv(makeKv({ "public:all": cached }));

  globalThis.fetch = async () => {
    throw new Error("upstream down");
  };

  const result = await getPublicData(env);

  assert.equal(result.dashboard.sourceStatus, "stale");
  assert.equal(result.dashboard.updatedAt, cached.dashboard.updatedAt);
});

test("public endpoint returns generic 502 when no cache and upstream fails", async () => {
  const env = makeEnv(makeKv());

  globalThis.fetch = async () => {
    throw new Error("upstream down");
  };

  const response = await worker.fetch(new Request("https://maysssss.cn/api/public/all"), env);
  const body = (await response.json()) as { success: false; error: string; message: string };

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    success: false,
    error: "upstream_unavailable",
    message: "Signal Arena upstream unavailable."
  });
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
