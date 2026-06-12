export type PublicRunnerError = {
  summary: string;
  riskReasons: string[];
};

export function publicRunnerErrorFor(message: string | null): PublicRunnerError | null {
  if (message?.includes("Responses API returned no text output")) {
    return {
      summary: "AI 未返回有效决策内容，本轮未生成交易决策。",
      riskReasons: ["AI 未返回有效决策内容，本轮未提交订单。"]
    };
  }

  if (message?.includes("Responses API returned invalid JSON") || message?.includes("is not valid JSON")) {
    return {
      summary: "AI 返回格式暂不可用，本轮未生成交易决策。",
      riskReasons: ["AI 返回格式暂不可用，本轮未提交订单。"]
    };
  }

  if (message?.includes("AI provider returned 502") || message?.includes("AI provider returned 503")) {
    return {
      summary: "AI 服务暂时不可用，本轮未生成交易决策。",
      riskReasons: ["AI 服务暂时不可用，本轮未提交订单。"]
    };
  }

  if (message?.includes("AI provider returned 524")) {
    return {
      summary: "AI 服务响应超时，本轮未生成交易决策。",
      riskReasons: ["AI 服务响应超时，本轮未提交订单。"]
    };
  }

  if (message?.includes("Signal Arena request failed: 504")) {
    return {
      summary: "行情/交易上游响应超时，本轮未生成交易决策。",
      riskReasons: ["行情/交易上游响应超时，本轮未提交订单。"]
    };
  }

  return null;
}
