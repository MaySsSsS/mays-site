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
    return "AI 本轮选择观望，未提交买卖动作";
  }

  return `${action.action.toUpperCase()} ${action.symbol} ${action.shares} 股 / ${action.reason}`;
}

function formatSource(point: SignalArenaEquityPoint, run: SignalArenaRunLog | null): string {
  return run?.sourceLabel ?? point.sourceLabel ?? "实时 Runner";
}

function formatSignal(signal: NonNullable<SignalArenaRunLog["decisionTrace"]>["signalContext"][number]): string {
  const change = signal.changeRate === null ? "无涨跌幅" : `涨跌幅 ${(signal.changeRate * 100).toFixed(2)}%`;
  const price = signal.price === null ? "无价格" : `价格 ${signal.price}`;

  return `${signal.signalType} / ${signal.suggestedAction.toUpperCase()} ${signal.symbol} / 置信度 ${signal.confidence.toFixed(2)} / ${signal.risk} / ${change} / ${price} / ${signal.reason}`;
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
            <p className={styles.eyebrow}>{point.source === "imported" ? "HISTORICAL REPORT" : "DECISION TRACE"}</p>
            <h2 id="signal-arena-decision-title" className={styles.modalTitle}>
              {formatDateTime(point.capturedAt)}
            </h2>
            <p className={styles.modalText}>
              {formatSource(point, run)} / 置信度 {run?.confidence ?? point.confidence ?? "high"}
            </p>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose} aria-label="关闭弹窗">
            X
          </button>
        </header>

        <div className={styles.modalGrid}>
          <article className={styles.modalBlock}>
            <h3>{point.source === "imported" ? "历史账户快照" : "操作前账户状态"}</h3>
            <p className={styles.modalText}>{formatSnapshot(run?.beforeState ?? null)}</p>
          </article>

          <article className={styles.modalBlock}>
            <h3>{point.source === "imported" ? "历史文本解析路线" : "决策路线"}</h3>
            <DetailList items={run?.decisionTrace?.decisionRoute ?? []} empty="暂无决策路线。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>市场评估</h3>
            <DetailList items={run?.decisionTrace?.marketAssessment ?? []} empty="暂无市场评估。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>前置信号</h3>
            <DetailList
              items={(run?.decisionTrace?.signalContext ?? []).map(formatSignal)}
              empty="本轮没有生成前置信号。"
            />
          </article>

          <article className={styles.modalBlock}>
            <h3>组合评估</h3>
            <DetailList items={run?.decisionTrace?.portfolioAssessment ?? []} empty="暂无组合评估。" />
          </article>

          <article className={styles.modalBlock}>
            <h3>候选判断</h3>
            <DetailList
              items={(run?.candidates ?? []).map(
                (candidate) => `${candidate.action.toUpperCase()} ${candidate.symbol} ${candidate.shares} 股 / ${candidate.reason}`
              )}
              empty="本轮没有候选买卖动作，AI 仍可能给出观望判断。"
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
            <h3>最终判断</h3>
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

          {point.source === "imported" ? (
            <article className={styles.modalBlock}>
              <h3>历史报告摘要</h3>
              <p className={styles.modalText}>{run?.rawSummary ?? point.rawSummary ?? "历史文本没有可展示摘要。"}</p>
            </article>
          ) : null}
        </div>
      </section>
    </div>
  );
}
