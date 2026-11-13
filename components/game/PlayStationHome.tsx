"use client";

import { useEffect, useState } from "react";

import { PlatformLogo } from "@/components/game/PlatformLogo";
import { FriendsPanel, PartyPanel, TrophyPanel } from "@/components/game/PlayStationPanels";
import { PLAYSTATION_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/playstationHome.module.css";

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlayStationHome() {
  const [activeIndex, setActiveIndex] = useState(0);

  const total = PLAYSTATION_DEMO_GAMES.length;
  const active = PLAYSTATION_DEMO_GAMES[activeIndex] ?? PLAYSTATION_DEMO_GAMES[0];

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

  return (
    <div
      className={styles.home}
      style={{ "--ps-accent": active?.accent ?? "#2f6bff" } as React.CSSProperties}
    >
      <div className={styles.backdrops} aria-hidden="true">
        {PLAYSTATION_DEMO_GAMES.map((game, index) => (
          <div
            key={game.id}
            className={index === activeIndex ? styles.backdropActive : styles.backdrop}
            style={{ backgroundImage: `url(${game.banner})` }}
          />
        ))}
      </div>

      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.rail} role="group" aria-label="游戏">
          {PLAYSTATION_DEMO_GAMES.map((game, index) => {
            const selected = index === activeIndex;

            return (
              <button
                key={game.id}
                type="button"
                className={`${styles.card} ${selected ? styles.cardActive : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-pressed={selected}
                aria-label={game.title}
              >
                <span
                  className={styles.cardArt}
                  style={{ backgroundImage: `url(${game.banner})` }}
                />
              </button>
            );
          })}
        </div>

        <div className={styles.spacer} />

        <div className={styles.bottom}>
          <div className={styles.info}>
            {active ? (
              <PlatformLogo
                key={active.id}
                className={styles.logo}
                src={active.logo}
                alt={active.title}
              />
            ) : null}

            <div className={styles.actions}>
              <button type="button" className={styles.play}>
                <CrossIcon />
                开始游玩
              </button>
              <button type="button" className={styles.more} aria-label="更多选项">
                ···
              </button>
            </div>

            <PartyPanel />
          </div>

          <div className={styles.side}>
            <FriendsPanel />
            <TrophyPanel />

            <div className={styles.dots} role="tablist" aria-label="切换游戏">
              {PLAYSTATION_DEMO_GAMES.map((game, index) => (
                <button
                  key={game.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={game.title}
                  className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ""}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}