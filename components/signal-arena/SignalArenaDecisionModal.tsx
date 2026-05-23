"use client";

import type { SignalArenaEquityPoint, SignalArenaRunLog, SignalArenaSnapshotState } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaDecisionModalProps = {
  point: SignalArenaEquityPoint | null;
  run: SignalArenaRunLog | null;
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
    return "本轮未选择交易动作";
  }

  return `${action.action.toUpperCase()} ${action.symbol} ${action.shares} 股 / ${action.reason}`;
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

export function SignalArenaDecisionModal({ point, run, onClose }: SignalArenaDecisionModalProps) {
  if (!point) {
    return null;
  }

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
            <p className={styles.eyebrow}>DECISION TRACE</p>
            <h2 id="signal-arena-decision-title" className={styles.modalTitle}>
              {formatDateTime(point.capturedAt)}
            </h2>
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
            <h3>决策路线</h3>
            <DetailList items={run?.decisionTrace?.decisionRoute ?? []} empty="暂无决策路线。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>市场评估</h3>
            <DetailList items={run?.decisionTrace?.marketAssessment ?? []} empty="暂无市场评估。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>组合评估</h3>
            <DetailList items={run?.decisionTrace?.portfolioAssessment ?? []} empty="暂无组合评估。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>候选动作</h3>
            <DetailList
              items={(run?.candidates ?? []).map(
                (candidate) => `${candidate.action.toUpperCase()} ${candidate.symbol} ${candidate.shares} 股 / ${candidate.reason}`
              )}
              empty="本轮没有候选动作。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>被否决动作</h3>
            <DetailList
              items={(run?.decisionTrace?.rejectedActions ?? []).map(
                (action) => `${action.action.toUpperCase()} ${action.symbol} ${action.shares} 股 / ${action.reason}`
              )}
              empty="没有记录被否决动作。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>最终动作</h3>
            <p className={styles.modalText}>{formatAction(run?.selectedAction ?? null)}</p>
            {run?.decisionTrace?.publicExplanation ? (
              <p className={styles.modalText}>{run.decisionTrace.publicExplanation}</p>
            ) : null}
          </article>

          <article className={styles.modalBlock}>
            <h3>执行结果</h3>
            <p className={styles.modalText}>
              风控：{run?.riskResult.allowed ? "通过" : "未通过"} /{" "}
              {run?.riskResult.reasons.join(" / ") || "无拦截原因"}
            </p>
            <p className={styles.modalText}>
              订单：{run?.orderResult.status ?? "未下单"} / {run?.orderResult.message ?? "无附加消息"}
            </p>
            <p className={styles.modalText}>操作后：{formatSnapshot(run?.afterSnapshot ?? null)}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
