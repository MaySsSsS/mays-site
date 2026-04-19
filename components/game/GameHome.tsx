"use client";

import { useEffect } from "react";

import {
  buildGameStats,
  formatActivityDate,
  formatCompactHours,
  formatRelativePlayed,
  formatSyncDate,
  formatTotalHours,
  getFeaturedGames,
  getRecentlyPlayedGames,
  getTopGames
} from "@/lib/game";
import { useSteamStore } from "@/stores/steam-store";
import type { SteamDataPayload } from "@/types/steam";

import { FeaturedGame } from "./FeaturedGame";

import styles from "@/styles/game/home.module.css";

export function GameHome({
  initialData
}: Readonly<{
  initialData: SteamDataPayload;
}>) {
  const hydrate = useSteamStore((state) => state.hydrate);
  const fetchGamesData = useSteamStore((state) => state.fetchGamesData);
  const games = useSteamStore((state) => state.games);
  const playerInfo = useSteamStore((state) => state.playerInfo);
  const loading = useSteamStore((state) => state.loading);
  const error = useSteamStore((state) => state.error);
  const lastUpdated = useSteamStore((state) => state.lastUpdated);

  useEffect(() => {
    hydrate(initialData);
    if (initialData.games.length === 0) {
      void fetchGamesData();
    }
  }, [fetchGamesData, hydrate, initialData]);

  const currentGames = games.length > 0 ? games : initialData.games;
  const currentPlayer = playerInfo ?? initialData.player;
  const currentLastUpdated = lastUpdated ?? initialData.lastUpdated;
  const stats = buildGameStats(currentGames);
  const topGames = getTopGames(currentGames);
  const recentGames = getRecentlyPlayedGames(currentGames);
  const featuredGames = getFeaturedGames(currentGames);
  const maxPlaytime = featuredGames[0]?.playtime_forever ?? 0;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBackdrop} />
        <div className={styles.heroGrid} />
        <div className={styles.heroContent}>
          <div className={styles.heroProfile}>
            {currentPlayer ? (
              <div className={styles.avatarFrame}>
                <img
                  src={currentPlayer.avatarfull}
                  alt={currentPlayer.personaname}
                  className={styles.avatar}
                />
                <span className={styles.avatarDot} />
              </div>
            ) : null}

            <div>
              <div className={styles.statusPath}>
                STEAM://{currentPlayer?.personaname ?? "LOADING..."}
              </div>
              <div className={styles.statusMeta}>
                {currentLastUpdated ? `LAST_SYNC: ${formatSyncDate(currentLastUpdated)}` : "SNAPSHOT_READY"}
              </div>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.kicker}>GAME</p>
            <h1 className={styles.title}>最近在玩什么</h1>
            <p className={styles.subtitle}>
              看总时长、最近游玩和最常打开的游戏，快速回到熟悉的作品。
            </p>
          </div>
        </div>
      </section>

      {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>SYSTEM_OVERVIEW</span>
          <span className={styles.sectionLine} />
          <span className={styles.sectionStatus}>ACTIVE</span>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.totalGames}</span>
            <span className={styles.statLabel}>TOTAL_GAMES</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{formatTotalHours(stats.totalPlaytime)}</span>
            <span className={styles.statLabel}>TOTAL_HOURS</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats.recentlyPlayed}</span>
            <span className={styles.statLabel}>RECENT_2W</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {stats.mostPlayed?.name.slice(0, 12) ?? "---"}
            </span>
            <span className={styles.statLabel}>TOP_PROCESS</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>TOP_PROCESSES</span>
          <span className={styles.sectionLine} />
          <span className={styles.sectionStatus}>{topGames.length} RESULTS</span>
        </div>
        <div className={styles.processList}>
          {topGames.map((game, index) => {
            const width = stats.mostPlayed && stats.mostPlayed.playtime_forever > 0
              ? Math.min((game.playtime_forever / stats.mostPlayed.playtime_forever) * 100, 100)
              : 0;

            return (
              <a
                key={game.appid}
                href={`https://store.steampowered.com/app/${game.appid}`}
                target="_blank"
                rel="noreferrer"
                className={styles.processItem}
              >
                <span className={styles.processRank}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className={styles.processBody}>
                  <div className={styles.processMeta}>
                    <span className={styles.processName}>{game.name}</span>
                    <span className={styles.processHours}>
                      {formatCompactHours(game.playtime_forever)}
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${width}%` }} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>RECENT_ACTIVITY</span>
          <span className={styles.sectionLine} />
          <span className={styles.sectionStatus}>LIVE</span>
        </div>
        <div className={styles.activityList}>
          {recentGames.map((game) => (
            <a
              key={game.appid}
              href={`https://store.steampowered.com/app/${game.appid}`}
              target="_blank"
              rel="noreferrer"
              className={styles.activityItem}
            >
              <div className={styles.activityMarker} />
              <div className={styles.activityDate}>
                {game.rtime_last_played ? formatActivityDate(game.rtime_last_played) : "--"}
              </div>
              <div className={styles.activityBody}>
                <span className={styles.activityName}>{game.name}</span>
                {game.rtime_last_played ? (
                  <span className={styles.activityMeta}>
                    {formatRelativePlayed(game.rtime_last_played)}
                  </span>
                ) : null}
                {game.playtime_2weeks ? (
                  <span className={styles.activityPlaytime}>
                    {formatCompactHours(game.playtime_2weeks)}
                  </span>
                ) : null}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>FEATURED_MODULES</span>
          <span className={styles.sectionLine} />
          <span className={styles.sectionStatus}>CURATED</span>
        </div>
        <div className={styles.featuredGrid}>
          {featuredGames.map((game) => (
            <FeaturedGame key={game.appid} game={game} maxPlaytime={maxPlaytime} />
          ))}
        </div>
      </section>

      {loading && currentGames.length === 0 ? (
        <div className={styles.loadingOverlay}>LOADING</div>
      ) : null}
    </div>
  );
}
