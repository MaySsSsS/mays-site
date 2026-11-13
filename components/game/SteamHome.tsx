"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  formatActivityDate,
  formatCompactHours,
  formatRelativePlayed,
  formatSyncDate,
  formatTotalHours,
  getFeaturedGames,
  getGameHeaderImage,
  getRecentlyPlayedGames,
  getTopGames,
  buildGameStats
} from "@/lib/game";
import { useSteamStore } from "@/stores/steam-store";
import type { SteamDataPayload } from "@/types/steam";

import { FeaturedGame } from "./FeaturedGame";

import styles from "@/styles/game/steamHome.module.css";

export function SteamHome({
  initialData
}: Readonly<{
  initialData: SteamDataPayload;
}>) {
  const hydrate = useSteamStore((state) => state.hydrate);
  const fetchGamesData = useSteamStore((state) => state.fetchGamesData);
  const games = useSteamStore((state) => state.games);
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
  const currentLastUpdated = lastUpdated ?? initialData.lastUpdated;
  const stats = buildGameStats(currentGames);
  const topGames = getTopGames(currentGames);
  const recentGames = getRecentlyPlayedGames(currentGames);
  const featuredGames = getFeaturedGames(currentGames);
  const maxPlaytime = featuredGames[0]?.playtime_forever ?? 0;
  const continueGame = recentGames[0] ?? topGames[0] ?? null;

  return (
    <div className={styles.page}>
      {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        {continueGame ? (
          <div
            className={styles.heroArt}
            style={{ backgroundImage: `url(${getGameHeaderImage(continueGame.appid)})` }}
            aria-hidden="true"
          />
        ) : null}

        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>
            {continueGame ? "CONTINUE_PLAYING" : "STEAM_SNAPSHOT"}
          </p>
          <h1 className={styles.heroTitle}>
            {continueGame ? continueGame.name : "还没有游玩记录"}
          </h1>
          <p className={styles.heroMeta}>
            {continueGame
              ? `${formatCompactHours(continueGame.playtime_forever)} · 最近游玩 ${formatRelativePlayed(
                  continueGame.rtime_last_played ?? 0
                )}`
              : "Steam 快照里还没有可展示的游戏，稍后再来看看。"}
          </p>

          <div className={styles.heroActions}>
            {continueGame ? (
              <a
                href={`https://store.steampowered.com/app/${continueGame.appid}`}
                target="_blank"
                rel="noreferrer"
                className={styles.primaryAction}
              >
                打开商店页
              </a>
            ) : null}
            <Link href="/games/steam/library" className={styles.secondaryAction}>
              浏览游戏库
            </Link>
          </div>
        </div>

        <dl className={styles.heroStats}>
          <div className={styles.heroStat}>
            <dt>总游戏数</dt>
            <dd>{stats.totalGames}</dd>
          </div>
          <div className={styles.heroStat}>
            <dt>总时长</dt>
            <dd>{formatTotalHours(stats.totalPlaytime)}</dd>
          </div>
          <div className={styles.heroStat}>
            <dt>近两周</dt>
            <dd>{stats.recentlyPlayed}</dd>
          </div>
        </dl>

        {currentLastUpdated ? (
          <span className={styles.syncChip}>快照更新于 {formatSyncDate(currentLastUpdated)}</span>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="steam-top-games">
        <div className={styles.panelHead}>
          <h2 id="steam-top-games" className={styles.panelTitle}>
            最常游玩
          </h2>
          <span className={styles.panelHint}>{topGames.length} 款</span>
        </div>

        {topGames.length === 0 ? (
          <p className={styles.emptyState}>暂无时长记录</p>
        ) : (
          <div className={styles.topList}>
            {topGames.map((game, index) => {
              const width =
                stats.mostPlayed && stats.mostPlayed.playtime_forever > 0
                  ? Math.min((game.playtime_forever / stats.mostPlayed.playtime_forever) * 100, 100)
                  : 0;

              return (
                <a
                  key={game.appid}
                  href={`https://store.steampowered.com/app/${game.appid}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.topItem}
                >
                  <span className={styles.topRank}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.topBody}>
                    <span className={styles.topMeta}>
                      <span className={styles.topName}>{game.name}</span>
                      <span className={styles.topHours}>{formatCompactHours(game.playtime_forever)}</span>
                    </span>
                    <span className={styles.barTrack}>
                      <span className={styles.barFill} style={{ width: `${width}%` }} />
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="steam-recent">
        <div className={styles.panelHead}>
          <h2 id="steam-recent" className={styles.panelTitle}>
            最近动态
          </h2>
          <span className={styles.panelHint}>近两周</span>
        </div>

        {recentGames.length === 0 ? (
          <p className={styles.emptyState}>近两周没有新的游玩记录</p>
        ) : (
          <div className={styles.recentList}>
            {recentGames.map((game) => (
              <a
                key={game.appid}
                href={`https://store.steampowered.com/app/${game.appid}`}
                target="_blank"
                rel="noreferrer"
                className={styles.recentItem}
              >
                <span className={styles.recentDate}>
                  {game.rtime_last_played ? formatActivityDate(game.rtime_last_played) : "--"}
                </span>
                <span className={styles.recentBody}>
                  <span className={styles.recentName}>{game.name}</span>
                  {game.rtime_last_played ? (
                    <span className={styles.recentMeta}>
                      {formatRelativePlayed(game.rtime_last_played)}
                    </span>
                  ) : null}
                </span>
                {game.playtime_2weeks ? (
                  <span className={styles.recentPlaytime}>
                    {formatCompactHours(game.playtime_2weeks)}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="steam-featured">
        <div className={styles.panelHead}>
          <h2 id="steam-featured" className={styles.panelTitle}>
            精选游戏
          </h2>
          <span className={styles.panelHint}>按总时长</span>
        </div>

        {featuredGames.length === 0 ? (
          <p className={styles.emptyState}>暂无精选</p>
        ) : (
          <div className={styles.featuredGrid}>
            {featuredGames.map((game) => (
              <FeaturedGame key={game.appid} game={game} maxPlaytime={maxPlaytime} />
            ))}
          </div>
        )}
      </section>

      {loading && currentGames.length === 0 ? (
        <div className={styles.loadingOverlay}>LOADING</div>
      ) : null}
    </div>
  );
}