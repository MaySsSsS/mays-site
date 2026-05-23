import type { SignalArenaOperations, SignalArenaRunStatus } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaOperationsPanelProps = {
  operations: SignalArenaOperations;
};

const TONE_CLASS: Record<SignalArenaOperations["tone"], string> = {
  healthy: styles.healthyTone,
  watch: styles.watchTone,
  quiet: styles.quietTone,
  attention: styles.attentionTone
};

function formatDataAge(value: number | null): string {
  if (value === null) {
    return "等待同步";
  }

  if (value < 60) {
    return "刚刚";
  }

  if (value < 60 * 60) {
    return `${Math.floor(value / 60)} 分钟前`;
  }

  return `${Math.floor(value / (60 * 60))} 小时前`;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "暂无记录";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function formatRunStatus(status: SignalArenaRunStatus | null): string {
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
      return "暂无记录";
  }
}

export function SignalArenaOperationsPanel({ operations }: SignalArenaOperationsPanelProps) {
  return (
    <section className={styles.operationsPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>运行状态</h2>
          <p className={styles.sectionNote}>公开数据、Runner 与收益快照的健康摘要。</p>
        </div>
        <span className={`${styles.toneBadge} ${TONE_CLASS[operations.tone]}`}>{operations.label}</span>
      </div>

      <div className={styles.operationsGrid}>
        <div className={styles.operationsItem}>
          <span>数据年龄</span>
          <strong>{formatDataAge(operations.dataAgeSeconds)}</strong>
        </div>
        <div className={styles.operationsItem}>
          <span>最近 Runner</span>
          <strong>{formatRunStatus(operations.latestRunStatus)}</strong>
        </div>
        <div className={styles.operationsItem}>
          <span>完成时间</span>
          <strong>{formatDateTime(operations.latestRunFinishedAt)}</strong>
        </div>
        <div className={styles.operationsItem}>
          <span>快照覆盖</span>
          <strong>{operations.equityCoverageDays} 天</strong>
        </div>
        <div className={styles.operationsItem}>
          <span>曲线点数</span>
          <strong>{operations.equityPointCount}</strong>
        </div>
        <div className={styles.operationsItem}>
          <span>公开日志</span>
          <strong>{operations.logCount}</strong>
        </div>
      </div>

      {operations.latestRunSummary ? (
        <p className={styles.operationsSummary}>{operations.latestRunSummary}</p>
      ) : null}
    </section>
  );
}
