import Link from "next/link";

import { AiDailyPasswordGate } from "@/components/ai-daily/AiDailyPasswordGate";
import styles from "@/styles/ai-daily.module.css";
import type { AiDailyEntry } from "@/types/ai-daily";

type AiDailyDetailProps = {
  entry: AiDailyEntry;
  passwordHash: string;
};

export function AiDailyDetail({ entry, passwordHash }: AiDailyDetailProps) {
  return (
    <main className={styles.page}>
      <AiDailyPasswordGate passwordHash={passwordHash}>
        <article className={styles.detail}>
          <div className={styles.detailTopline}>
            <Link className={styles.backLink} href="/ai-daily">
              Back to AI Daily
            </Link>
            <span className={styles.modePill}>
              {entry.mode === "ai_summary" ? "AI 整理版" : "缓存版"}
            </span>
          </div>

          <header className={styles.detailHeader}>
            <time className={styles.detailDate} dateTime={entry.date}>
              {entry.date}
            </time>
            <h1 className={styles.detailTitle}>{entry.title}</h1>
            <ul className={styles.detailSummary}>
              {entry.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.heroGeometry} aria-hidden="true">
              <span className={styles.geometryCircle} />
              <span className={styles.geometryTriangle} />
              <span className={styles.geometrySquare} />
            </div>
          </header>

          <div className={styles.sectionStack}>
            {entry.sections.map((section) => (
              <section key={section.title} className={styles.reportSection}>
                <h2>{section.title}</h2>
                <div className={styles.itemStack}>
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.title}`} className={styles.reportItem}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </AiDailyPasswordGate>
    </main>
  );
}
