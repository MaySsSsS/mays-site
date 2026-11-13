"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildGameStats,
  formatCompactHours,
  formatRelativePlayed,
  formatSyncDate,
  formatTotalHours,
  getGameHeaderImage,
  getRecentlyPlayedGames,
  getTopGames
} from "@/lib/game";
import { calculateLevelFromXp, calculateSteamProfileXp, getLevelStyle } from "@/lib/steam-level";
import { useSteamStore } from "@/stores/steam-store";
import type { GameData, SteamDataPayload } from "@/types/steam";

import styles from "@/styles/game/steamProfile.module.css";

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function storeUrl(appid: number) {
  return `https://store.steampowered.com/app/${appid}`;
}

function Capsule({ game }: Readonly<{ game: GameData }>) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className={styles.capsuleFallback} aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.capsule}
      src={getGameHeaderImage(game)}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function LevelRing({
  level,
  progress,
  color,
  glow
}: Readonly<{ level: number; progress: number; color: string; glow: string }>) {
  return (
    <div className={styles.levelRing} style={{ ["--ring-color" as string]: color, ["--ring-glow" as string]: glow }}>
      <svg viewBox="0 0 120 120" className={styles.ringSvg} role="img" aria-label={`Steam 等级 ${level}`}>
        <circle cx="60" cy="60" r={RING_RADIUS} className={styles.ringTrack} />
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          className={styles.ringProgress}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
        />
      </svg>
      <span className={styles.levelNumber}>{level}</span>
    </div>
  );
}

