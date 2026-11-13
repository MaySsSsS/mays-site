"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildGameStats,
  formatCompactHours,
  formatRelativePlayed,
  formatSyncDate,
  formatTotalHours,
  getGameCapsuleImage,
  getGameHeaderImage,
  getRecentlyPlayedGames,
  getTopGames
} from "@/lib/game";
import { useSteamStore } from "@/stores/steam-store";
import type { GameData, SteamDataPayload } from "@/types/steam";

import styles from "@/styles/game/steamHome.module.css";

function storeUrl(appid: number) {
  return `https://store.steampowered.com/app/${appid}`;
}

function GameCover({ game, variant }: Readonly<{ game: GameData; variant: "shelf" | "list" }>) {
  const [failed, setFailed] = useState(false);
  const source = variant === "shelf" ? getGameHeaderImage(game.appid) : getGameCapsuleImage(game.appid);

  if (failed) {
    // 部分条目在 Steam CDN 上没有封面（未发售 / 已下架），用首字母占位块顶住版式
    return (
      <span
        className={variant === "shelf" ? styles.cardArtFallback : styles.itemArtFallback}
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={variant === "shelf" ? styles.cardArt : styles.itemArt}
      src={source}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export function SteamHome({
  initialData
}: Readonly<{
  initialData: SteamDataPayload;
}>) {
  const hydrate = useSteamStore((state) => state.hydrate);
  const fetchGamesData = useSteamStore((state) => state.fetchGamesData);
  const games = useSteamStore((state) => state.games);
  const error = useSteamStore((state) => state.error);
  const lastUpdated = useSteamStore((state) => state.lastUpdated);

  const [query, setQuery] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  useEffect(() => {
    hydrate(initialData);
    if (initialData.games.length === 0) {
      void fetchGamesData();
    }
  }, [fetchGamesData, hydrate, initialData]);

  const currentGames = games.length > 0 ? games : initialData.games;
  const currentLastUpdated = lastUpdated ?? initialData.lastUpdated;

  const stats = useMemo(() => buildGameStats(currentGames), [currentGames]);
  const topGames = useMemo(() => getTopGames(currentGames), [currentGames]);
  const recentGames = useMemo(() => getRecentlyPlayedGames(currentGames), [currentGames]);

  const sortedGames = useMemo(
    () => [...currentGames].sort((a, b) => b.playtime_forever - a.playtime_forever),
    [currentGames]
  );

  const filteredGames = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return sortedGames;
    }

    return sortedGames.filter((game) => game.name.toLowerCase().includes(keyword));
  }, [query, sortedGames]);

  const selectedGame = useMemo(() => {
    if (selectedAppId !== null) {
      const picked = currentGames.find((game) => game.appid === selectedAppId);
      if (picked) {
        return picked;
      }
    }

    return recentGames[0] ?? sortedGames[0] ?? null;
  }, [currentGames, recentGames, selectedAppId, sortedGames]);

  return (
    <div className={styles.app}>
      {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}

      <aside className={styles.sidebar}>
        <div className={styles.sideHead}>
          <span className={styles.sideTitle}>游戏库</span>
          <span className={styles.sideCount}>
            {filteredGames.length} / {currentGames.length}
          </span>
        </div>

        <input
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索游戏"
          aria-label="搜索游戏"
        />

        <div className={styles.gameList} role="listbox" aria-label="游戏列表">
          {filteredGames.map((game) => {
            const active = selectedGame?.appid === game.appid;

            return (
              <button
                key={game.appid}
                type="button"
                role="option"
                aria-selected={active}
                className={active ? styles.itemActive : styles.item}
                onClick={() => setSelectedAppId(game.appid)}
              >
                <GameCover game={game} variant="list" />
                <span className={styles.itemBody}>
                  <span className={styles.itemName}>{game.name}</span>
                  <span className={styles.itemMeta}>
                    {game.playtime_forever > 0
                      ? formatCompactHours(game.playtime_forever)
                      : "尚未游玩"}
                  </span>
                </span>
              </button>
            );
          })}

          {filteredGames.length === 0 ? <p className={styles.listEmpty}>没有匹配的游戏</p> : null}
        </div>
      </aside>

      <main className={styles.main}>
        {selectedGame ? (
          <section className={styles.hero}>
            <div
              className={styles.heroArt}
              style={{ backgroundImage: `url(${getGameHeaderImage(selectedGame.appid)})` }}
              aria-hidden="true"
            />
            <div className={styles.heroShade} aria-hidden="true" />

            <div className={styles.heroBody}>
              <p className={styles.heroKicker}>
                在库中
                {selectedGame.rtime_last_played
                  ? ` · 最近游玩 ${formatRelativePlayed(selectedGame.rtime_last_played)}`
                  : ""}
              </p>
              <h1 className={styles.heroTitle}>{selectedGame.name}</h1>
              <p className={styles.heroMeta}>
                {formatTotalHours(selectedGame.playtime_forever)}
                {selectedGame.playtime_2weeks
                  ? ` · 近两周 ${formatCompactHours(selectedGame.playtime_2weeks)}`
                  : ""}
              </p>

              <div className={styles.heroActions}>
                <a
                  className={styles.playButton}
                  href={storeUrl(selectedGame.appid)}
                  target="_blank"
                  rel="noreferrer"
                >
                  在 Steam 打开
                </a>
                <Link className={styles.ghostButton} href="/games/steam/library">
                  浏览全部游戏
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.hero}>
            <div className={styles.heroBody}>
              <p className={styles.heroKicker}>STEAM_SNAPSHOT</p>
              <h1 className={styles.heroTitle}>还没有游玩记录</h1>
              <p className={styles.heroMeta}>Steam 快照里还没有可展示的游戏，稍后再来看看。</p>
            </div>
          </section>
        )}

        <dl className={styles.statStrip}>
          <div className={styles.statCell}>
            <dt>游戏数</dt>
            <dd>{stats.totalGames}</dd>
          </div>
          <div className={styles.statCell}>
            <dt>总时长</dt>
            <dd>{formatTotalHours(stats.totalPlaytime)}</dd>
          </div>
          <div className={styles.statCell}>
            <dt>近两周</dt>
            <dd>{stats.recentlyPlayed}</dd>
          </div>
          <div className={styles.statCell}>
            <dt>快照</dt>
            <dd>{formatSyncDate(currentLastUpdated)}</dd>
          </div>
        </dl>

        <section className={styles.shelf} aria-labelledby="steam-recent">
          <div className={styles.shelfHead}>
            <h2 id="steam-recent" className={styles.shelfTitle}>
              最近游玩
            </h2>
            <span className={styles.shelfHint}>近两周 {recentGames.length} 款</span>
          </div>

          {recentGames.length === 0 ? (
            <p className={styles.emptyState}>近两周没有新的游玩记录</p>
          ) : (
            <div className={styles.cardRow}>
              {recentGames.map((game) => (
                <a
                  key={game.appid}
                  className={styles.card}
                  href={storeUrl(game.appid)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <GameCover game={game} variant="shelf" />
                  <span className={styles.cardName}>{game.name}</span>
                  <span className={styles.cardMeta}>
                    {game.playtime_2weeks
                      ? `近两周 ${formatCompactHours(game.playtime_2weeks)}`
                      : formatCompactHours(game.playtime_forever)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className={styles.shelf} aria-labelledby="steam-top">
          <div className={styles.shelfHead}>
            <h2 id="steam-top" className={styles.shelfTitle}>
              最常游玩
            </h2>
            <span className={styles.shelfHint}>{topGames.length} 款</span>
          </div>

          {topGames.length === 0 ? (
            <p className={styles.emptyState}>暂无时长记录</p>
          ) : (
            <div className={styles.cardRow}>
              {topGames.map((game) => (
                <a
                  key={game.appid}
                  className={styles.card}
                  href={storeUrl(game.appid)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <GameCover game={game} variant="shelf" />
                  <span className={styles.cardName}>{game.name}</span>
                  <span className={styles.cardMeta}>{formatCompactHours(game.playtime_forever)}</span>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}