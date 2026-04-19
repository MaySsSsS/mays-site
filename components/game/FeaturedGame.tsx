import {
  formatCompactHours,
  formatRelativePlayed,
  getGameHeaderImage
} from "@/lib/game";
import type { GameData } from "@/types/steam";

import styles from "@/styles/game/FeaturedGame.module.css";

export function FeaturedGame({
  game,
  maxPlaytime
}: Readonly<{
  game: GameData;
  maxPlaytime: number;
}>) {
  const progress = maxPlaytime
    ? Math.min((game.playtime_forever / maxPlaytime) * 100, 100)
    : 0;

  return (
    <a
      href={`https://store.steampowered.com/app/${game.appid}`}
      target="_blank"
      rel="noreferrer"
      className={styles.card}
    >
      <div className={styles.topBar}>PID:{game.appid}</div>
      <div className={styles.imageWrap}>
        <img
          src={getGameHeaderImage(game.appid)}
          alt={game.name}
          className={styles.image}
        />
        <div className={styles.overlay}>▶ RUN</div>
      </div>
      <div className={styles.content}>
        <h3 className={styles.name}>{game.name}</h3>
        <div className={styles.stats}>
          <span className={styles.stat}>TIME: {formatCompactHours(game.playtime_forever)}</span>
          {game.rtime_last_played ? (
            <span className={styles.stat}>LAST: {formatRelativePlayed(game.rtime_last_played)}</span>
          ) : null}
        </div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </a>
  );
}
