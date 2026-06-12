import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
    SIGNAL_ARENA_AI_STRICT_MODEL: "gpt-5.4",
    SIGNAL_ARENA_AI_STRICT_REASONING_EFFORT: "high",
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

test("runSignalArenaTrader accepts grouped top movers payloads", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "low",
          summary: "分组涨幅榜也能正常决策",
          before_state_summary: "现金充足，等待信号。",
          decision_route: ["检查现金", "读取分组涨幅榜", "保持试探仓位"],
          market_assessment: ["A 股交易时段内，分组涨幅榜返回正常。"],
          portfolio_assessment: ["持仓较轻，允许继续观察。"],
          candidates: [],
          rejected_actions: [],
          final_action: null,
          cash_plan: "维持现金缓冲。",
          watchlist: ["sh600519"],
          public_explanation: "涨幅榜按市场分组返回时也应正常完成本轮判断。"
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
          holdings: []
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
          movers: {
            CN: [{ symbol: "sh600519", name: "贵州茅台", change_rate: 0.035, market: "CN" }],
            HK: [{ symbol: "hk00700", name: "腾讯控股", change_rate: 0.021, market: "HK" }]
          }
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

  assert.equal(result.status, "held");
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("分组涨幅榜")));
});

test("runSignalArenaTrader records hold decisions as held instead of blocked", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "cautious",
          risk_level: "medium",
          summary: "保持持有观察",
          before_state_summary: "现金充足，仓位分散。",
          decision_route: ["检查账户", "缺少明确买卖信号", "选择持有观察"],
          market_assessment: ["市场短线追高风险偏高。"],
          portfolio_assessment: ["现有持仓未触发止盈或止损。"],
          candidates: [
            {
              symbol: "sh600519",
              action: "hold",
              shares: 0,
              priority: 1,
              confidence: 0.7,
              reason: "缺少明确买卖信号，继续观察。"
            }
          ],
          rejected_actions: [],
          final_action: {
            symbol: "sh600519",
            action: "hold",
            shares: 0,
            priority: 1,
            confidence: 0.7,
            reason: "缺少明确买卖信号，继续观察。"
          },
          cash_plan: "保留现金。",
          watchlist: ["sh600519"],
          public_explanation: "AI 已完成判断，本轮选择持有观察，不提交订单。"
        })
      });
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1100000,
          cash: 900000,
          return_rate: 0.1,
          rank: 3200,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { total_value: 1100000, cash: 900000, return_rate: 0.1 },
          holdings: [
            {
              symbol: "sh600519",
              name: "贵州茅台",
              market: "CN",
              shares: 100,
              available_shares: 100,
              market_value: 140000,
              current_price: 1400,
              profit_rate: 0.08
            }
          ]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({ success: true, data: { trades: [] } });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({ success: true, data: { movers: [] } });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "manual",
    dryRun: false,
    now: new Date("2026-05-22T02:00:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));
  const riskResult = JSON.parse(String(runInsert?.values[11] ?? "{}")) as { reasons?: string[] };

  assert.equal(result.status, "held");
  assert.equal(runInsert?.values[3], "held");
  assert.equal(runInsert?.values[10], JSON.stringify({
    symbol: "sh600519",
    action: "hold",
    shares: 0,
    priority: 1,
    confidence: 0.7,
    reason: "缺少明确买卖信号，继续观察。"
  }));
  assert.deepEqual(riskResult.reasons, ["AI 最终选择 HOLD，观望/持有，不需要下单。"]);
});

test("runSignalArenaTrader skips unsafe A-share boundary windows without upstream calls", async () => {
  const unsafeTimes = [
    "2026-05-25T01:15:00.000Z",
    "2026-05-25T01:29:59.000Z",
    "2026-05-25T03:30:00.000Z",
    "2026-05-25T04:30:00.000Z",
    "2026-05-25T06:57:00.000Z",
    "2026-05-25T07:00:00.000Z"
  ];

  globalThis.fetch = async () => {
    throw new Error("unsafe windows must not call upstream APIs");
  };

  for (const value of unsafeTimes) {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const result = await runSignalArenaTrader(makeEnv(makeDb(statements)), {
      trigger: "cron",
      dryRun: false,
      now: new Date(value)
    });
    const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

    assert.equal(result.status, "skipped", value);
    assert.ok(runInsert?.values.some((item) => item === "closed"), value);
  }
});

