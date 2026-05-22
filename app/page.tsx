import Link from "next/link";

import styles from "@/styles/portal.module.css";

const portalItems = [
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
    eyebrow: "AI",
    title: "AI DAILY",
    href: "/ai-daily",
    domain: "maysssss.cn/ai-daily",
    className: styles.aiPanel
  },
  {
    eyebrow: "ARENA",
    title: "SIGNAL ARENA",
    href: "/signal-arena",
    domain: "maysssss.cn/signal-arena",
    className: styles.signalArenaPanel
  }
];

const sealedPanels = [
  {
    title: "CLASSIFIED",
    label: "未完待续",
    className: styles.sealedPanelBlue
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
              className={`${styles.panel} ${styles.panelLink} ${item.className}`}
              aria-label={`Open ${item.eyebrow}`}
            >
              <span className={styles.panelEyebrow}>{item.eyebrow}</span>
              <span className={styles.panelTitle}>{item.title}</span>
              <span className={styles.panelDomain}>{item.domain}</span>
              <span className={styles.panelAction}>OPEN</span>
            </Link>
          ))}

          {sealedPanels.map((item) => (
            <button
              key={item.title}
              type="button"
              className={`${styles.panel} ${styles.sealedPanel} ${item.className}`}
              aria-label={`${item.label} portal is sealed`}
            >
              <span className={styles.panelEyebrow}>{item.label}</span>
              <span className={styles.panelTitle}>{item.title}</span>
              <span className={styles.sealTape} aria-hidden="true">
                LOCKED
              </span>
              <span className={styles.panelAction}>STAND BY</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
