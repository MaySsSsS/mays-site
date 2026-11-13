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
    eyebrow: "GAME",
    title: "PLAYER ONE",
    href: "/games",
    domain: "linkmays.com/games",
    className: styles.gamePanel
  },
  {
    eyebrow: "PHOTOS",
    title: "CITY FILES",
    href: "/photos",
    domain: "linkmays.com/photos",
    className: styles.photoPanel
  },
  {
    eyebrow: "TOOLS",
    title: "SIGNAL LAB",
    href: "/tools",
    domain: "linkmays.com/tools",
    className: styles.toolsPanel
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
