import Link from "next/link";

import styles from "@/styles/portal.module.css";

const portalItems = [
  {
    title: "Game",
    href: "/game",
    domain: "game.maysssss.cn",
    description: "Steam 游戏仪表盘与游戏库，保持原来的独立子站定位。"
  },
  {
    title: "Photos",
    href: "/photos",
    domain: "photo.maysssss.cn",
    description: "照片分组、城市筛选与中国地图足迹。"
  }
];

export default function PortalPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.kicker}>MAYS SITE</p>
        <h1 className={styles.title}>
          主站只做入口，Game 与 Photos 继续保持各自的子站语义。
        </h1>
        <p className={styles.description}>
          这次重构统一的是技术栈，不是把 `game.maysssss.cn` 的内容硬塞到主站首页。
          主站 `/` 现在作为门户页，业务模块仍然分开访问。
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
