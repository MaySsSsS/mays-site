import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { Q_ALPHA_STRATEGY_VERSION } from "./q-alpha-v1";
import { runSignalArenaTrader } from "./runner";
import type { Env } from "./types";

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
    async get(key: string, type?: "json") {
      const value = store.get(key);
      if (value === undefined) {
        return null;
      }

      return type === "json" ? JSON.parse(value) : value;
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
    SIGNAL_ARENA_ACCOUNT_SCOPE: "quant-v1",
    SIGNAL_ARENA_STRATEGY_VERSION: Q_ALPHA_STRATEGY_VERSION,
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

function trendBars(count = 80, start = 20, step = 0.35) {
  return Array.from({ length: count }, (_, index) => {
    const close = start + index * step;
    return {
      date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close - 0.2,
      high: close + 0.3,
      low: close - 0.3,
      close,
      volume: 100000 + index * 1200
    };
  });
}

function fallingBars(count = 80) {
  return Array.from({ length: count }, (_, index) => {
    const close = 80 - index * 0.5;
    return {
      date: `2026-02-${String((index % 28) + 1).padStart(2, "0")}`,
      open: close + 0.2,
      high: close + 0.3,
      low: close - 0.4,
      close,
      volume: 100000
    };
  });
}

function baseFetch(options: {
  holdings?: unknown[];
  topMovers?: unknown;
  stockUniverse?: unknown[];
  histories?: Record<string, unknown[]>;
  trades?: unknown[];
}) {
  return async (input: RequestInfo | URL) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);

    if (url.origin === "https://ai.example") {
      throw new Error("Quant Lab runner must not call AI provider");
    }

    if (url.pathname === "/api/v1/arena/home") {
      return jsonResponse({
        success: true,
        data: {
          initial_capital: 1000000,
          total_assets: 1000000,
          cash: 600000,
          return_rate: 0,
          rank: 8,
          market_status: "open"
        }
      });
    }

    if (url.pathname === "/api/v1/arena/portfolio") {
      return jsonResponse({
        success: true,
        data: {
          portfolio: { cash: 600000, total_value: 1000000, return_rate: 0 },
          holdings: options.holdings ?? []
        }
      });
    }

    if (url.pathname === "/api/v1/arena/trades") {
      return jsonResponse({ success: true, data: { trades: options.trades ?? [] } });
    }

    if (url.pathname === "/api/v1/arena/top-movers") {
      return jsonResponse({ success: true, data: options.topMovers ?? { movers: [] } });
    }

    if (url.pathname === "/api/v1/arena/snapshots") {
      return jsonResponse({ success: true, data: { snapshots: [] } });
    }

    if (url.pathname === "/api/v1/arena/stocks-list") {
      return jsonResponse({ success: true, data: { stocks: options.stockUniverse ?? [] } });
    }

    if (url.pathname === "/api/v1/arena/stock-history") {
      const symbol = url.searchParams.get("symbol") ?? "";
      return jsonResponse({ success: true, data: { symbol, history: options.histories?.[symbol] ?? [] } });
    }

    if (url.pathname === "/api/v1/arena/trade") {
      return jsonResponse({ success: true, data: { status: "pending", message: "accepted" } });
    }

    throw new Error(`unexpected endpoint ${url.href}`);
  };
}

