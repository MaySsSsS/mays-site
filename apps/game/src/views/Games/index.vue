<template>
  <MainLayout>
    <div class="games-page">
      <!-- 页头 -->
      <section class="page-header">
        <div class="container">
          <div class="terminal-header">
            <span>GAME_LIBRARY</span>
            <span class="header-line"></span>
            <span class="header-status"
              >{{ steamStore.gameStats.totalGames }} MODULES /
              {{ formatTotalHours }}H TOTAL</span
            >
          </div>
        </div>
      </section>

      <!-- 筛选栏 -->
      <section class="filters-section">
        <div class="container">
          <div class="filters-bar">
            <div class="search-box">
              <span class="search-prompt">&gt;</span>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="SEARCH"
                class="search-input"
              />
              <span class="search-cursor" v-if="!searchQuery">_</span>
            </div>
            <div class="sort-options">
              <select v-model="sortBy" class="sort-select">
                <option value="playtime">BY_PLAYTIME</option>
                <option value="name">BY_NAME</option>
                <option value="recent">BY_RECENT</option>
              </select>
            </div>
            <button
              class="filter-btn"
              :class="{ active: showOnlyPlayed }"
              @click="showOnlyPlayed = !showOnlyPlayed"
            >
              <span class="filter-indicator">{{
                showOnlyPlayed ? "[x]" : "[ ]"
              }}</span>
              PLAYED_ONLY
            </button>
          </div>
        </div>
      </section>

      <!-- 游戏列表 -->
      <section class="games-section">
        <div class="container">
          <div class="result-count">
            // DISPLAYING {{ filteredGames.length }} OF
            {{ steamStore.gameStats.totalGames }} MODULES
          </div>

          <div class="games-grid" v-if="!steamStore.loading">
            <GameCard
              v-for="game in paginatedGames"
              :key="game.appid"
              :game="game"
            />
          </div>

          <div class="loading-state" v-else>
            <div class="loader"></div>
            <span>LOADING<span class="blink-cursor"></span></span>
          </div>

          <div
            class="empty-state"
            v-if="!steamStore.loading && filteredGames.length === 0"
          >
            <span>// NO_RESULTS_FOUND</span>
          </div>

          <!-- 分页 -->
          <div class="pagination" v-if="totalPages > 1">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              [PREV]
            </button>
            <span class="page-info">
              {{ currentPage }}/{{ totalPages }}
            </span>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              [NEXT]
            </button>
          </div>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useSteamStore, GameCard } from "@mays/shared";
import MainLayout from "@/layouts/MainLayout.vue";

const steamStore = useSteamStore();

const searchQuery = ref("");
const sortBy = ref<"playtime" | "name" | "recent">("playtime");
const showOnlyPlayed = ref(false);
const currentPage = ref(1);
const gamesPerPage = 24;

const formatTotalHours = computed(() => {
  return Math.floor(steamStore.gameStats.totalPlaytime / 60).toLocaleString();
});

const filteredGames = computed(() => {
  let games = [...steamStore.games];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    games = games.filter((g) => g.name.toLowerCase().includes(query));
  }

  if (showOnlyPlayed.value) {
    games = games.filter((g) => g.playtime_forever > 0);
  }

  switch (sortBy.value) {
    case "playtime":
      games.sort((a, b) => b.playtime_forever - a.playtime_forever);
      break;
    case "name":
      games.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "recent":
      games.sort(
        (a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0)
      );
      break;
  }

  return games;
});

const totalPages = computed(() =>
  Math.ceil(filteredGames.value.length / gamesPerPage)
);

const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * gamesPerPage;
  return filteredGames.value.slice(start, start + gamesPerPage);
});

watch([searchQuery, sortBy, showOnlyPlayed], () => {
  currentPage.value = 1;
});

onMounted(() => {
  if (steamStore.games.length === 0) {
    steamStore.fetchGamesData();
  }
});
</script>

<style scoped>
.games-page {
  min-height: 100vh;
  padding-bottom: 3rem;
  background: var(--bg-darker);
}

/* ========== 页头 ========== */
.page-header {
  padding: 2rem 0;
  border-bottom: 1px solid var(--border-dim);
}

/* ========== 筛选栏 ========== */
.filters-section {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--border-dim);
}

.filters-bar {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.75rem;
  background: var(--bg-medium);
  border: 1px solid var(--border-dim);
  font-family: var(--font-mono);
  transition: border-color 0.2s ease;
}

.search-box:focus-within {
  border-color: var(--neon-green);
  box-shadow: 0 0 8px rgba(0, 255, 159, 0.1);
}

.search-prompt {
  color: var(--text-muted);
  margin-right: 0.5rem;
  font-size: 0.8rem;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--neon-green);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  outline: none;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.search-input::placeholder {
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.search-cursor {
  color: var(--neon-green);
  animation: cursor-blink 1s step-end infinite;
}

/* 排序 */
.sort-select {
  background: var(--bg-medium);
  border: 1px solid var(--border-dim);
  padding: 0.5rem 0.75rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.sort-select:hover,
.sort-select:focus {
  border-color: var(--neon-green);
}

.sort-select option {
  background: var(--bg-dark);
}

/* 筛选按钮 */
.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg-medium);
  border: 1px solid var(--border-dim);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--border-subtle);
  color: var(--text-secondary);
}

.filter-btn.active {
  border-color: var(--neon-green);
  color: var(--neon-green);
  background: rgba(0, 255, 159, 0.05);
}

.filter-indicator {
  font-size: 0.7rem;
}

/* ========== 游戏列表 ========== */
.games-section {
  padding: 1.25rem 0;
}

.result-count {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1px;
  background: var(--border-dim);
}

/* 加载/空状态 */
.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 4rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.1em;
}

/* ========== 分页 ========== */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding: 1rem;
  font-family: var(--font-mono);
}

.page-btn {
  padding: 0.4rem 0.8rem;
  background: var(--bg-medium);
  border: 1px solid var(--border-dim);
  color: var(--neon-green);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--neon-green);
  box-shadow: var(--glow-green);
}

.page-btn:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.page-info {
  font-size: 0.8rem;
  color: var(--text-secondary);
  letter-spacing: 0.1em;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .filters-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    min-width: auto;
  }

  .games-grid {
    grid-template-columns: 1fr;
  }
}
</style>
