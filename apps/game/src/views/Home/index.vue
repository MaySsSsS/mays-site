<template>
  <MainLayout>
    <div class="dashboard">
      <!-- 系统状态栏 -->
      <section class="sys-status-bar">
        <HeroBackground />
        <div class="sys-status-content">
          <div class="status-left">
            <div class="avatar-frame" v-if="steamStore.playerInfo">
              <img :src="steamStore.playerInfo.avatarfull" alt="avatar" />
              <span class="status-dot" :class="steamStore.playerInfo.personastate === 1 ? 'online' : 'offline'"></span>
            </div>
            <div class="status-info">
              <div class="status-path">STEAM://{{ steamStore.playerInfo?.personaname || "LOADING..." }}</div>
              <div class="status-meta">
                <span v-if="lastUpdated">&gt; LAST_SYNC: {{ formatDate(lastUpdated) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 统计面板 -->
      <section class="stats-grid">
        <div class="container">
          <div class="terminal-header">
            <span>SYSTEM_OVERVIEW</span>
            <span class="header-line"></span>
            <span class="header-status blink-cursor">ACTIVE</span>
          </div>
          <div class="led-grid">
            <div class="led-panel">
              <div class="led-value">{{ steamStore.gameStats.totalGames || '---' }}</div>
              <div class="led-label">TOTAL_GAMES</div>
            </div>
            <div class="led-panel">
              <div class="led-value">{{ formatTotalHours }}</div>
              <div class="led-label">TOTAL_HOURS</div>
            </div>
            <div class="led-panel">
              <div class="led-value">{{ steamStore.gameStats.recentlyPlayed || 0 }}</div>
              <div class="led-label">RECENT_2W</div>
            </div>
            <div class="led-panel">
              <div class="led-value">{{ steamStore.gameStats.mostPlayed?.name?.substring(0, 12) || '---' }}</div>
              <div class="led-label">TOP_PROCESS</div>
              <div class="bar-track" v-if="steamStore.gameStats.mostPlayed">
                <div class="bar-fill" :style="{ width: '100%' }"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- TOP PROCESSES 排行条形图 -->
      <section class="section" v-if="steamStore.topGames.length > 0">
        <div class="container">
          <div class="terminal-header">
            <span>TOP_PROCESSES</span>
            <span class="header-line"></span>
            <span class="header-status">{{ steamStore.topGames.length }} RESULTS</span>
          </div>
          <div class="process-list">
            <div
              class="process-item"
              v-for="(game, index) in steamStore.topGames"
              :key="game.appid"
              @click="openSteam(game.appid)"
            >
              <div class="process-rank">{{ String(index + 1).padStart(2, '0') }}</div>
              <div class="process-info">
                <div class="process-name-row">
                  <span class="process-name">{{ game.name }}</span>
                  <span class="process-hours">{{ formatHours(game.playtime_forever) }}</span>
                </div>
                <div class="bar-track">
                  <div
                    class="bar-fill"
                    :style="{ width: barWidth(game.playtime_forever) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- RECENT ACTIVITY 时间轴 -->
      <section class="section" v-if="steamStore.recentlyPlayedGames.length > 0">
        <div class="container">
          <div class="terminal-header">
            <span>RECENT_ACTIVITY</span>
            <span class="header-line"></span>
            <span class="header-status">LIVE</span>
          </div>
          <div class="activity-list">
            <div
              class="activity-item"
              v-for="game in steamStore.recentlyPlayedGames"
              :key="game.appid"
              @click="openSteam(game.appid)"
            >
              <div class="activity-marker">
                <span class="status-dot online"></span>
              </div>
              <div class="activity-time" v-if="game.rtime_last_played">
                {{ formatTimestamp(game.rtime_last_played) }}
              </div>
              <div class="activity-body">
                <span class="activity-name">{{ game.name }}</span>
                <span class="activity-ago" v-if="game.rtime_last_played">
                  {{ formatLastPlayed(game.rtime_last_played) }}
                </span>
                <span class="activity-playtime" v-if="game.playtime_2weeks">
                  {{ Math.floor(game.playtime_2weeks / 60) }}h {{ game.playtime_2weeks % 60 }}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FEATURED MODULES -->
      <section class="section" v-if="favoriteGames.length > 0">
        <div class="container">
          <div class="terminal-header">
            <span>FEATURED_MODULES</span>
            <span class="header-line"></span>
            <span class="header-status">CURATED</span>
          </div>
          <div class="featured-grid">
            <FeaturedGame
              v-for="game in favoriteGames"
              :key="game.appid"
              :game="game"
              :maxPlaytime="maxPlaytime"
            />
          </div>
        </div>
      </section>

      <!-- 加载状态 -->
      <div class="loading-overlay" v-if="steamStore.loading">
        <div class="loader"></div>
        <span class="loading-text">LOADING<span class="blink-cursor"></span></span>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import {
  useSteamStore,
  HeroBackground,
  FeaturedGame,
} from "@mays/shared";
import MainLayout from "@/layouts/MainLayout.vue";

const steamStore = useSteamStore();

const lastUpdated = computed(() => steamStore.lastUpdated);

const formatTotalHours = computed(() => {
  const hours = Math.floor(steamStore.gameStats.totalPlaytime / 60);
  if (!hours) return "---";
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k`;
  return `${hours}`;
});

const favoriteGames = computed(() => {
  return [...steamStore.games]
    .filter((g) => g.playtime_forever > 0)
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, 6);
});

const maxPlaytime = computed(() => {
  return favoriteGames.value[0]?.playtime_forever || 0;
});

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k_h`;
  return `${h}h`;
}

function barWidth(playtime: number): number {
  const max = steamStore.gameStats.mostPlayed?.playtime_forever || 1;
  return Math.min((playtime / max) * 100, 100);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatLastPlayed(ts: number): string {
  const diffDays = Math.floor((Date.now() / 1000 - ts) / 86400);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d_ago";
  return `${diffDays}d_ago`;
}

function openSteam(appid: number) {
  window.open(`https://store.steampowered.com/app/${appid}`, "_blank");
}

onMounted(() => {
  if (steamStore.games.length === 0) {
    steamStore.fetchGamesData();
  }
});
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: var(--bg-darker);
  position: relative;
}

/* ========== 系统状态栏 ========== */
.sys-status-bar {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: flex-end;
  padding: 0 1.5rem 1.5rem;
  overflow: hidden;
}

.sys-status-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-frame {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.avatar-frame img {
  width: 100%;
  height: 100%;
  border-radius: 2px;
  border: 1px solid var(--border-subtle);
  filter: grayscale(0.3);
}

.avatar-frame .status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
}

.status-info {
  font-family: var(--font-mono);
}

.status-path {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--neon-green);
  letter-spacing: 0.08em;
  text-shadow: 0 0 10px rgba(0, 255, 159, 0.3);
}

.status-meta {
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  margin-top: 0.2rem;
}

/* ========== 统计面板 ========== */
.stats-grid {
  padding: 2rem 0;
  background: var(--bg-dark);
  border-top: 1px solid var(--border-dim);
  border-bottom: 1px solid var(--border-dim);
}

.led-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border-dim);
}