test("runSignalArenaTrader persists Q-Alpha strategy trace and an equity snapshot", async () => {
  const originalFetch = globalThis.fetch;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const fetchPaths: string[] = [];

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    fetchPaths.push(url.pathname);
    return baseFetch({
      topMovers: { movers: [{ symbol: "sh600519", name: "贵州茅台", market: "CN", change_rate: 0.03, price: 48 }] },
      stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
      histories: { sh600519: trendBars() }
    })(input);
  };

  try {
    const result = await runSignalArenaTrader(env, {
      trigger: "manual",
      dryRun: true,
      now: new Date("2026-06-12T02:00:00.000Z")
    });
    const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));
    const snapshotInsert = statements.find((statement) => statement.sql.includes("signal_arena_snapshots"));

    assert.equal(result.status, "held");
    assert.equal(fetchPaths.includes("/api/v1/arena/stocks-list"), true);
    assert.equal(fetchPaths.includes("/api/v1/arena/stock-history"), true);
    assert.equal(fetchPaths.includes("/api/v1/arena/trade"), false);
    assert.ok(runInsert?.values.some((value) => value === "quant-v1"));
    assert.ok(runInsert?.values.some((value) => value === Q_ALPHA_STRATEGY_VERSION));
    assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("candidateRanking")));
    assert.ok(snapshotInsert?.values.some((value) => typeof value === "string" && value.includes("totalAssets")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader limits stock-history requests to 24 symbols", async () => {
  const originalFetch = globalThis.fetch;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const stockUniverse = Array.from({ length: 40 }, (_, index) => ({
    symbol: `sh600${String(index).padStart(3, "0")}`,
    name: `测试${index}`,
    market: "CN"
  }));
  const histories = Object.fromEntries(stockUniverse.map((stock) => [stock.symbol, trendBars()]));
  let historyCalls = 0;

  globalThis.fetch = async (input) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    if (url.pathname === "/api/v1/arena/stock-history") {
      historyCalls += 1;
    }
    return baseFetch({ stockUniverse, histories })(input);
  };

  try {
    await runSignalArenaTrader(env, {
      trigger: "manual",
      dryRun: true,
      now: new Date("2026-06-12T02:00:00.000Z")
    });

    assert.equal(historyCalls, 24);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader sells stop-loss holdings when dryRun is false", async () => {
  const originalFetch = globalThis.fetch;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const tradeBodies: unknown[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    if (url.pathname === "/api/v1/arena/trade") {
      tradeBodies.push(JSON.parse(String(init?.body ?? "{}")));
    }
    return baseFetch({
      holdings: [
        {
          symbol: "sh600703",
          name: "三安光电",
          market: "CN",
          shares: 1000,
          available_shares: 1000,
          current_price: 20,
          market_value: 20000,
          profit_rate: -0.09
        }
      ],
      stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
      histories: { sh600703: fallingBars(), sh600519: trendBars() }
    })(input);
  };

  try {
    const result = await runSignalArenaTrader(env, {
      trigger: "manual",
      dryRun: false,
      now: new Date("2026-06-12T02:00:00.000Z")
    });
    const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

    assert.equal(result.status, "executed");
    assert.deepEqual(tradeBodies[0], {
      symbol: "sh600703",
      action: "sell",
      shares: 1000,
      reason: "止损触发：持仓收益率 -9.00% <= -8%。"
    });
    assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("止损触发")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader uses candidate history prices for buy-side risk checks", async () => {
  const originalFetch = globalThis.fetch;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));
  const tradeBodies: unknown[] = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input.toString()) : new URL(input.url);
    if (url.pathname === "/api/v1/arena/trade") {
      tradeBodies.push(JSON.parse(String(init?.body ?? "{}")));
    }
    return baseFetch({
      topMovers: { movers: [{ symbol: "sh600519", name: "贵州茅台", market: "CN", change_rate: 0.03, price: 48 }] },
      stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
      histories: { sh600519: trendBars() }
    })(input);
  };

  try {
    const result = await runSignalArenaTrader(env, {
      trigger: "manual",
      dryRun: false,
      now: new Date("2026-06-12T02:00:00.000Z")
    });

    assert.equal(result.status, "executed");
    assert.deepEqual(tradeBodies[0], {
      symbol: "sh600519",
      action: "buy",
      shares: 2500,
      reason: "策略分 83 达到买入阈值，趋势结构向上、5/10/20 日动量共振、接近或突破 20 日高点、量能确认未失真、组合仓位允许新增或调整。"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader records T+1 unavailable shares as a strategy rejection", async () => {
  const originalFetch = globalThis.fetch;
  const statements: Array<{ sql: string; values: unknown[] }> = [];
  const env = makeEnv(makeDb(statements));

  globalThis.fetch = baseFetch({
    holdings: [
      {
        symbol: "sh600703",
        name: "三安光电",
        market: "CN",
        shares: 1000,
        available_shares: 0,
        current_price: 20,
        market_value: 20000,
        profit_rate: -0.09
      }
    ],
    stockUniverse: [{ symbol: "sh600519", name: "贵州茅台", market: "CN" }],
    histories: { sh600703: fallingBars(), sh600519: trendBars() }
  });

  try {
    const result = await runSignalArenaTrader(env, {
      trigger: "manual",
      dryRun: true,
      now: new Date("2026-06-12T02:00:00.000Z")
    });
    const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

    assert.equal(result.status, "held");
    assert.ok(runInsert?.values.some((value) => typeof value === "string" && value.includes("暂无可卖数量")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader skips unsafe A-share boundary windows without upstream calls", async () => {
  const originalFetch = globalThis.fetch;
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

  try {
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runSignalArenaTrader skips when upstream marks the market closed", async () => {
  const originalFetch = globalThis.fetch;
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

  try {
    const result = await runSignalArenaTrader(env, {
      trigger: "cron",
      dryRun: false,
      now: new Date("2026-05-25T02:00:00.000Z")
    });
    const runInsert = statements.find((statement) => statement.sql.includes("signal_arena_runs"));

    assert.equal(result.status, "skipped");
    assert.deepEqual(fetchPaths, ["/api/v1/arena/home"]);
    assert.ok(runInsert?.values.some((item) => item === "closed"));
    assert.ok(runInsert?.values.some((item) => item === "上游显示 A 股当前未开盘，Q-Alpha v1 本轮跳过。"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cron schedule only targets buffered A-share execution windows", () => {
  const config = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../wrangler.toml"), "utf8");

  assert.match(config, /"35,50 1 \* \* 1-5"/);
  assert.match(config, /"5,20,35,50 2,5,6 \* \* 1-5"/);
  assert.match(config, /"5,20 3 \* \* 1-5"/);
  assert.doesNotMatch(config, /"\*\/15 1-7 \* \* 1-5"/);
});
