import Link from "next/link";

import styles from "@/styles/portal.module.css";

type PortalItem = {
  eyebrow: string;
  title: string;
  href: string;
  domain: string;
  className: string;
  prefetch?: boolean;
};

const portalItems: PortalItem[] = [
  {
    eyebrow: "QUANT",
    title: "QUANT LAB",
    href: "/signal-arena",
    domain: "maysssss.cn/signal-arena",
    className: styles.signalArenaPanel,
    prefetch: true
  },
  {
    eyebrow: "GAME",
    title: "PLAYER ONE",
    href: "/game",
    domain: "maysssss.cn/game",
    className: styles.gamePanel
  },
  {
    eyebrow: "PHOTOS",
    title: "CITY FILES",
    href: "/photos",
    domain: "maysssss.cn/photos",
    className: styles.photoPanel
  },
  {
    eyebrow: "TOOLS",
    title: "SIGNAL LAB",
    href: "/tools",
    domain: "maysssss.cn/tools",
    className: styles.toolsPanel
  },
  {
    eyebrow: "A-SHARE",
    title: "STOCK LAB",
    href: "http://159.75.54.50",
    domain: "159.75.54.50",
    className: styles.stockPanel
  },
  {
    eyebrow: "AI",
    title: "AI DAILY",
    href: "/ai-daily",
    domain: "maysssss.cn/ai-daily",
    className: styles.aiPanel
  },
  {
    eyebrow: "UNIVERSE",
    title: "OBSERVATORY",
    href: "/universe",
    domain: "maysssss.cn/universe",
    className: styles.universePanel,
    prefetch: true
  }
];

export default function PortalPage() {
  return (
    <main className={styles.page}>
      <section className={styles.cover} aria-label="MAYS UNIVERSE comic cover">
        <div className={styles.coverInk} aria-hidden="true" />
        <div className={styles.coverBurst} aria-hidden="true" />
        <div className={styles.coverLines} aria-hidden="true" />
        <h1 className={styles.coverTitle}>
          <span>MAYS</span>
          <span>UNIVERSE</span>
        </h1>
        <div className={styles.coverCue} aria-hidden="true" />
      </section>

      <section className={styles.panelPage} aria-labelledby="portal-directory-title">
        <h2 id="portal-directory-title" className={styles.srOnly}>
          MAYS UNIVERSE portals
        </h2>
        <div className={styles.pageFold} aria-hidden="true" />
        <div className={styles.comicGrid}>
          {portalItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              prefetch={item.prefetch}
              className={`${styles.panel} ${styles.panelLink} ${item.className}`}
              aria-label={`Open ${item.eyebrow}`}
            >
              <span className={styles.panelEyebrow}>{item.eyebrow}</span>
              <span className={styles.panelTitle}>{item.title}</span>
              <span className={styles.panelDomain}>{item.domain}</span>
              <span className={styles.panelAction}>OPEN</span>
            </Link>
          ))}

        </div>
      </section>
    </main>
  );
}
