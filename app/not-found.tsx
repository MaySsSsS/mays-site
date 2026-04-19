import Link from "next/link";

import styles from "@/styles/portal.module.css";

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>404</p>
        <h1 className={styles.title}>页面不存在。</h1>
        <p className={styles.description}>
          你可以返回主站入口，或者直接进入 Game 与 Photos 子站页面。
        </p>
      </section>

      <section className={styles.grid}>
        <Link href="/" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Portal</span>
            <span className={styles.cardDomain}>maysssss.cn</span>
          </div>
          <p className={styles.cardDescription}>返回主站入口页。</p>
          <span className={styles.cardAction}>Back</span>
        </Link>

        <Link href="/game" className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Game</span>
            <span className={styles.cardDomain}>game.maysssss.cn</span>
          </div>
          <p className={styles.cardDescription}>前往 Steam 仪表盘首页。</p>
          <span className={styles.cardAction}>Open</span>
        </Link>
      </section>
    </main>
  );
}
