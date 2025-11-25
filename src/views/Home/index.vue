<template>
  <MainLayout>
    <div class="home-page">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-content">
          <div class="hero-avatar" v-if="steamStore.playerInfo">
            <img :src="steamStore.playerInfo.avatarfull" alt="avatar" />
            <div
              class="status-indicator"
              :class="{ online: steamStore.playerInfo.personastate === 1 }"
            ></div>
          </div>
          <h1 class="hero-title">
            <span class="greeting">Welcome to</span>
            <span class="name">My Gaming Journey</span>
          </h1>
          <p class="hero-subtitle">
            探索我的 Steam 游戏世界，记录每一次冒险与成就
          </p>
          <div class="hero-stats" v-if="!steamStore.loading">
            <div class="stat-item">
              <span class="stat-value">{{
                steamStore.gameStats.totalGames
              }}</span>
              <span class="stat-label">游戏总数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ formatTotalHours }}</span>
              <span class="stat-label">总游戏时长</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{
                steamStore.gameStats.recentlyPlayed
              }}</span>
              <span class="stat-label">近期在玩</span>
            </div>
          </div>
          <div class="hero-actions">
            <router-link to="/games" class="btn btn-primary">
              <span>🎮</span> 浏览游戏库
            </router-link>
            <router-link to="/about" class="btn btn-secondary">
              <span>👤</span> 了解更多
            </router-link>
          </div>
        </div>
      </section>

      <!-- 最常游玩的游戏 -->
      <section class="section top-games">
        <div class="container">
          <h2 class="section-title">
            <span class="title-icon">🏆</span>
            最常游玩
          </h2>
          <div class="games-grid" v-if="!steamStore.loading">
            <GameCard
              v-for="game in steamStore.topGames.slice(0, 6)"
              :key="game.appid"
              :game="game"
            />
          </div>
          <div class="loading-state" v-else>
            <div class="loader"></div>
            <p>加载游戏数据中...</p>
          </div>
        </div>
      </section>

      <!-- 最近游玩 -->
      <section
        class="section recent-games"
        v-if="steamStore.recentlyPlayedGames.length > 0"
      >
        <div class="container">
          <h2 class="section-title">
            <span class="title-icon">🕐</span>
            最近游玩
          </h2>
          <div class="games-grid">
            <GameCard
              v-for="game in steamStore.recentlyPlayedGames"
              :key="game.appid"
              :game="game"
              :showRecent="true"
            />
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="section cta-section">
        <div class="container">
          <div class="cta-card">
            <h2>想看完整的游戏库？</h2>
            <p>查看我所有的 Steam 游戏收藏，探索更多精彩内容</p>
            <router-link to="/games" class="btn btn-primary btn-large">
              查看全部游戏
            </router-link>
          </div>
        </div>
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useSteamStore } from "@/stores/steam";
import MainLayout from "@/layouts/MainLayout.vue";
import GameCard from "@/components/game/GameCard.vue";

const steamStore = useSteamStore();

const formatTotalHours = computed(() => {
  const hours = Math.floor(steamStore.gameStats.totalPlaytime / 60);
  if (hours >= 1000) {
    return `${(hours / 1000).toFixed(1)}k 小时`;
  }
  return `${hours} 小时`;
});

onMounted(() => {
  if (steamStore.games.length === 0) {
    steamStore.fetchGamesData();
  }
});
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* Hero Section */
.hero {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      ellipse at 20% 20%,
      rgba(102, 192, 244, 0.15) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 80% 80%,
      rgba(116, 78, 170, 0.15) 0%,
      transparent 50%
    ),
    radial-gradient(
      ellipse at 50% 50%,
      rgba(102, 192, 244, 0.05) 0%,
      transparent 70%
    );
  animation: pulse 8s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 800px;
}

.hero-avatar {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 2rem;
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px solid #66c0f4;
  box-shadow: 0 0 30px rgba(102, 192, 244, 0.4);
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #8b949e;
  border: 3px solid #0d1117;
}

.status-indicator.online {
  background: #57cbde;
  box-shadow: 0 0 10px rgba(87, 203, 222, 0.6);
}

.hero-title {
  margin-bottom: 1.5rem;
}

.greeting {
  display: block;
  font-size: 1.2rem;
  color: #8b949e;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.name {
  display: block;
  font-size: 3.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #66c0f4 0%, #4fc3f7 50%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #8b949e;
  margin-bottom: 3rem;
  line-height: 1.6;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 3rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #66c0f4;
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #8b949e;
  margin-top: 0.5rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, #66c0f4, #4a9edd);
  color: #0d1117;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(102, 192, 244, 0.4);
}

.btn-secondary {
  background: rgba(102, 192, 244, 0.1);
  color: #66c0f4;
  border: 1px solid rgba(102, 192, 244, 0.3);
}

.btn-secondary:hover {
  background: rgba(102, 192, 244, 0.2);
}

.btn-large {
  padding: 1.25rem 2.5rem;
  font-size: 1.1rem;
}

/* Sections */
.section {
  padding: 5rem 2rem;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2.5rem;
  color: #e6edf3;
}

.title-icon {
  font-size: 1.5rem;
}

/* Games Grid */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Loading State */
.loading-state {
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

/* CTA Section */
.cta-section {
  background: linear-gradient(
    135deg,
    rgba(102, 192, 244, 0.05),
    rgba(116, 78, 170, 0.05)
  );
}

.cta-card {
  text-align: center;
  padding: 4rem;
  background: rgba(13, 17, 23, 0.6);
  border-radius: 24px;
  border: 1px solid rgba(102, 192, 244, 0.1);
}

.cta-card h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #e6edf3;
}

.cta-card p {
  color: #8b949e;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .name {
    font-size: 2.5rem;
  }

  .hero-stats {
    gap: 1.5rem;
  }

  .stat-value {
    font-size: 1.75rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .games-grid {
    grid-template-columns: 1fr;
  }

  .cta-card {
    padding: 2rem;
  }
}
</style>
