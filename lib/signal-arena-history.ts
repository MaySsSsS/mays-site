import type {
  SignalArenaEquityPoint,
  SignalArenaPublicData,
  SignalArenaRunLog,
  SignalArenaRunStatus
} from "@/types/signal-arena";

export type WorkBuddyHistoryRow = {
  created_at: number | string;
  result_success: number | string | boolean | null;
  runs_json: string | null;
};

export type SignalArenaHistoryMeta = {
  generatedAt: string;
  source: "workbuddy";
  automationId: string;
  totalRuns: number;
  importedRuns: number;
  equityPoints: number;
  startedAt: string | null;
  endedAt: string | null;
};

export type SignalArenaHistoryPayload = Pick<SignalArenaPublicData, "logs" | "equityHistory"> & {
  meta: SignalArenaHistoryMeta;
};

type ParsedHistoryRun = {
  log: SignalArenaRunLog;
  equityPoint: SignalArenaEquityPoint | null;
};

type ExtractedFields = {
  output: string;
  rank: number | null;
  totalAssets: number | null;
  returnRate: number | null;
  marketView: string;
  actionSummary: string;
  holdingsSummary: string;
  cash: number;
};

const DEFAULT_AUTOMATION_ID = "automation-7";
const SECRET_PATTERNS = [
  /agent-auth-api-key\s*[:=]\s*\S+/gi,
  /SIGNAL_ARENA_[A-Z_]*KEY\s*[:=]\s*\S+/g,
  /OPENAI_API_KEY\s*[:=]\s*\S+/g,
  /ZHIPU_API_KEY\s*[:=]\s*\S+/g,
  /\/Users\/[^/\s]+\/[^\s，。；、)）]+/g,
  /\/Volumes\/[^\s，。；、)）]+/g
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTimestamp(value: WorkBuddyHistoryRow["created_at"]): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function isSuccessful(value: WorkBuddyHistoryRow["result_success"]): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function firstLineValue(text: string, label: string): string {
  const pattern = new RegExp(`${label}[:：]\\s*([^\\n]+)`);
  return text.match(pattern)?.[1]?.trim() ?? "";
}

function parseRunsOutput(runsJson: string | null): string {
  if (!runsJson) {
    return "";
  }

  try {
    const runs = JSON.parse(runsJson) as unknown;
    if (!Array.isArray(runs)) {
      return "";
    }

    const latest = runs.findLast((item) => isRecord(item) && typeof item.output === "string");
    return isRecord(latest) && typeof latest.output === "string" ? latest.output : "";
  } catch {
    return "";
  }
}

function parseWanMoney(value: string): number | null {
  const wanMatch = value.match(/¥?\s*([+-]?\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) {
    return Math.round(Number(wanMatch[1]) * 10000);
  }

  const yuanMatch = value.match(/¥\s*([+-]?\d[\d,]*(?:\.\d+)?)/);
  if (yuanMatch) {
    return Math.round(Number(yuanMatch[1].replaceAll(",", "")));
  }

  return null;
}

function parseLabeledMoney(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const lineValue = firstLineValue(text, label);
    const parsed = lineValue ? parseWanMoney(lineValue) : null;
    if (parsed !== null) {
      return parsed;
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = text.match(new RegExp(`${escapedLabel}\\s*[:：]\\s*([^\\n]+)`, "i"));
    const inlineParsed = inlineMatch ? parseWanMoney(inlineMatch[1]) : null;
    if (inlineParsed !== null) {
      return inlineParsed;
    }
  }

  return null;
}

function parseLabeledPercent(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const lineValue = firstLineValue(text, label);
    const parsed = lineValue ? parsePercent(lineValue) : null;
    if (parsed !== null) {
      return parsed;
    }

    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = text.match(new RegExp(`${escapedLabel}\\s*[:：]\\s*([^\\n]+)`, "i"));
    const inlineParsed = inlineMatch ? parsePercent(inlineMatch[1]) : null;
    if (inlineParsed !== null) {
      return inlineParsed;
    }
  }

  return null;
}

