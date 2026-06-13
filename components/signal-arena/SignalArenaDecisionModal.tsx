"use client";

import type { SignalArenaEquityPoint, SignalArenaRunLog, SignalArenaSnapshotState } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaDecisionModalProps = {
  point: SignalArenaEquityPoint | null;
  run: SignalArenaRunLog | null;
  title?: string;
  onClose: () => void;
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function formatSnapshot(snapshot: SignalArenaSnapshotState | null): string {
  if (!snapshot) {
    return "暂无快照";
  }

  return [
    `总资产 ${formatMoney(snapshot.totalAssets)}`,
    `现金 ${formatMoney(snapshot.cash)}`,
    `收益率 ${formatPercent(snapshot.returnRate)}`,
    `排名 ${snapshot.currentRank ?? "未同步"}`,
    `持仓 ${snapshot.holdingsCount}`
  ].join(" / ");
}

function formatAction(action: SignalArenaRunLog["selectedAction"]): string {
  if (!action) {
    return "策略本轮选择观望，未提交买卖动作";
  }

  return `${action.action.toUpperCase()} ${action.symbol} ${action.shares} 股 / ${action.reason}`;
}

function factorText(candidate: NonNullable<SignalArenaRunLog["strategyTrace"]>["candidateRanking"][number]): string {
  return Object.entries(candidate.factorScore)
    .map(([key, value]) => `${key} ${value}`)
    .join(" / ");
}

function indicatorText(candidate: NonNullable<SignalArenaRunLog["strategyTrace"]>["candidateRanking"][number]): string {
  if (!candidate.indicators) {
    return "指标不足";
  }

  const labels: Record<string, string> = {
    close: "收盘",
    ma20: "MA20",
    ma60: "MA60",
    ma20Slope: "MA20斜率",
    return5d: "5D",
    return10d: "10D",
    return20d: "20D",
    high20Distance: "距20日高点",
    volumeRatio5To20: "量比",
    volatility20: "20日波动",
    drawdown20: "20日回撤"
  };

  return Object.entries(candidate.indicators)
    .filter(([key]) => key in labels)
    .map(([key, value]) => `${labels[key]} ${value === null ? "NA" : Number(value).toFixed(4)}`)
    .join(" / ");
}

function holdingText(candidate: NonNullable<SignalArenaRunLog["strategyTrace"]>["candidateRanking"][number]): string {
  if (!candidate.holding) {
    return "非当前持仓";
  }

  return [
    `持仓 ${candidate.holding.shares} 股`,
    `可卖 ${candidate.holding.availableShares} 股`,
    `收益 ${formatPercent(candidate.holding.profitRate)}`,
    `仓位 ${formatPercent(candidate.holding.positionRate)}`
  ].join(" / ");
}

function DetailList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className={styles.modalText}>{empty}</p>;
  }

  return (
    <ol className={styles.modalList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ol>
  );
}

export function SignalArenaDecisionModal({ point, run, title, onClose }: SignalArenaDecisionModalProps) {
  if (!point) {
    return null;
  }

  const trace = run?.strategyTrace ?? null;

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <section
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signal-arena-decision-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>STRATEGY TRACE</p>
            <h2 id="signal-arena-decision-title" className={styles.modalTitle}>
              {title ?? formatDateTime(point.capturedAt)}
            </h2>
            <p className={styles.modalText}>
              {point.strategyVersion ?? run?.strategyVersion ?? "Q-Alpha v1"} / {point.accountScope}
            </p>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭弹窗">
            X
          </button>
        </header>

        <div className={styles.modalGrid}>
          <article className={styles.modalBlock}>
            <h3>操作前账户状态</h3>
            <p className={styles.modalText}>{formatSnapshot(run?.beforeState ?? null)}</p>
          </article>

          <article className={styles.modalBlock}>
            <h3>规则触发</h3>
            <p className={styles.modalText}>{trace?.finalRule ?? "暂无规则触发。"}</p>
          </article>

          <article className={styles.modalBlock}>
            <h3>最终动作</h3>
            <p className={styles.modalText}>{formatAction(trace?.finalAction ?? run?.selectedAction ?? null)}</p>
          </article>

          <article className={styles.modalBlock}>
            <h3>历史覆盖</h3>
            <p className={styles.modalText}>
              {trace
                ? `${trace.historyCoverage.coveredSymbols}/${trace.historyCoverage.requestedSymbols} 只完成，${trace.historyCoverage.insufficientSymbols.length} 只不足。`
                : "暂无历史覆盖信息。"}
            </p>
          </article>

          <article className={styles.modalBlock}>
            <h3>候选排序</h3>
            <DetailList
              items={(trace?.candidateRanking ?? []).slice(0, 8).map(
                (candidate) => `${candidate.symbol} ${candidate.name} / 总分 ${candidate.score} / ${factorText(candidate)}`
              )}
              empty="暂无候选排序。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>因子评分</h3>
            <DetailList
              items={(trace?.candidateRanking ?? []).slice(0, 5).map(
                (candidate) => `${candidate.symbol}: ${candidate.entryReasons.join("、") || candidate.rejectionReasons.join("、") || "无附加原因"}`
              )}
              empty="暂无因子评分。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>指标快照</h3>
            <DetailList
              items={(trace?.candidateRanking ?? []).slice(0, 5).map(
                (candidate) => `${candidate.symbol}: ${indicatorText(candidate)}`
              )}
              empty="暂无指标快照。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>持仓状态</h3>
            <DetailList
              items={(trace?.candidateRanking ?? []).slice(0, 5).map(
                (candidate) => `${candidate.symbol}: ${holdingText(candidate)}`
              )}
              empty="暂无持仓状态。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>拒绝原因</h3>
            <DetailList items={trace?.rejectedReasons ?? []} empty="没有策略拒绝原因。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>风控结果</h3>
            <p className={styles.modalText}>
              {run?.riskResult.allowed ? "通过" : "未通过"} / {trace?.riskReasons.join(" / ") || run?.riskResult.reasons.join(" / ") || "无拦截原因"}
            </p>
            <p className={styles.modalText}>
              订单：{run?.orderResult.status ?? "未下单"} / {run?.orderResult.message ?? "无附加消息"}
            </p>
          </article>

          <article className={styles.modalBlock}>
            <h3>最近快照</h3>
            <DetailList
              items={(trace?.recentSnapshots ?? []).slice(0, 5).map(
                (snapshot) => `${snapshot.capturedAt ? formatDateTime(snapshot.capturedAt) : "时间未知"} / 总资产 ${formatMoney(snapshot.totalAssets)} / 收益 ${formatPercent(snapshot.returnRate)} / 排名 ${snapshot.rank ?? "未同步"}`
              )}
              empty="暂无最近快照。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>操作后</h3>
            <p className={styles.modalText}>{formatSnapshot(run?.afterSnapshot ?? null)}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
