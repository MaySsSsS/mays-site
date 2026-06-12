"use client";

import { useMemo, useState } from "react";

import { SignalArenaDecisionModal } from "@/components/signal-arena/SignalArenaDecisionModal";
import { SignalArenaEquityChart } from "@/components/signal-arena/SignalArenaEquityChart";
import { SignalArenaOperationsPanel } from "@/components/signal-arena/SignalArenaOperationsPanel";
import type {
  SignalArenaDashboard as DashboardData,
  SignalArenaEquityPoint,
  SignalArenaOperations,
  SignalArenaRunLog,
  SignalArenaStrategy
} from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaDashboardProps = {
  dashboard: DashboardData;
  logs: SignalArenaRunLog[];
  equityHistory: SignalArenaEquityPoint[];
  operations: SignalArenaOperations;
  strategy: SignalArenaStrategy;
};

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

function formatRunStatus(status: DashboardData["latestRun"] extends { status: infer T } ? T : string): string {
  switch (status) {
    case "executed":
      return "已执行";
    case "held":
      return "持有";
    case "blocked":
      return "已拦截";
    case "skipped":
      return "已跳过";
    case "failed":
      return "失败";
    default:
      return String(status);
  }
}

export function SignalArenaDashboard({ dashboard, logs, equityHistory, operations, strategy }: SignalArenaDashboardProps) {
  const [selectedPoint, setSelectedPoint] = useState<SignalArenaEquityPoint | null>(null);
  const runById = useMemo(() => new Map(logs.map((log) => [log.id, log])), [logs]);
  const chartHistory = useMemo<SignalArenaEquityPoint[]>(() => {
    if (equityHistory.length > 0) {
      return equityHistory;
    }

    return [
      {
        id: `dashboard-${dashboard.updatedAt}`,
        runId: dashboard.latestRun?.id ?? null,
        capturedAt: dashboard.updatedAt,
        totalAssets: dashboard.totalAssets,
        returnRate: dashboard.returnRate,
        currentRank: dashboard.currentRank,
        status: dashboard.latestRun?.status ?? "snapshot",
        actionSummary: dashboard.latestRun?.summary ?? "当前总览快照",
        accountScope: strategy.accountScope,
        strategyVersion: strategy.version
      }
    ];
  }, [dashboard, equityHistory, strategy]);
  const selectedRun = selectedPoint?.runId ? runById.get(selectedPoint.runId) ?? null : null;
  const latestTrace = dashboard.latestRun?.strategyTrace ?? logs.find((log) => log.strategyTrace)?.strategyTrace ?? null;
  const scoreBySymbol = useMemo(() => {
    const map = new Map<string, NonNullable<SignalArenaRunLog["strategyTrace"]>["candidateRanking"][number]>();
    for (const candidate of latestTrace?.candidateRanking ?? []) {
      map.set(candidate.symbol, candidate);
    }
    return map;
  }, [latestTrace]);

  return (
    <section className={styles.dashboard}>
      <SignalArenaEquityChart
        history={chartHistory}
        defaultRange="30P"
        onPointClick={setSelectedPoint}
      />
      <SignalArenaDecisionModal
        point={selectedPoint}
        run={selectedRun}
        onClose={() => setSelectedPoint(null)}
      />

      <SignalArenaOperationsPanel operations={operations} />

      <section className={styles.strategyPanel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{strategy.version}</h2>
          <p className={styles.sectionNote}>确定性多因子趋势动量策略，AI 不进入每日下单闭环。</p>
        </div>
        <div className={styles.strategyGrid}>
          <article>
            <span>运行模式</span>
            <strong>{latestTrace?.runMode === "dry-run" ? "DRY RUN" : "LIVE"}</strong>
          </article>
          <article>
            <span>今日候选</span>
            <strong>{latestTrace?.candidateCount ?? 0}</strong>
          </article>
          <article>
            <span>历史覆盖</span>
            <strong>
              {latestTrace
                ? `${latestTrace.historyCoverage.coveredSymbols}/${latestTrace.historyCoverage.requestedSymbols}`
                : "0/0"}
            </strong>
          </article>
          <article>
            <span>买入阈值</span>
            <strong>{strategy.parameters.buyThreshold}</strong>
          </article>
          <article>
            <span>现金下限</span>
            <strong>{formatPercent(strategy.parameters.minCashRate)}</strong>
          </article>
          <article>
            <span>单票上限</span>
            <strong>{formatPercent(strategy.parameters.maxPositionRate)}</strong>
          </article>
        </div>
      </section>

      {dashboard.metrics.length === 0 ? (
        <p className={styles.empty}>关键指标暂未同步。</p>
      ) : (
        <div className={styles.metricGrid}>
          {dashboard.metrics.map((metric, index) => (
            <article
              key={`${metric.label}-${index}`}
              className={`${styles.metric} ${styles[metric.tone]}`}
            >
              <span className={styles.metricLabel}>{metric.label}</span>
              <strong className={styles.metricValue}>{metric.value}</strong>
            </article>
          ))}
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>A 股核心持仓</h2>
          <p className={styles.sectionNote}>仅展示公开可见的持仓摘要与盈亏状态。</p>
        </div>

        {dashboard.cnHoldings.length === 0 ? (
          <p className={styles.empty}>暂无 A 股持仓。</p>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <span>标的</span>
              <span>代码</span>
              <span>持仓</span>
              <span>市值</span>
              <span>收益率</span>
              <span>策略分</span>
              <span>入场理由</span>
              <span>风控状态</span>
            </div>

            {dashboard.cnHoldings.map((holding, index) => (
              <div key={`${holding.symbol}-${index}`} className={styles.tableRow}>
                {(() => {
                  const trace = scoreBySymbol.get(holding.symbol);
                  const riskState = holding.availableShares <= 0 ? "T+1/暂无可卖" : trace?.rejectionReasons[0] ?? "未触发硬风控";

                  return (
                    <>
                      <strong>{holding.name}</strong>
                      <span>{holding.symbol}</span>
                      <span>{holding.shares} 股</span>
                      <span>{formatMoney(holding.marketValue)}</span>
                      <span className={holding.profitRate >= 0 ? styles.ratePositive : styles.rateNegative}>
                        {formatPercent(holding.profitRate)}
                      </span>
                      <span>{trace ? `${trace.score}` : "未评分"}</span>
                      <span>{trace?.entryReasons.join(" / ") || "暂无入场理由"}</span>
                      <span>{riskState}</span>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>最近一轮策略决策</h2>
          <p className={styles.sectionNote}>公开视图展示规则触发、因子评分和风控结论。</p>
        </div>

        {dashboard.latestRun ? (
          <article className={styles.runCard}>
            <div className={styles.runMeta}>
              <span className={styles.status}>{formatRunStatus(dashboard.latestRun.status)}</span>
              <span className={styles.runMetaText}>
                {dashboard.latestRun.trigger === "cron" ? "定时触发" : "手动触发"} / 风险{" "}
                {dashboard.latestRun.riskLevel}
              </span>
            </div>
            <h3 className={styles.runTitle}>{dashboard.latestRun.summary}</h3>
            <p className={styles.runText}>
              {dashboard.latestRun.riskResult.reasons.join(" / ") || "风控通过或本轮无需执行交易。"}
            </p>
            {dashboard.latestRun.decisionTrace?.publicExplanation ? (
              <p className={styles.runText}>{dashboard.latestRun.decisionTrace.publicExplanation}</p>
            ) : null}
            {dashboard.latestRun.strategyTrace?.finalRule ? (
              <p className={styles.runText}>规则触发：{dashboard.latestRun.strategyTrace.finalRule}</p>
            ) : null}
            {dashboard.latestRun.selectedAction ? (
              <p className={styles.runText}>
                当前动作：{dashboard.latestRun.selectedAction.action.toUpperCase()}{" "}
                {dashboard.latestRun.selectedAction.symbol} {dashboard.latestRun.selectedAction.shares} 股
              </p>
            ) : null}
          </article>
        ) : (
          <p className={styles.empty}>Quant Lab Runner 尚未产生公开日志。</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>市场分布</h2>
          <p className={styles.sectionNote}>按市场聚合的仓位规模与收益表现。</p>
        </div>

        {dashboard.marketSummaries.length === 0 ? (
          <p className={styles.empty}>市场分布暂未同步。</p>
        ) : (
          <div className={styles.marketStrip}>
            {dashboard.marketSummaries.map((market, index) => (
              <article key={`${market.market}-${index}`} className={styles.marketCard}>
                <span className={styles.marketLabel}>{market.label}</span>
                <strong className={styles.marketValue}>{formatMoney(market.totalValue)}</strong>
                <span className={market.profitRate >= 0 ? styles.ratePositive : styles.rateNegative}>
                  收益率 {formatPercent(market.profitRate)}
                </span>
                <span className={styles.marketMeta}>{market.holdingsCount} 个持仓</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
