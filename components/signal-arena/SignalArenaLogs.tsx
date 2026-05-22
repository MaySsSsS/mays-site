import type { SignalArenaRunLog } from "@/types/signal-arena";
import styles from "@/styles/signal-arena.module.css";

type SignalArenaLogsProps = {
  logs: SignalArenaRunLog[];
};

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

export function SignalArenaLogs({ logs }: SignalArenaLogsProps) {
  if (logs.length === 0) {
    return <p className={styles.empty}>暂无 AI Runner 日志。</p>;
  }

  return (
    <section className={styles.timeline}>
      {logs.map((log, logIndex) => (
        <article key={`${log.id}-${logIndex}`} className={styles.logItem}>
          <div className={styles.logTopline}>
            <time className={styles.logTime}>{formatDateTime(log.startedAt)}</time>
            <span className={styles.status}>{log.status}</span>
          </div>

          <h2 className={styles.logTitle}>{log.summary}</h2>
          <p className={styles.logMeta}>
            市场判断：{log.marketView} / 风险级别：{log.riskLevel}
          </p>

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
