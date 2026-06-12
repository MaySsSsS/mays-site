import type { AiCandidateAction, AiDecision, RiskContext, RiskSelection } from "./types";

const A_SHARE_PATTERN = /^(sh|sz)\d{6}$/;
const MAX_POSITION_RATE = 0.2;
const MIN_CASH_RATE = 0.2;

function validateAction(action: AiCandidateAction, context: RiskContext): string[] {
  const reasons: string[] = [];

  if (!context.isTradingSession) {
    reasons.push("当前不是 A 股交易时段。");
  }

  if (!A_SHARE_PATTERN.test(action.symbol)) {
    reasons.push("第一版只允许 A 股代码。");
  }

  if (action.action === "hold") {
    return ["AI 最终选择 HOLD，观望/持有，不需要下单。"];
  }

  if (action.shares <= 0 || action.shares % 100 !== 0) {
    reasons.push("A 股交易股数必须是 100 的整数倍。");
  }

  const price = context.prices[action.symbol] ?? 0;
  const holding = context.holdings[action.symbol];

  if (action.action === "buy") {
    const estimatedCost = price * action.shares;
    const remainingCash = context.cash - estimatedCost;
    const targetPositionRate = ((holding?.marketValue ?? 0) + estimatedCost) / context.totalAssets;

    if (estimatedCost > context.cash) {
      reasons.push("可用现金不足。");
    }

    if (remainingCash / context.totalAssets < MIN_CASH_RATE) {
      reasons.push("买入后现金储备会低于 20%。");
    }

    if (targetPositionRate > MAX_POSITION_RATE) {
      reasons.push("单只股票目标仓位会超过 20%。");
    }
  }

  if (action.action === "sell") {
    if (!holding) {
      reasons.push("当前没有可卖持仓。");
    } else {
      if (holding.availableShares <= 0) {
        reasons.push("当前持仓暂无可卖数量，可能触发 T+1 限制。");
      } else if (action.shares > holding.availableShares) {
        reasons.push(`卖出数量超过可卖数量，当前最多可卖 ${holding.availableShares} 股。`);
      }
    }
  }

  if (!action.reason.trim()) {
    reasons.push("交易理由为空。");
  }

  return reasons;
}

export function selectExecutableAction(decision: AiDecision, context: RiskContext): RiskSelection {
  const action = decision.final_action;

  if (!action) {
    return {
      allowed: false,
      reasons: ["AI 最终选择观望，未提交交易动作。"],
      selectedAction: null
    };
  }

  const reasons = validateAction(action, context);
  if (reasons.length === 0) {
    return {
      allowed: true,
      reasons: [],
      selectedAction: action
    };
  }

  return {
    allowed: false,
    reasons,
    selectedAction: action
  };
}
