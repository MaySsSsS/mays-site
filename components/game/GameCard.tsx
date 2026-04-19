import {
  formatCompactHours,
  formatPlaytime,
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
  return (
    <a
      href={`https://store.steampowered.com/app/${game.appid}`}
      target="_blank"
      rel="noreferrer"
      className={styles.card}
    >
      <div className={styles.topBar}>
        <span className={styles.tag}>PID:{game.appid}</span>
        <span className={styles.playtime}>{formatPlaytime(game.playtime_forever)}</span>
      </div>

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
        <div className={styles.meta}>
          {showRecent && game.playtime_2weeks ? (
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>2W:</span>
              {formatCompactHours(game.playtime_2weeks)}
            </span>
          ) : null}
          {game.rtime_last_played ? (
            <span className={styles.metaItem}>
              <span className={styles.metaKey}>LAST:</span>
              {formatRelativePlayed(game.rtime_last_played)}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
