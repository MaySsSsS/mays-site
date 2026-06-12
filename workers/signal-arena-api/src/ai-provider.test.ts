import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { requestLightDecision } from "./ai-provider";
import type { Env } from "./types";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function makeEnv(): Env {
  return {
    SIGNAL_ARENA_DB: {} as D1Database,
    SIGNAL_ARENA_KV: {} as KVNamespace,
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

function decisionText(): string {
  return JSON.stringify({
    market_view: "neutral",
    risk_level: "low",
    summary: "继续观察",
    before_state_summary: "现金充足。",
    decision_route: ["读取行情", "保持观察"],
    market_assessment: ["市场信号不足。"],
    portfolio_assessment: ["仓位可控。"],
    candidates: [],
    rejected_actions: [],
    final_action: null,
    cash_plan: "保留现金。",
    watchlist: ["sh600519"],
    public_explanation: "本轮不提交订单。"
  });
}

test("requestLightDecision parses Responses API event streams", async () => {
  globalThis.fetch = async () => {
    const text = decisionText();
    const midpoint = Math.floor(text.length / 2);
    const stream = [
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: text.slice(0, midpoint) })}`,
      "",
      `data: ${JSON.stringify({ type: "response.output_text.delta", delta: text.slice(midpoint) })}`,
      "",
      "data: [DONE]",
      ""
    ].join("\n");

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream"
      }
    });
  };

  const result = await requestLightDecision(makeEnv(), { system: "system", user: "user" });

  assert.equal(result.summary, "继续观察");
  assert.equal(result.final_action, null);
  assert.deepEqual(result.watchlist, ["sh600519"]);
});
