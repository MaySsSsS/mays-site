import assert from "node:assert/strict";
import { test } from "node:test";

import { publicRunnerErrorFor } from "./run-error";

test("publicRunnerErrorFor explains transient AI provider failures", () => {
  assert.deepEqual(publicRunnerErrorFor("AI provider returned 502"), {
    summary: "AI 服务暂时不可用，本轮未生成交易决策。",
    riskReasons: ["AI 服务暂时不可用，本轮未提交订单。"]
  });
  assert.deepEqual(publicRunnerErrorFor("Responses API returned no text output"), {
    summary: "AI 未返回有效决策内容，本轮未生成交易决策。",
    riskReasons: ["AI 未返回有效决策内容，本轮未提交订单。"]
  });
  assert.deepEqual(publicRunnerErrorFor("Unexpected token 'd', \"data: {\"id\"... is not valid JSON"), {
    summary: "AI 返回格式暂不可用，本轮未生成交易决策。",
    riskReasons: ["AI 返回格式暂不可用，本轮未提交订单。"]
  });
});

test("publicRunnerErrorFor explains upstream Signal Arena timeouts", () => {
  assert.deepEqual(publicRunnerErrorFor("Signal Arena request failed: 504"), {
    summary: "行情/交易上游响应超时，本轮未生成交易决策。",
    riskReasons: ["行情/交易上游响应超时，本轮未提交订单。"]
  });
});