function parsePercent(value: string): number | null {
  const match = value.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (!match) {
    return null;
  }

  return Number((Number(match[1]) / 100).toFixed(6));
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function parseRank(value: string): number | null {
  const match = value.match(/排名[:：]\s*(\d+|\?)\s*\/\s*\d+/);
  if (!match || match[1] === "?") {
    return null;
  }

  return Number(match[1]);
}

function parseStatus(actionSummary: string, successful: boolean): SignalArenaRunStatus {
  if (!successful) {
    return "failed";
  }

  if (/买入|卖出|止盈|止损|提交|pending/i.test(actionSummary)) {
    return "executed";
  }

  return "held";
}

function confidenceFor(fields: ExtractedFields): SignalArenaEquityPoint["confidence"] {
  if (fields.totalAssets !== null && fields.returnRate !== null && fields.rank !== null) {
    return "high";
  }

  if (fields.totalAssets !== null && fields.returnRate !== null) {
    return "medium";
  }

  return "low";
}

export function sanitizeHistoricalText(text: string): string {
  let sanitized = text;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[已清理]");
  }

  return sanitized
    .replace(/\*\*/g, "")
    .replace(/The API call timed out\.[^\n]*/gi, "")
    .replace(/Let me [^\n]*/gi, "")
    .replace(/Now I have [^\n]*/gi, "")
    .replace(/<[^>\n]{1,80}>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 12)
    .join("\n");
}

