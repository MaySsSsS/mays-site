"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { buildGameStats, formatTotalHours } from "@/lib/game";
import { useSteamStore } from "@/stores/steam-store";
import type { SteamDataPayload } from "@/types/steam";

import { GameCard } from "./GameCard";

import styles from "@/styles/game/library.module.css";

type SortMode = "playtime" | "name" | "recent";

export function GameLibrary({
  initialData
}: Readonly<{
  initialData: SteamDataPayload;
}>) {
  const hydrate = useSteamStore((state) => state.hydrate);
  const fetchGamesData = useSteamStore((state) => state.fetchGamesData);
  const games = useSteamStore((state) => state.games);
  const loading = useSteamStore((state) => state.loading);
  const error = useSteamStore((state) => state.error);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("playtime");
  const [showOnlyPlayed, setShowOnlyPlayed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const deferredQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const gamesPerPage = 24;

  useEffect(() => {
    hydrate(initialData);
    if (initialData.games.length === 0) {
      void fetchGamesData();
    }
  }, [fetchGamesData, hydrate, initialData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredQuery, showOnlyPlayed, sortBy]);

  const currentGames = games.length > 0 ? games : initialData.games;
  const stats = buildGameStats(currentGames);

  let filteredGames = [...currentGames];
  if (deferredQuery) {
    filteredGames = filteredGames.filter((game) =>
      game.name.toLowerCase().includes(deferredQuery)
    );
  }
  if (showOnlyPlayed) {
    filteredGames = filteredGames.filter((game) => game.playtime_forever > 0);
  }

  filteredGames.sort((left, right) => {
    switch (sortBy) {
      case "name":
        return left.name.localeCompare(right.name);
      case "recent":
        return (right.rtime_last_played ?? 0) - (left.rtime_last_played ?? 0);
      case "playtime":
      default:
        return right.playtime_forever - left.playtime_forever;
    }
  });

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGames = filteredGames.slice(
    (safePage - 1) * gamesPerPage,
    safePage * gamesPerPage
  );

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.sectionHeader}>
            <span>GAME_LIBRARY</span>
            <span className={styles.sectionLine} />
            <span className={styles.sectionStatus}>
              {stats.totalGames} MODULES / {formatTotalHours(stats.totalPlaytime)}H TOTAL
            </span>
          </div>
          <p className={styles.headerText}>
            按游戏时长、最近游玩和名称检索整个游戏库，快速定位常玩的作品。
          </p>
        </div>
      </section>

      <section className={styles.filters}>
        <div className={styles.filtersBar}>
          <label className={styles.searchBox}>
            <span className={styles.searchPrompt}>&gt;</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="SEARCH"
              className={styles.searchInput}
            />
          </label>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortMode)}
            className={styles.sortSelect}
          >
            <option value="playtime">BY_PLAYTIME</option>
            <option value="name">BY_NAME</option>
            <option value="recent">BY_RECENT</option>
          </select>

          <button
            type="button"
            className={`${styles.filterButton} ${
              showOnlyPlayed ? styles.filterButtonActive : ""
            }`}
            onClick={() => setShowOnlyPlayed((value) => !value)}
          >
            {showOnlyPlayed ? "[x]" : "[ ]"} PLAYED_ONLY
          </button>
        </div>
      </section>

      <section className={styles.library}>
        {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}
        <div className={styles.resultCount}>
          {"// DISPLAYING "}
          {filteredGames.length}
          {" OF "}
          {stats.totalGames}
          {" MODULES"}
        </div>

        {loading && currentGames.length === 0 ? (
          <div className={styles.loadingState}>LOADING</div>
        ) : null}

        {!loading && filteredGames.length === 0 ? (
          <div className={styles.emptyState}>{"// NO_RESULTS_FOUND"}</div>
        ) : (
          <div className={styles.grid}>
            {paginatedGames.map((game) => (
              <GameCard key={game.appid} game={game} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              [PREV]
            </button>
            <span className={styles.pageInfo}>
              {safePage}/{totalPages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              disabled={safePage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              [NEXT]
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