export function SteamProfile({
  initialData
}: Readonly<{
  initialData: SteamDataPayload;
}>) {
  const hydrate = useSteamStore((state) => state.hydrate);
  const fetchGamesData = useSteamStore((state) => state.fetchGamesData);
  const games = useSteamStore((state) => state.games);
  const playerInfo = useSteamStore((state) => state.playerInfo);
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

  const stats = useMemo(() => buildGameStats(currentGames), [currentGames]);
  const topGames = useMemo(() => getTopGames(currentGames, 8), [currentGames]);
  const recentGames = useMemo(() => getRecentlyPlayedGames(currentGames, 4), [currentGames]);

  const level = useMemo(
    () => calculateLevelFromXp(calculateSteamProfileXp(stats.totalGames, stats.totalPlaytime)),
    [stats.totalGames, stats.totalPlaytime]
  );
  const levelStyle = getLevelStyle(level.level);

  const isOnline = (currentPlayer?.personastate ?? 0) > 0;
  const bannerGame = topGames[0] ?? null;
  const mostPlayedHours = topGames[0]?.playtime_forever ?? 0;

  return (
    <div className={styles.layout}>
      {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}

      <div className={styles.main}>
        <section className={styles.profileCard}>
          <div
            className={styles.banner}
            style={bannerGame ? { backgroundImage: `url(${getGameHeaderImage(bannerGame)})` } : undefined}
            aria-hidden="true"
          />
          <div className={styles.bannerShade} aria-hidden="true" />

          <div className={styles.profileBody}>
            <div className={styles.avatarWrap} style={{ ["--ring-color" as string]: levelStyle.color }}>
              {currentPlayer?.avatarfull ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.avatar} src={currentPlayer.avatarfull} alt="" />
              ) : (
                <span className={styles.avatarFallback} aria-hidden="true" />
              )}
            </div>

            <div className={styles.identity}>
              <h1 className={styles.name}>{currentPlayer?.personaname ?? "Mays"}</h1>

              <p className={styles.statusLine}>
                <span
                  className={isOnline ? styles.statusDot : styles.statusDotOffline}
                  aria-hidden="true"
                />
                {isOnline ? "在线" : "离线"} · 等级 {level.level} · {stats.totalGames} 款游戏
              </p>

              <p className={styles.description}>
                总游玩时长 {formatTotalHours(stats.totalPlaytime)}
                {mostPlayedHours > 0
                  ? ` · 最常玩的是 ${topGames[0].name}（${formatCompactHours(mostPlayedHours)}）`
                  : ""}
              </p>

              <div className={styles.profileLinks}>
                {currentPlayer?.profileurl ? (
                  <a className={styles.primaryLink} href={currentPlayer.profileurl} target="_blank" rel="noreferrer">
                    打开 Steam 个人资料
                  </a>
                ) : null}
                <Link className={styles.ghostLink} href="/games/steam/library">
                  查看全部游戏
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.showcase} aria-labelledby="steam-recent">
          <div className={styles.showcaseHead}>
            <h2 id="steam-recent" className={styles.showcaseTitle}>
              最近游玩
            </h2>
            <Link className={styles.showcaseLink} href="/games/steam/library">
              查看全部
            </Link>
          </div>

          {recentGames.length === 0 ? (
            <p className={styles.emptyState}>近两周没有新的游玩记录</p>
          ) : (
            <div className={styles.capsuleRow}>
              {recentGames.map((game) => (
                <a
                  key={game.appid}
                  className={styles.capsuleCard}
                  href={storeUrl(game.appid)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Capsule game={game} />
                  <span className={styles.capsuleName}>{game.name}</span>
                  <span className={styles.capsuleMeta}>
                    {game.playtime_2weeks
                      ? `近两周 ${formatCompactHours(game.playtime_2weeks)}`
                      : formatCompactHours(game.playtime_forever)}
                    {game.rtime_last_played ? ` · ${formatRelativePlayed(game.rtime_last_played)}` : ""}
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className={styles.showcase} aria-labelledby="steam-top">
          <div className={styles.showcaseHead}>
            <h2 id="steam-top" className={styles.showcaseTitle}>
              游戏收藏家
            </h2>
            <span className={styles.showcaseHint}>按时长排序</span>
          </div>

          {topGames.length === 0 ? (
            <p className={styles.emptyState}>暂无时长记录</p>
          ) : (
            <ol className={styles.collectorList}>
              {topGames.map((game, index) => {
                const width =
                  mostPlayedHours > 0 ? Math.min((game.playtime_forever / mostPlayedHours) * 100, 100) : 0;

                return (
                  <li key={game.appid} className={styles.collectorItem}>
                    <span className={styles.collectorRank}>{String(index + 1).padStart(2, "0")}</span>
                    <a className={styles.collectorBody} href={storeUrl(game.appid)} target="_blank" rel="noreferrer">
                      <span className={styles.collectorRow}>
                        <span className={styles.collectorName}>{game.name}</span>
                        <span className={styles.collectorHours}>{formatCompactHours(game.playtime_forever)}</span>
                      </span>
                      <span className={styles.collectorBar}>
                        <span className={styles.collectorBarFill} style={{ width: `${width}%` }} />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <aside className={styles.rail}>
        <section className={styles.railCard}>
          <h2 className={styles.railTitle}>Steam 等级</h2>
          <div className={styles.levelBlock}>
            <LevelRing level={level.level} progress={level.progress} color={levelStyle.color} glow={levelStyle.glow} />
            <div className={styles.levelMeta}>
              <p className={styles.levelName}>{levelStyle.name}</p>
              <p className={styles.levelXp}>
                {level.currentLevelXp} / {level.nextLevelXp} XP
              </p>
              <span className={styles.levelBar}>
                <span
                  className={styles.levelBarFill}
                  style={{ width: `${Math.round(level.progress * 100)}%`, background: levelStyle.color }}
                />
              </span>
            </div>
          </div>
        </section>

        <section className={styles.railCard}>
          <h2 className={styles.railTitle}>统计</h2>
          <dl className={styles.statList}>
            <div className={styles.statRow}>
              <dt>游戏数</dt>
              <dd>{stats.totalGames}</dd>
            </div>
            <div className={styles.statRow}>
              <dt>总时长</dt>
              <dd>{formatTotalHours(stats.totalPlaytime)}</dd>
            </div>
            <div className={styles.statRow}>
              <dt>近两周</dt>
              <dd>{stats.recentlyPlayed}</dd>
            </div>
            <div className={styles.statRow}>
              <dt>快照</dt>
              <dd>{formatSyncDate(currentLastUpdated)}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.railCard}>
          <h2 className={styles.railTitle}>最近活动</h2>
          {recentGames.length === 0 ? (
            <p className={styles.railEmpty}>近两周没有新记录</p>
          ) : (
            <ul className={styles.activityList}>
              {recentGames.map((game) => (
                <li key={game.appid} className={styles.activityItem}>
                  <span className={styles.activityName}>{game.name}</span>
                  <span className={styles.activityMeta}>
                    {game.rtime_last_played ? formatRelativePlayed(game.rtime_last_played) : "—"}
                    {game.playtime_2weeks ? ` · ${formatCompactHours(game.playtime_2weeks)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}