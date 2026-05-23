import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { runSignalArenaTrader } from "./runner";
import type { Env } from "./types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function makeKv(): KVNamespace {
  const store = new Map<string, string>();

  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    }
  } as unknown as KVNamespace;
}

function makeDb(statements: Array<{ sql: string; values: unknown[] }>): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              statements.push({ sql, values });
            },
            async all<T>() {
              return { results: [] as T[] };
            }
          };
        }
      };
    }
  } as unknown as D1Database;
}

function makeEnv(db: D1Database): Env {
  return {
    SIGNAL_ARENA_DB: db,
    SIGNAL_ARENA_KV: makeKv(),
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

test("runSignalArenaTrader persists decision trace and an equity snapshot", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const fetchPaths: string[] = [];

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    fetchPaths.push(url.pathname);

    if (url.origin === "https://ai.example") {
      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "low",
          summary: "低仓位试探买入",
          before_state_summary: "现金充足，持仓集中度低。",
          decision_route: ["检查现金", "检查涨幅榜", "选择小仓位试探"],
          market_assessment: ["A 股交易时段内，涨幅榜有可观察标的。"],
          portfolio_assessment: ["现有仓位较低，现金缓冲充足。"],
          candidates: [
            {
              symbol: "sh600519",
              action: "buy",
              shares: 100,
              priority: 1,
              confidence: 0.76,
              reason: "趋势和仓位约束允许小仓位试探。"
            }
          ],
          rejected_actions: [],
          final_action: {
            symbol: "sh600519",
            action: "buy",
            shares: 100,
            priority: 1,
            confidence: 0.76,
            reason: "趋势和仓位约束允许小仓位试探。"
          },
          cash_plan: "保留大部分现金。",
          watchlist: ["sh600519"],
          public_explanation: "选择小仓位试探，同时保留现金缓冲。"
        })
      });
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1200000,
          cash: 500000,
          return_rate: 0.2,
          rank: 8
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { cash: 500000, total_value: 1200000, return_rate: 0.2 },
          holdings: [
            {
              symbol: "sh600519",
              name: "贵州茅台",
              market: "CN",
              shares: 100,
              available_shares: 100,
              avg_cost: 450,
              current_price: 500,
              market_value: 50000,
              profit_rate: 0.0833
            }
          ]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({ success: true, data: { trades: [] } });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({
        success: true,
        data: {
          movers: [{ symbol: "sh600519", name: "贵州茅台", change_rate: 0.035 }]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({
        success: true,
        data: {
          snapshots: [{ created_at: "2026-05-22T01:45:00.000Z", total_assets: 1190000, return_rate: 0.19, rank: 9 }]
        }
      });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "manual",
    dryRun: true,
    now: new Date("2026-05-22T02:00:00.000Z")
  });

  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));
  const snapshotInsert = statements.find((statement) => statement.sql.includes("signal_arena_snapshots"));

  assert.equal(result.status, "held");
  assert.ok(fetchPaths.includes("/api/v1/arena/top-movers"));
  assert.ok(fetchPaths.includes("/api/v1/arena/snapshots"));
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("decisionRoute")));
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("beforeStateSummary")));
  assert.ok(snapshotInsert?.values.some((value) => typeof value === "string" && value.includes("totalAssets")));
});