function buildPublicSummary(fields: ExtractedFields): string {
  const lines = [
    fields.totalAssets !== null ? `总资产: ${formatMoney(fields.totalAssets)}` : null,
    fields.returnRate !== null ? `收益率: ${formatPercent(fields.returnRate)}` : null,
    fields.rank !== null ? `排名: ${fields.rank}` : null,
    fields.cash > 0 ? `现金: ${formatMoney(fields.cash)}` : null,
    `市场状态: ${fields.marketView}`,
    `操作摘要: ${fields.actionSummary}`,
    `持仓摘要: ${fields.holdingsSummary}`,
    "来源: WorkBuddy 历史文本解析"
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

function extractFields(output: string): ExtractedFields {
  const cleanOutput = sanitizeHistoricalText(output);
  const marketView = firstLineValue(cleanOutput, "市场状态") || firstLineValue(cleanOutput, "市场") || "历史文本未包含市场状态";
  const actionSummary =
    firstLineValue(cleanOutput, "今日操作") || firstLineValue(cleanOutput, "操作") || "历史文本未包含操作摘要";
  const holdingsSummary = firstLineValue(cleanOutput, "持仓") || "历史文本未包含持仓摘要";
  const cash = parseWanMoney(firstLineValue(cleanOutput, "现金")) ?? 0;

  return {
    output: cleanOutput,
    rank: parseRank(cleanOutput),
    totalAssets: parseLabeledMoney(cleanOutput, ["总值", "Total value"]),
    returnRate: parseLabeledPercent(cleanOutput, ["收益率", "Return rate"]),
    marketView,
    actionSummary,
    holdingsSummary,
    cash: cash || parseLabeledMoney(cleanOutput, ["现金", "Cash"]) || 0
  };
}

function buildLog(id: string, capturedAt: string, successful: boolean, fields: ExtractedFields): SignalArenaRunLog {
  const status = parseStatus(fields.actionSummary, successful);
  const confidence = confidenceFor(fields);
  const totalAssets = fields.totalAssets;
  const returnRate = fields.returnRate;
  const snapshot = totalAssets === null || returnRate === null
    ? null
    : {
        totalAssets,
        cash: fields.cash,
        returnRate,
        currentRank: fields.rank,
        holdingsCount: fields.holdingsSummary === "历史文本未包含持仓摘要" ? 0 : 1
      };
  const publicSummary = successful ? buildPublicSummary(fields) : "历史任务执行失败，未生成可用于收益曲线的公开快照。";

  return {
    id,
    startedAt: capturedAt,
    finishedAt: capturedAt,
    status,
    trigger: "cron",
    marketView: fields.marketView,
    riskLevel: "unknown",
    summary: successful ? fields.actionSummary : "历史任务执行失败",
    candidates: [],
    selectedAction: null,
    riskResult: {
      allowed: false,
      reasons: ["历史文本解析，不含程序风控结果"]
    },
    orderResult: {
      status: status === "executed" ? "historical_report" : null,
      message: successful ? "来自 WorkBuddy 历史文本，成交状态未做强确认。" : "历史任务失败。"
    },
    beforeState: snapshot,
    decisionTrace: {
      beforeStateSummary: snapshot
        ? `总资产 ${snapshot.totalAssets}，收益率 ${(snapshot.returnRate * 100).toFixed(2)}%，排名 ${fields.rank ?? "未同步"}。`
        : "历史文本未包含完整账户快照。",
      decisionRoute: ["读取 WorkBuddy 历史报告", "抽取公开字段", "以历史导入层展示"],
      marketAssessment: [fields.marketView],
      portfolioAssessment: [fields.holdingsSummary],
      signalContext: [],
      rejectedActions: [],
      publicExplanation: publicSummary
    },
    cashPlan: fields.cash > 0 ? `历史文本现金约 ${fields.cash}` : null,
    watchlist: [],
    afterSnapshot: snapshot,
    source: "imported",
    sourceLabel: "历史导入",
    confidence,
    rawSummary: publicSummary
  };
}

function buildEquityPoint(
  id: string,
  runId: string,
  capturedAt: string,
  fields: ExtractedFields,
  status: SignalArenaRunStatus
): SignalArenaEquityPoint | null {
  if (fields.totalAssets === null || fields.returnRate === null) {
    return null;
  }

  return {
    id: `${id}-equity`,
    runId,
    capturedAt,
    totalAssets: fields.totalAssets,
    returnRate: fields.returnRate,
    currentRank: fields.rank,
    status,
    actionSummary: fields.actionSummary,
    source: "imported",
    sourceLabel: "历史导入",
    confidence: confidenceFor(fields),
    rawSummary: buildPublicSummary(fields)
  };
}

export function parseWorkBuddyHistoryRun(row: WorkBuddyHistoryRow): ParsedHistoryRun {
  const timestamp = toTimestamp(row.created_at);
  const capturedAt = new Date(timestamp).toISOString();
  const id = `history-${timestamp || "unknown"}`;
  const successful = isSuccessful(row.result_success);
  const fields = extractFields(parseRunsOutput(row.runs_json));
  const log = buildLog(id, capturedAt, successful, fields);

  return {
    log,
    equityPoint: successful ? buildEquityPoint(id, log.id, capturedAt, fields, log.status) : null
  };
}

export function buildSignalArenaHistoryPayload(
  rows: WorkBuddyHistoryRow[],
  options: { automationId?: string; generatedAt?: string } = {}
): SignalArenaHistoryPayload {
  const parsedRuns = rows.map(parseWorkBuddyHistoryRun);
  const logs = parsedRuns
    .map((run) => run.log)
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
    .slice(0, 200);
  const equityHistory = parsedRuns
    .map((run) => run.equityPoint)
    .filter((point): point is SignalArenaEquityPoint => point !== null)
    .sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
  const timestamps = parsedRuns.map((run) => Date.parse(run.log.startedAt)).filter(Number.isFinite);

  return {
    meta: {
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      source: "workbuddy",
      automationId: options.automationId ?? DEFAULT_AUTOMATION_ID,
      totalRuns: rows.length,
      importedRuns: logs.length,
      equityPoints: equityHistory.length,
      startedAt: timestamps.length > 0 ? new Date(Math.min(...timestamps)).toISOString() : null,
      endedAt: timestamps.length > 0 ? new Date(Math.max(...timestamps)).toISOString() : null
    },
    logs,
    equityHistory
  };
}