test("runSignalArenaTrader skips when upstream marks the market closed", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const fetchPaths: string[] = [];

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    fetchPaths.push(url.pathname);

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          total_assets: 1000000,
          cash: 1000000,
          return_rate: 0,
          rank: 10,
          market_status: "closed"
        }
      });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "cron",
    dryRun: false,
    now: new Date("2026-05-25T02:00:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

  assert.equal(result.status, "skipped");
  assert.deepEqual(fetchPaths, ["/api/v1/arena/home"]);
  assert.ok(runInsert?.values.some((item) => item === "closed"));
  assert.ok(runInsert?.values.some((item) => item === "上游显示 A 股当前未开盘，本轮不调用 AI。"));
});

test("cron schedule only targets buffered A-share execution windows", () => {
  const config = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../wrangler.toml"), "utf8");

  assert.match(config, /"35,50 1 \* \* 1-5"/);
  assert.match(config, /"5,20,35,50 2,5,6 \* \* 1-5"/);
  assert.match(config, /"5,20 3 \* \* 1-5"/);
  assert.doesNotMatch(config, /"\*\/15 1-7 \* \* 1-5"/);
});

test("runSignalArenaTrader tolerates wrapped list payloads from upstream", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  let aiUserPrompt = "";

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body)) as {
        input?: Array<{ role: string; content: string }>;
      };
      aiUserPrompt = body.input?.find((item) => item.role === "user")?.content ?? "";

      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "low",
          summary: "包装列表也能完成决策",
          before_state_summary: "账户状态已从兼容列表读取。",
          decision_route: ["读取包装持仓", "读取包装交易", "读取包装快照", "继续试探"],
          market_assessment: ["涨幅榜被包装时仍应进入 prompt。"],
          portfolio_assessment: ["持仓被包装时仍应进入风控。"],
          candidates: [
            {
              symbol: "sh600519",
              action: "buy",
              shares: 100,
              priority: 1,
              confidence: 0.72,
              reason: "兼容列表读取正常，允许小仓位试探。"
            }
          ],
          rejected_actions: [],
          final_action: {
            symbol: "sh600519",
            action: "buy",
            shares: 100,
            priority: 1,
            confidence: 0.72,
            reason: "兼容列表读取正常，允许小仓位试探。"
          },
          cash_plan: "保留现金缓冲。",
          watchlist: ["sh600519"],
          public_explanation: "本轮验证包装列表形状可以正常完成。"
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
          holdings: {
            items: [
              {
                symbol: "sh600519",
                name: "贵州茅台",
                market: "CN",
                shares: 100,
                available_shares: 100,
                current_price: 500,
                market_value: 50000,
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
                note: { reason: "上游回补买入" },
                created_at: "2026-05-22T01:30:00.000Z"
              }
            ]
          }
        }
      });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({
        success: true,
        data: {
          top_movers: {
            CN: [{ symbol: "sh600519", name: "贵州茅台", change_rate: 0.035, market: "CN" }]
          }
        }
      });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({
        success: true,
        data: {
          snapshots: {
            records: [
              { captured_at: "2026-05-22T01:45:00.000Z", total_value: 1190000, return_rate: 0.19, current_rank: 9 }
            ]
          }
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

  assert.equal(result.status, "held");
  assert.ok(aiUserPrompt.includes("贵州茅台"));
  assert.ok(aiUserPrompt.includes("上游回补买入"));
  assert.ok(aiUserPrompt.includes("1190000"));
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("holdingsCount")));
});

