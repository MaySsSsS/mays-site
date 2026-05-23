"use client";

import { useMemo, useState } from "react";

import type { SignalArenaRunLog } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaLogsProps = {
  logs: SignalArenaRunLog[];
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "active", label: "执行/持有" },
  { id: "blocked", label: "拦截" },
  { id: "skipped", label: "跳过" },
  { id: "failed", label: "失败" }
] as const;

type LogFilter = (typeof FILTERS)[number]["id"];

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function formatAction(action: SignalArenaRunLog["candidates"][number]["action"]): string {
  switch (action) {
    case "buy":
      return "BUY";
    case "sell":
      return "SELL";
    case "hold":
      return "HOLD";
  }
}

function matchesFilter(log: SignalArenaRunLog, filter: LogFilter): boolean {
  switch (filter) {
    case "active":
      return log.status === "executed" || log.status === "held";
    case "blocked":
      return log.status === "blocked";
    case "skipped":
      return log.status === "skipped";
    case "failed":
      return log.status === "failed";
    case "all":
      return true;
  }
}

export function SignalArenaLogs({ logs }: SignalArenaLogsProps) {
  const [activeFilter, setActiveFilter] = useState<LogFilter>("all");
  const summary = useMemo(() => {
    const active = logs.filter((log) => log.status === "executed" || log.status === "held").length;

    return {
      all: logs.length,
      active,
      blocked: logs.filter((log) => log.status === "blocked").length,
      skipped: logs.filter((log) => log.status === "skipped").length,
      failed: logs.filter((log) => log.status === "failed").length
    };
  }, [logs]);
  const filteredLogs = useMemo(
    () => logs.filter((log) => matchesFilter(log, activeFilter)),
    [activeFilter, logs]
  );

  return (
    <section className={styles.timeline}>
      <div className={styles.logSummary}>
        <span className={styles.logSummaryItem}>全部 {summary.all}</span>
        <span className={styles.logSummaryItem}>执行/持有 {summary.active}</span>
        <span className={styles.logSummaryItem}>拦截 {summary.blocked}</span>
        <span className={styles.logSummaryItem}>跳过 {summary.skipped}</span>
        <span className={styles.logSummaryItem}>失败 {summary.failed}</span>
      </div>

      <div className={styles.logFilters} aria-label="日志筛选">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={activeFilter === filter.id ? styles.logFilterButtonActive : styles.logFilterButton}
            aria-pressed={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <p className={styles.empty}>当前筛选下暂无 AI Runner 日志。</p>
      ) : null}

      {filteredLogs.map((log, logIndex) => (
        <article key={`${log.id}-${logIndex}`} className={styles.logItem}>
          <div className={styles.logTopline}>
            <time className={styles.logTime}>{formatDateTime(log.startedAt)}</time>
            <span className={styles.status}>{log.status}</span>
          </div>

          <h2 className={styles.logTitle}>{log.summary}</h2>
          <p className={styles.logMeta}>
            市场判断：{log.marketView} / 风险级别：{log.riskLevel}
          </p>
          {log.decisionTrace ? (
            <div className={styles.traceGrid}>
              <section className={styles.traceBlock}>
                <h3>决策路线</h3>
                <p className={styles.logNote}>{log.decisionTrace.decisionRoute.join(" / ") || "暂无路线。"}</p>
              </section>
              <section className={styles.traceBlock}>
                <h3>操作前账户状态</h3>
                <p className={styles.logNote}>{log.decisionTrace.beforeStateSummary}</p>
              </section>
              <section className={styles.traceBlock}>
                <h3>执行结果</h3>
                <p className={styles.logNote}>{log.decisionTrace.publicExplanation}</p>
              </section>
            </div>
          ) : null}

          {log.candidates.length > 0 ? (
            <ul className={styles.candidateList}>
              {log.candidates.map((candidate, candidateIndex) => (
                <li
                  key={`${log.id}-${candidate.symbol}-${candidate.action}-${candidateIndex}`}
                  className={styles.candidateItem}
                >
                  <span className={styles.candidateAction}>{formatAction(candidate.action)}</span>
                  <span className={styles.candidateText}>
                    {candidate.symbol} {candidate.shares} 股：{candidate.reason}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.logNote}>本轮没有进入候选动作。</p>
          )}

          <p className={styles.logNote}>
            {log.riskResult.reasons.join(" / ") || "无风控拦截。"}
          </p>

          {log.orderResult.status || log.orderResult.message ? (
            <p className={styles.logNote}>
              执行结果：{log.orderResult.status ?? "unknown"} / {log.orderResult.message ?? "无附加消息"}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
