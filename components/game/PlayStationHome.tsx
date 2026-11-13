"use client";

import { useEffect, useState } from "react";

import { PLAYSTATION_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/playstationHome.module.css";

export function PlayStationHome() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const active = PLAYSTATION_DEMO_GAMES[activeIndex] ?? null;
  const total = PLAYSTATION_DEMO_GAMES.length;

  useEffect(() => {
    if (total === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % total);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((index) => (index - 1 + total) % total);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total]);

  if (!active) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>还没有游戏</p>
        <p className={styles.emptyText}>接入 PSN 账号后，这里会显示真实的奖杯进度与游玩时长。</p>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ "--ps-accent": active.accent } as React.CSSProperties}>
      <section className={styles.hero} aria-label={`正在浏览 ${active.title}`}>
        <div className={styles.backdrops} aria-hidden="true">
          {PLAYSTATION_DEMO_GAMES.map((game, index) => (
            <div
              key={game.id}
              className={index === activeIndex ? styles.backdropActive : styles.backdrop}
              style={{ backgroundImage: `url(${game.banner})` }}
            />
          ))}
        </div>
        <div className={styles.heroShade} aria-hidden="true" />

        <div className={styles.heroContent}>
          <p className={styles.kicker}>
            PLAYSTATION 5 · {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </p>
          {active.logo ? (
            // 演示 logo 为本地静态图，且多为黑底亮字：screen 混合可去掉黑框
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.logo} alt={active.title} className={`${styles.logo} ${styles.logoScreen}`} />
          ) : (
            <h1 className={styles.title}>{active.title}</h1>
          )}
          <p className={styles.meta}>
            {active.genre} · {active.status}
          </p>

          <div className={styles.progressTrack} aria-hidden="true">
            <span className={styles.progressFill} style={{ width: `${active.progress}%` }} />
          </div>

          <dl className={styles.stats}>
            <div>
              <dt>游玩时长</dt>
              <dd>{active.hoursPlayed} 小时</dd>
            </div>
            <div>
              <dt>占用容量</dt>
              <dd>{active.size}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{active.installed ? "已安装" : "未安装"}</dd>
            </div>
            <div>
              <dt>进度</dt>
              <dd>{active.progress}%</dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => setNotice("演示数据：尚未接入 PSN 账号，无法真正启动游戏。")}
            >
              继续游戏
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => setNotice("演示数据：奖杯、好友动态等详情接入后开放。")}
            >
              查看详情
            </button>
          </div>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
        </div>

        <p className={styles.heroHint}>← → 切换游戏 · 点击媒体栏选中</p>
      </section>

      <section className={styles.mediaBar} aria-label="游戏媒体栏">
        {PLAYSTATION_DEMO_GAMES.map((game, index) => (
          <button
            key={game.id}
            type="button"
            className={index === activeIndex ? styles.mediaActive : styles.media}
            onClick={() => {
              setActiveIndex(index);
              setNotice(null);
            }}
            aria-pressed={index === activeIndex}
            aria-label={`选择 ${game.title}`}
          >
            <span
              className={styles.mediaThumb}
              style={{ backgroundImage: `url(${game.banner})` }}
              aria-hidden="true"
            />
            <span className={styles.mediaLabel}>{game.title}</span>
            <span className={styles.mediaMeta}>{game.genre}</span>
          </button>
        ))}
      </section>

      <section className={styles.library} aria-label="演示游戏库">
        <header className={styles.libraryHead}>
          <h2 className={styles.libraryTitle}>游戏库</h2>
          <span className={styles.libraryHint}>演示数据 · {total} 款</span>
        </header>
        <ul className={styles.libraryList}>
          {PLAYSTATION_DEMO_GAMES.map((game, index) => (
            <li key={game.id}>
              <button
                type="button"
                className={`${styles.libraryRow} ${index === activeIndex ? styles.libraryRowActive : ""}`}
                onClick={() => {
                  setActiveIndex(index);
                  setNotice(null);
                }}
              >
                <span
                  className={styles.libraryThumb}
                  style={{ backgroundImage: `url(${game.banner})` }}
                  aria-hidden="true"
                />
                <span className={styles.libraryBody}>
                  <span className={styles.libraryName}>{game.title}</span>
                  <span className={styles.libraryGenre}>{game.genre}</span>
                </span>
                <span className={styles.libraryProgress}>
                  <span className={styles.libraryTrack}>
                    <span style={{ width: `${game.progress}%`, background: game.accent }} />
                  </span>
                  {game.progress}%
                </span>
                <span className={styles.libraryHours}>{game.hoursPlayed} 小时</span>
                <span className={styles.librarySize}>{game.size}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}