test("runSignalArenaTrader sends generated signals to the AI prompt and public trace", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  let aiUserPrompt = "";

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body)) as {
        input?: Array<{ role: string; content: string }>;
      };
      aiUserPrompt = body.input?.find((item) => item.role === "user")?.content ?? "";

      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "medium",
          summary: "已参考前置信号完成判断",
          before_state_summary: "现金充足，仓位分散。",
          decision_route: ["读取前置信号", "检查追高风险", "选择观察"],
          market_assessment: ["前置信号包含 pullback_entry 和 momentum_watch。"],
          portfolio_assessment: ["持仓没有强制处理压力。"],
          candidates: [],
          rejected_actions: [],
          final_action: null,
          cash_plan: "等待更清晰买点。",
          watchlist: ["sz000858", "sh600183"],
          public_explanation: "信号已进入判断，但本轮仍保持观察。"
        })
      });
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1100000,
          cash: 820000,
          return_rate: 0.1,
          rank: 3000,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { total_value: 1100000, cash: 820000, return_rate: 0.1 },
          holdings: [
            {
              symbol: "sh600703",
              name: "三安光电",
              market: "CN",
              shares: 3000,
              available_shares: 3000,
              current_price: 16,
              market_value: 48000,
              profit_rate: 0.132
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
          movers: [
            { symbol: "sz000858", name: "五粮液", change_rate: 0.036, price: 128, market: "CN" },
            { symbol: "sh600183", name: "生益科技", change_rate: 0.099, price: 28, market: "CN" }
          ]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "manual",
    dryRun: true,
    now: new Date("2026-05-27T02:15:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

  assert.equal(result.status, "held");
  assert.match(aiUserPrompt, /pullback_entry/);
  assert.match(aiUserPrompt, /momentum_watch/);
  assert.doesNotMatch(aiUserPrompt, /"signals": \[\]/);
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("signalContext")));
});

test("runSignalArenaTrader falls back to the light model when strict AI times out", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const aiRequests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string; reasoning?: { effort?: string } };
      aiRequests.push(`${body.model ?? ""}:${body.reasoning?.effort ?? ""}`);

      if (body.reasoning?.effort === "high") {
        return jsonResponse({ error: "timeout" }, 524);
      }

      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "low",
          summary: "严格模型超时后使用轻量模型完成观望判断",
          before_state_summary: "现金充足，持仓集中度低。",
          decision_route: ["严格模型超时", "切换轻量模型", "保持观望"],
          market_assessment: ["A 股交易时段内，轻量模型完成了降级判断。"],
          portfolio_assessment: ["现有仓位较低，现金缓冲充足。"],
          candidates: [],
          rejected_actions: [],
          final_action: null,
          cash_plan: "维持现金缓冲。",
          watchlist: ["sh600519"],
          public_explanation: "严格模型超时后，轻量模型给出保守观望。"
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
          holdings: []
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
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "cron",
    dryRun: true,
    now: new Date("2026-05-27T05:20:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

  assert.equal(result.status, "held");
  assert.deepEqual(aiRequests, ["gpt-5.4:high", "gpt-5.4:low"]);
  assert.ok(runInsert?.values.some((value) => value === "held"));
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("轻量模型")));
});

test("runSignalArenaTrader falls back to the light model when strict AI returns no text", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const aiRequests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string; reasoning?: { effort?: string } };
      aiRequests.push(`${body.model ?? ""}:${body.reasoning?.effort ?? ""}`);

      if (body.reasoning?.effort === "high") {
        return jsonResponse({ output: [] });
      }

      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "cautious",
          risk_level: "medium",
          summary: "严格模型无文本输出后，轻量模型给出保守观望。",
          before_state_summary: "现金充足，等待信号。",
          decision_route: ["严格模型无文本输出", "切换轻量模型", "保持观望"],
          market_assessment: ["信号不足，不追高。"],
          portfolio_assessment: ["现金缓冲充足。"],
          candidates: [],
          rejected_actions: [],
          final_action: null,
          cash_plan: "维持现金缓冲。",
          watchlist: ["sh600519"],
          public_explanation: "轻量模型兜底后，本轮不下单。"
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
          rank: 8,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { cash: 500000, total_value: 1200000, return_rate: 0.2 },
          holdings: []
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({ success: true, data: { trades: [] } });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({ success: true, data: { movers: [] } });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "cron",
    dryRun: true,
    now: new Date("2026-05-27T05:20:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

  assert.equal(result.status, "held");
  assert.deepEqual(aiRequests, ["gpt-5.4:high", "gpt-5.4:low"]);
  assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("轻量模型")));
});

