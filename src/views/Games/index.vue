<template>
  <MainLayout>
    <div class="games-page">
      <!-- Page Header -->
      <section class="page-header">
        <h1 class="page-title">
          <span class="title-icon">🎮</span>
          我的游戏库
        </h1>
        <p class="page-subtitle">
          收藏了 {{ steamStore.gameStats.totalGames }} 款游戏， 累计游玩
          {{ formatTotalHours }} 小时
        </p>
      </section>

      <!-- Filters & Sort -->
      <section class="filters-section">
        <div class="container">
          <div class="filters-bar">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="搜索游戏..."
                class="search-input"
              />
            </div>
            <div class="sort-options">
              <label class="sort-label">排序：</label>
              <select v-model="sortBy" class="sort-select">
                <option value="playtime">游玩时长</option>
                <option value="name">名称</option>
                <option value="recent">最近游玩</option>
              </select>
            </div>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: showOnlyPlayed }"
                @click="showOnlyPlayed = !showOnlyPlayed"
              >
                仅显示玩过的
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Games Grid -->
      <section class="games-section">
        <div class="container">
          <div class="games-count">显示 {{ filteredGames.length }} 款游戏</div>

          <div class="games-grid" v-if="!steamStore.loading">
            <GameCard
              v-for="game in paginatedGames"
              :key="game.appid"
              :game="game"
            />
          </div>

          <div class="loading-state" v-else>
            <div class="loader"></div>
            <p>加载游戏数据中...</p>
          </div>

          <div
            class="empty-state"
            v-if="!steamStore.loading && filteredGames.length === 0"
          >
            <span class="empty-icon">🎯</span>
            <p>没有找到匹配的游戏</p>
          </div>

          <!-- Pagination -->
          <div class="pagination" v-if="totalPages > 1">
            <button
              class="page-btn"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              ← 上一页
            </button>
            <span class="page-info">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              class="page-btn"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              下一页 →
            </button>
          </div>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useSteamStore } from "@/stores/steam";
import MainLayout from "@/layouts/MainLayout.vue";
import GameCard from "@/components/game/GameCard.vue";

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

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    games = games.filter((g) => g.name.toLowerCase().includes(query));
  }

  // 只显示玩过的
  if (showOnlyPlayed.value) {
    games = games.filter((g) => g.playtime_forever > 0);
  }

  // 排序
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

const totalPages = computed(() => {
  return Math.ceil(filteredGames.value.length / gamesPerPage);
});

const paginatedGames = computed(() => {
  const start = (currentPage.value - 1) * gamesPerPage;
  return filteredGames.value.slice(start, start + gamesPerPage);
});

// 重置分页当过滤条件改变时
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
  padding-bottom: 4rem;
}

/* Page Header */
.page-header {
  padding: 4rem 2rem;
  text-align: center;
  background: linear-gradient(
    180deg,
    rgba(102, 192, 244, 0.1) 0%,
    transparent 100%
  );
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 2.5rem;
  font-weight: 700;
  color: #e6edf3;
  margin-bottom: 1rem;
}

.title-icon {
  font-size: 2rem;
}

.page-subtitle {
  color: #8b949e;
  font-size: 1.1rem;
}

/* Filters Section */
.filters-section {
  padding: 0 2rem;
  margin-bottom: 2rem;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.filters-bar {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 1.5rem;
  background: rgba(22, 27, 34, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(102, 192, 244, 0.1);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 250px;
  background: rgba(13, 17, 23, 0.8);
  border-radius: 12px;
  padding: 0 1rem;
  border: 1px solid rgba(102, 192, 244, 0.1);
  transition: border-color 0.3s ease;
}

.search-box:focus-within {
  border-color: #66c0f4;
}

.search-icon {
  font-size: 1.1rem;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  padding: 0.875rem 0;
  color: #e6edf3;
  font-size: 1rem;
  outline: none;
}

.search-input::placeholder {
  color: #8b949e;
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-label {
  color: #8b949e;
  font-size: 0.9rem;
}

.sort-select {
  background: rgba(13, 17, 23, 0.8);
  border: 1px solid rgba(102, 192, 244, 0.2);
  border-radius: 8px;
  padding: 0.625rem 1rem;
  color: #e6edf3;
  font-size: 0.9rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.3s ease;
}

.sort-select:hover,
.sort-select:focus {
  border-color: #66c0f4;
}

.filter-btn {
  background: rgba(102, 192, 244, 0.1);
  border: 1px solid rgba(102, 192, 244, 0.2);
  border-radius: 8px;
  padding: 0.625rem 1rem;
  color: #8b949e;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: rgba(102, 192, 244, 0.15);
  color: #66c0f4;
}

.filter-btn.active {
  background: rgba(102, 192, 244, 0.2);
  border-color: #66c0f4;
  color: #66c0f4;
}

/* Games Section */
.games-section {
  padding: 0 2rem;
}

.games-count {
  color: #8b949e;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Loading & Empty State */
.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem;
  color: #8b949e;
}

.loader {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(102, 192, 244, 0.2);
  border-top-color: #66c0f4;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  margin-top: 3rem;
  padding: 1.5rem;
}

.page-btn {
  background: rgba(102, 192, 244, 0.1);
  border: 1px solid rgba(102, 192, 244, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: #66c0f4;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.page-btn:hover:not(:disabled) {
  background: rgba(102, 192, 244, 0.2);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #8b949e;
  font-size: 0.9rem;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 1.75rem;
  }

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
