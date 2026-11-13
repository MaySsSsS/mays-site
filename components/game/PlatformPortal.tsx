import Link from "next/link";

import { PLATFORMS } from "@/lib/platforms";

import styles from "@/styles/game/portal.module.css";

const platformClass = {
  steam: styles.steam,
  nintendoswitch: styles.nintendo,
  playstation: styles.playstation
} as const;

export function PlatformPortal() {
  return (
    <main className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <span aria-hidden="true">←</span> 返回主站
        </Link>
        <span className={styles.logo}>
          <span className={styles.logoPrompt}>&gt;</span> MAYS://GAMES
        </span>
        <span className={styles.topMeta}>03 PLATFORMS</span>
      </header>

      <section className={styles.intro} aria-labelledby="platform-portal-title">
        <p className={styles.kicker}>SELECT_PLATFORM</p>
        <h1 id="platform-portal-title" className={styles.title}>
          选择平台
        </h1>
        <p className={styles.lead}>
          同一份游戏记录，三种平台界面。每个平台页都按各自主机的交互习惯重新排版。
        </p>
      </section>

      <section className={styles.plaza} aria-label="平台入口">
        {PLATFORMS.map((platform, index) => (
          <Link
            key={platform.key}
            href={platform.href}
            prefetch={false}
            className={`${styles.card} ${platformClass[platform.key]}`}
            aria-label={`进入 ${platform.name}`}
          >
            <span className={styles.cardGlow} aria-hidden="true" />

            <span className={styles.cardHead}>
              <span className={styles.eyebrow}>
                <span className={styles.cardIndex} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {platform.eyebrow}
              </span>
              <span className={styles.badge}>{platform.badge}</span>
            </span>

            <span className={styles.cardBody}>
              <span className={styles.name}>{platform.name}</span>
              <span className={styles.tagline}>{platform.tagline}</span>
              <span className={styles.description}>{platform.description}</span>
            </span>

            <span className={styles.cardFoot}>
              <span className={styles.route}>{platform.route}</span>
              <span className={styles.action}>
                进入 <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        ))}
      </section>

      <footer className={styles.note}>
        Steam 页读取真实快照；Nintendo Switch 与 PlayStation 页当前为演示布局，数据接入在后续版本。
      </footer>
    </main>
  );
}