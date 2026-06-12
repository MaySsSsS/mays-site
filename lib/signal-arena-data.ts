import "server-only";

import { toSignalArenaPublicData } from "@/lib/signal-arena-sanitize";
import fallbackData from "@/public/data/signal-arena/fallback.json";
import historyData from "@/public/data/signal-arena/history.json";
import type {
  SignalArenaEquityPoint,
  SignalArenaOperations,
  SignalArenaPublicData,
  SignalArenaRunLog
} from "@/types/signal-arena";

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Signal Arena worker returned ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function timestampOf(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mergeLogs(liveLogs: SignalArenaRunLog[], historyLogs: SignalArenaRunLog[]): SignalArenaRunLog[] {
  const merged = new Map<string, SignalArenaRunLog>();

  for (const log of [...historyLogs, ...liveLogs]) {
    merged.set(log.id, log.source ? log : { ...log, source: "live", sourceLabel: "实时 Runner", confidence: "high" });
  }

  return [...merged.values()].sort((left, right) => timestampOf(right.startedAt) - timestampOf(left.startedAt));
}

function mergeEquityHistory(
  liveHistory: SignalArenaEquityPoint[],
  importedHistory: SignalArenaEquityPoint[]
): SignalArenaEquityPoint[] {
  const merged = new Map<string, SignalArenaEquityPoint>();

  for (const point of [...importedHistory, ...liveHistory]) {
    const key = `${point.runId ?? point.id}-${point.capturedAt}`;
    merged.set(key, point.source ? point : { ...point, source: "live", sourceLabel: "实时 Runner", confidence: "high" });
  }

  return [...merged.values()].sort((left, right) => timestampOf(left.capturedAt) - timestampOf(right.capturedAt));
}

function equityCoverageDays(history: SignalArenaEquityPoint[]): number {
  const timestamps = history.map((point) => timestampOf(point.capturedAt)).filter((timestamp) => timestamp > 0);

  if (timestamps.length < 2) {
    return 0;
  }

  return Math.floor((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000));
}

function rebuildOperations(
  operations: SignalArenaOperations,
  logs: SignalArenaRunLog[],
  equityHistory: SignalArenaEquityPoint[]
): SignalArenaOperations {
  return {
    ...operations,
    equityPointCount: equityHistory.length,
    equityCoverageDays: equityCoverageDays(equityHistory),
    logCount: logs.length
  };
}

function withLocalHistory(data: SignalArenaPublicData): SignalArenaPublicData {
  const history = toSignalArenaPublicData({
    dashboard: data.dashboard,
    rank: data.rank,
    logs: Array.isArray(historyData.logs) ? historyData.logs : [],
    equityHistory: Array.isArray(historyData.equityHistory) ? historyData.equityHistory : [],
    operations: data.operations
  });

  if (!history) {
    return data;
  }

  const logs = mergeLogs(data.logs, history.logs);
  const equityHistory = mergeEquityHistory(data.equityHistory, history.equityHistory);

  return {
    ...data,
    logs,
    equityHistory,
    operations: rebuildOperations(data.operations, logs, equityHistory)
  };
}

export async function getSignalArenaPublicData(): Promise<SignalArenaPublicData> {
  const baseUrl = process.env.SIGNAL_ARENA_API_URL;

  if (!baseUrl) {
    return withLocalHistory(fallbackData as SignalArenaPublicData);
  }

  try {
    const data = await fetchJson<unknown>(`${baseUrl.replace(/\/$/, "")}/api/public/all`);
    const sanitizedData = toSignalArenaPublicData(data);

    if (sanitizedData) {
      return withLocalHistory(sanitizedData);
    }

    return withLocalHistory(fallbackData as SignalArenaPublicData);
  } catch {
    return withLocalHistory(fallbackData as SignalArenaPublicData);
  }
}
