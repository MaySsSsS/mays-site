import Link from "next/link";

import styles from "@/styles/portal.module.css";

const portalItems = [
  {
    title: "Game",
    href: "/game",
    domain: "game.maysssss.cn",
    description: "查看游戏时长、最近在玩什么，以及完整游戏库。"
  },
  {
    title: "Photos",
    href: "/photos",
    domain: "photo.maysssss.cn",
    description: "按城市浏览照片、分组和地图上的足迹。"
  }
];

export default function PortalPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>MAYS SITE</p>
        <h1 className={styles.title}>
          游戏和照片，各自独立，也都能一眼找到。
        </h1>
        <p className={styles.description}>
          从这里进入 Game 或 Photos。一个看游戏记录，一个看照片和足迹。
        </p>
      </section>

      <section className={styles.grid}>
        {portalItems.map((item) => (
          <Link key={item.title} href={item.href} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>{item.title}</span>
              <span className={styles.cardDomain}>{item.domain}</span>
            </div>
            <p className={styles.cardDescription}>{item.description}</p>
            <span className={styles.cardAction}>Open</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
