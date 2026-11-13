"use client";

import { useState } from "react";

import {
  formatCompactHours,
  formatRelativePlayed,
  getGameHeaderImage
} from "@/lib/game";
import type { GameData } from "@/types/steam";

import styles from "@/styles/game/GameCard.module.css";

export function GameCard({
  game,
  showRecent = true
}: Readonly<{
  game: GameData;
  showRecent?: boolean;
}>) {
  const [artFailed, setArtFailed] = useState(false);

  return (
    <a
      href={`https://store.steampowered.com/app/${game.appid}`}
      target="_blank"
      rel="noreferrer"
      className={styles.card}
    >
      <div className={styles.topBar}>
        <span className={styles.tag}>PID:{game.appid}</span>
        <span className={styles.playtime}>{formatCompactHours(game.playtime_forever)}</span>
      </div>

      <div className={styles.imageWrap}>
        {artFailed ? (
          <div className={styles.artFallback}>MAYS://NO_ART</div>
        ) : (
          <img
            src={getGameHeaderImage(game.appid)}
            alt={game.name}
            className={styles.image}
            loading="lazy"
            onError={() => setArtFailed(true)}
          />
        )}
        <div className={styles.overlay}>▶ 打开商店</div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{game.name}</h3>
        <div className={styles.meta}>
          {showRecent && game.playtime_2weeks ? (
            <span className={styles.metaItem}>
              近两周 <span className={styles.metaKey}>{formatCompactHours(game.playtime_2weeks)}</span>
            </span>
          ) : null}
          {game.rtime_last_played ? (
            <span className={styles.metaItem}>
              最近游玩 {formatRelativePlayed(game.rtime_last_played)}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