test("runSignalArenaTrader records AI provider timeouts with a public no-decision summary", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const aiRequests: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { model?: string; reasoning?: { effort?: string } };
      aiRequests.push(`${body.model ?? ""}:${body.reasoning?.effort ?? ""}`);
      return jsonResponse({ error: "timeout" }, 524);
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1200000,
          cash: 500000,
          return_rate: 0.2,
          rank: 8,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { cash: 500000, total_value: 1200000, return_rate: 0.2 },
          holdings: []
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({ success: true, data: { trades: [] } });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({ success: true, data: { movers: [] } });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "cron",
    dryRun: false,
    now: new Date("2026-05-28T06:50:00.000Z")
  });
  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));
  const riskResult = JSON.parse(String(runInsert?.values[11] ?? "{}")) as { reasons?: string[] };

  assert.equal(result.status, "failed");
  assert.deepEqual(aiRequests, ["gpt-5.4:high", "gpt-5.4:low"]);
  assert.equal(runInsert?.values[8], "AI 服务响应超时，本轮未生成交易决策。");
  assert.deepEqual(riskResult.reasons, ["AI 服务响应超时，本轮未提交订单。"]);
  assert.equal(runInsert?.values[16], "AI provider returned 524");
});

test("runSignalArenaTrader uses available shares for sell risk checks", async () => {
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { reasoning?: { effort?: string } };
      if (body.reasoning?.effort === "high") {
        return jsonResponse({
          output_text: JSON.stringify({
            market_view: "neutral",
            risk_level: "low",
            summary: "卖出测试",
            before_state_summary: "现金充足。",
            decision_route: ["检查持仓", "选择止盈卖出"],
            market_assessment: ["持仓已有浮盈。"],
            portfolio_assessment: ["可卖数量应按 availableShares 处理。"],
            candidates: [
              {
                symbol: "sh600703",
                action: "sell",
                shares: 100,
                priority: 1,
                confidence: 0.7,
                reason: "测试卖出"
              }
            ],
            rejected_actions: [],
            final_action: {
              symbol: "sh600703",
              action: "sell",
              shares: 100,
              priority: 1,
              confidence: 0.7,
              reason: "测试卖出"
            },
            cash_plan: "保留现金。",
            watchlist: ["sh600703"],
            public_explanation: "测试卖出路径。"
          })
        });
      }

      return jsonResponse({
        output_text: JSON.stringify({
          market_view: "neutral",
          risk_level: "low",
          summary: "fallback",
          before_state_summary: "fallback",
          decision_route: [],
          market_assessment: [],
          portfolio_assessment: [],
          candidates: [],
          rejected_actions: [],
          final_action: null,
          cash_plan: "",
          watchlist: [],
          public_explanation: ""
        })
      });
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1100000,
          cash: 900000,
          return_rate: 0.1,
          rank: 3000,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { total_value: 1100000, cash: 900000, return_rate: 0.1 },
          holdings: [
            {
              symbol: "sh600703",
              name: "三安光电",
              market: "CN",
              shares: 3000,
              current_price: 17,
              market_value: 51000,
              profit_rate: 0.13
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
          movers: [{ symbol: "sh600703", name: "三安光电", change_rate: 0.069, price: 17, market: "CN" }]
        }
      });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };

  const result = await runSignalArenaTrader(env, {
    trigger: "manual",
    dryRun: true,
    now: new Date("2026-05-27T05:50:00.000Z")
  });

  const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));
  const riskResult = JSON.parse(String(runInsert?.values[11] ?? "{}")) as { reasons?: string[] };

  assert.equal(result.status, "held");
  assert.deepEqual(riskResult.reasons, []);
});
