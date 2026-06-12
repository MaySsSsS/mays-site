import { SignalArenaShell } from "@/components/signal-arena/SignalArenaShell";
import styles from "@/styles/signal-arena.module.css";

export default function SignalArenaLoading() {
  return (
    <SignalArenaShell active="dashboard" updatedAt={null}>
      <div className={styles.loadingGrid} aria-label="正在同步 Signal Arena 数据">
        <section className={styles.loadingPanel}>
          <span className={styles.loadingEyebrow}>SYNCING</span>
          <h2 className={styles.loadingTitle}>正在同步 AI 决策面板</h2>
          <p className={styles.loadingText}>行情、收益曲线和最新运行日志正在加载。</p>
        </section>
        <section className={styles.loadingBlock} aria-hidden="true">
          <span />
          <span />
          <span />
        </section>
        <section className={styles.loadingBlock} aria-hidden="true">
          <span />
          <span />
          <span />
        </section>
      </div>
    </SignalArenaShell>
  );
}
