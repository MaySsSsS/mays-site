"use client";

import { useEffect, useState } from "react";

import { PLAYSTATION_DEMO_GAMES } from "@/lib/demo-games";

import styles from "@/styles/game/playstationHome.module.css";

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

      {active ? <p className={styles.title}>{active.title}</p> : null}

      <div className={styles.dock} role="group" aria-label="游戏">
        {PLAYSTATION_DEMO_GAMES.map((game, index) => {
          const selected = index === activeIndex;

          return (
            <button
              key={game.id}
              type="button"
              className={`${styles.tile} ${selected ? styles.tileActive : ""}`}
              style={{ backgroundImage: `url(${game.banner})` }}
              onClick={() => setActiveIndex(index)}
              aria-pressed={selected}
              aria-label={game.title}
            />
          );
        })}
      </div>
    </div>
  );
}