.led-panel .led-value {
  font-size: 1.8rem;
}

/* ========== 通用 Section ========== */
.section {
  padding: 2.5rem 0;
  border-bottom: 1px solid var(--border-dim);
}

/* ========== TOP PROCESSES ========== */
.process-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.process-item {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 255, 159, 0.03);
  transition: all 0.2s ease;
}

.process-item:hover {
  background: rgba(0, 255, 159, 0.02);
  padding-left: 0.5rem;
}

.process-item:hover .process-name {
  color: var(--neon-green);
}

.process-rank {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
  min-width: 1.5rem;
  padding-top: 0.2rem;
}

.process-info {
  flex: 1;
  min-width: 0;
}

.process-name-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.4rem;
}

.process-name {
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.process-hours {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--neon-green);
  flex-shrink: 0;
  margin-left: 1rem;
}

/* ========== RECENT ACTIVITY ========== */
.activity-list {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-left: 1px solid var(--border-dim);
  padding-left: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.activity-item:hover {
  border-left-color: var(--neon-green);
  background: rgba(0, 255, 159, 0.02);
  padding-left: 1.5rem;
}

.activity-item:hover .activity-name {
  color: var(--neon-green);
}

.activity-marker {
  flex-shrink: 0;
}

.activity-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 5rem;
  font-family: var(--font-mono);
}

.activity-body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.activity-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.activity-ago {
  font-size: 0.7rem;
  color: var(--text-muted);
  flex-shrink: 0;
}

.activity-playtime {
  font-size: 0.7rem;
  color: var(--neon-green);
  opacity: 0.7;
  flex-shrink: 0;
}

/* ========== FEATURED ========== */
.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1px;
  background: var(--border-dim);
}

/* ========== 加载 ========== */
.loading-overlay {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--neon-green);
  letter-spacing: 0.1em;
  z-index: 100;
}

.loading-text {
  color: var(--text-muted);
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .sys-status-bar {
    min-height: 200px;
    padding: 0 1rem 1rem;
  }

  .led-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .led-panel .led-value {
    font-size: 1.4rem;
  }

  .featured-grid {
    grid-template-columns: 1fr;
  }

  .activity-body {
    flex-wrap: wrap;
    gap: 0.3rem;
  }
}
</style>
