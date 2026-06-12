"use client";

import { useMemo, useState } from "react";

import type { SignalArenaRunLog, SignalArenaStrategyTrace } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaLogsProps = {
  logs: SignalArenaRunLog[];
};

const FILTERS = [
  { id: "all", label: "全部" },
  { id: "buy", label: "买入" },
  { id: "sell", label: "卖出" },
  { id: "held", label: "观望" },
  { id: "blocked", label: "风控拦截" },
  { id: "data", label: "数据不足" },
  { id: "failed", label: "流程失败" }
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

function hasDataGap(log: SignalArenaRunLog): boolean {
  return (log.strategyTrace?.historyCoverage.insufficientSymbols.length ?? 0) > 0 ||
    log.strategyTrace?.rejectedReasons.some((reason) => reason.includes("历史数据不足")) === true;
}

function matchesFilter(log: SignalArenaRunLog, filter: LogFilter): boolean {
  switch (filter) {
    case "buy":
      return log.selectedAction?.action === "buy";
    case "sell":
      return log.selectedAction?.action === "sell";
    case "held":
      return log.status === "held" && !log.selectedAction;
    case "blocked":
      return log.status === "blocked";
    case "data":
      return hasDataGap(log);
    case "failed":
      return log.status === "failed";
    case "all":
      return true;
  }
}

function factorLine(candidate: SignalArenaStrategyTrace["candidateRanking"][number]): string {
  const parts = Object.entries(candidate.factorScore)
    .filter(([key]) => key !== "total")
    .map(([key, value]) => `${key} ${value}`);

  return parts.join(" / ");
}

export function SignalArenaLogs({ logs }: SignalArenaLogsProps) {
  const [activeFilter, setActiveFilter] = useState<LogFilter>("all");
  const summary = useMemo(() => ({
    all: logs.length,
    buy: logs.filter((log) => log.selectedAction?.action === "buy").length,
    sell: logs.filter((log) => log.selectedAction?.action === "sell").length,
    held: logs.filter((log) => log.status === "held" && !log.selectedAction).length,
    blocked: logs.filter((log) => log.status === "blocked").length,
    data: logs.filter(hasDataGap).length,
    failed: logs.filter((log) => log.status === "failed").length
  }), [logs]);
  const filteredLogs = useMemo(
    () => logs.filter((log) => matchesFilter(log, activeFilter)),
    [activeFilter, logs]
  );

  return (
    <section className={styles.timeline}>
      <div className={styles.logSummary}>
        <span className={styles.logSummaryItem}>全部 {summary.all}</span>
        <span className={styles.logSummaryItem}>买入 {summary.buy}</span>
        <span className={styles.logSummaryItem}>卖出 {summary.sell}</span>
        <span className={styles.logSummaryItem}>观望 {summary.held}</span>
        <span className={styles.logSummaryItem}>拦截 {summary.blocked}</span>
        <span className={styles.logSummaryItem}>数据不足 {summary.data}</span>
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
        <p className={styles.empty}>当前筛选下暂无 Quant Lab 策略日志。</p>
      ) : null}

      {filteredLogs.map((log, logIndex) => (
        <article key={`${log.id}-${logIndex}`} className={styles.logItem}>
          <div className={styles.logTopline}>
            <time className={styles.logTime}>{formatDateTime(log.startedAt)}</time>
            <span className={styles.status}>{log.status}</span>
            <span className={styles.sourceBadge}>{log.strategyVersion ?? "Q-Alpha v1"}</span>
            <span className={styles.sourceBadge}>{log.accountScope}</span>
          </div>

          <h2 className={styles.logTitle}>{log.summary}</h2>
          <p className={styles.logMeta}>
            市场判断：{log.marketView} / 风险级别：{log.riskLevel}
          </p>

          {log.strategyTrace ? (
            <div className={styles.traceGrid}>
              <section className={styles.traceBlock}>
                <h3>规则触发</h3>
                <p className={styles.logNote}>{log.strategyTrace.finalRule || "本轮无规则触发。"}</p>
              </section>
              <section className={styles.traceBlock}>
                <h3>历史覆盖</h3>
                <p className={styles.logNote}>
                  {log.strategyTrace.historyCoverage.coveredSymbols}/{log.strategyTrace.historyCoverage.requestedSymbols} 只完成；
                  不足 {log.strategyTrace.historyCoverage.insufficientSymbols.length} 只。
                </p>
              </section>
              <section className={styles.traceBlock}>
                <h3>候选排序</h3>
                <p className={styles.logNote}>
                  {log.strategyTrace.candidateRanking.slice(0, 3).map((candidate) => `${candidate.symbol} ${candidate.score}`).join(" / ") || "暂无候选。"}
                </p>
              </section>
            </div>
          ) : null}

          {log.strategyTrace?.candidateRanking.length ? (
            <ul className={styles.candidateList}>
              {log.strategyTrace.candidateRanking.slice(0, 6).map((candidate, candidateIndex) => (
                <li
                  key={`${log.id}-${candidate.symbol}-${candidateIndex}`}
                  className={styles.candidateItem}
                >
                  <span className={styles.candidateAction}>{candidate.score}</span>
                  <span className={styles.candidateText}>
                    {candidate.symbol} {candidate.name}：{factorLine(candidate) || "因子暂无"}；
                    {candidate.entryReasons.join("、") || candidate.rejectionReasons.join("、") || "无附加原因"}
                  </span>
                </li>
              ))}
            </ul>
          ) : log.candidates.length > 0 ? (
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
            <p className={styles.logNote}>本轮没有候选买卖动作，策略给出观望判断。</p>
          )}

          <p className={styles.logNote}>
            拒绝原因：{log.strategyTrace?.rejectedReasons.join(" / ") || "无策略拒绝原因。"}
          </p>
          <p className={styles.logNote}>
            风控结果：{log.riskResult.reasons.join(" / ") || "无风控拦截。"}
          </p>

          {log.selectedAction ? (
            <p className={styles.logNote}>
              最终动作：{log.selectedAction.action.toUpperCase()} {log.selectedAction.symbol} {log.selectedAction.shares} 股 / {log.selectedAction.reason}
            </p>
          ) : null}

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
