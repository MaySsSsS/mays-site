import Link from "next/link";

import { AiDailyPasswordGate } from "@/components/ai-daily/AiDailyPasswordGate";
import styles from "@/styles/ai-daily.module.css";
import type { AiDailyArchive } from "@/types/ai-daily";

type AiDailyArchiveProps = {
  archive: AiDailyArchive;
  passwordHash: string;
};

export function AiDailyArchive({ archive, passwordHash }: AiDailyArchiveProps) {
  return (
    <main className={styles.page}>
      <AiDailyPasswordGate passwordHash={passwordHash}>
        <section className={styles.hero}>
          <Link className={styles.backLink} href="/">
            Return to Universe
          </Link>
          <p className={styles.kicker}>AI Daily</p>
          <h1 className={styles.title}>Daily AI signal archive.</h1>
          <p className={styles.description}>
            每天一张情报卡片，保留日期脉络，把 AI 圈的主要变化收束成可回看的日报。
          </p>
          <div className={styles.heroGeometry} aria-hidden="true">
            <span className={styles.geometryCircle} />
            <span className={styles.geometryTriangle} />
            <span className={styles.geometrySquare} />
          </div>
        </section>

        <section className={styles.archiveGrid} aria-label="AI Daily archive">
          {archive.entries.map((entry) => (
            <Link key={entry.date} className={styles.dailyCard} href={entry.path}>
              <span className={styles.cardMeta}>
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                <span>{entry.mode === "ai_summary" ? "AI 整理版" : "缓存版"}</span>
              </span>
              <span className={styles.cardTitle}>{entry.title}</span>
              <span className={styles.summaryList}>
                {entry.summary.slice(0, 3).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </span>
              <span className={styles.cardAction}>Read report</span>
            </Link>
          ))}
        </section>
      </AiDailyPasswordGate>
    </main>
  );
}

function formatDate(date: string): string {
  return date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, year, month, day) => {
    return `${year}.${month}.${day}`;
  });
}
