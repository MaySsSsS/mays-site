<template>
  <div class="featured-game" @click="openSteamPage">
    <div class="card-top">
      <span class="card-pid">PID:{{ game.appid }}</span>
    </div>
    <div class="game-image">
      <img
        :src="`https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`"
        :alt="game.name"
      />
      <div class="run-overlay">
        <span class="run-text">&#9654; RUN</span>
      </div>
    </div>
    <div class="game-info">
      <h3 class="game-name">{{ game.name }}</h3>
      <div class="game-stats">
        <div class="stat">
          <span class="stat-key">TIME:</span>
          <span class="stat-val">{{ formatPlaytime }}</span>
        </div>
        <div class="stat" v-if="game.rtime_last_played">
          <span class="stat-key">LAST:</span>
          <span class="stat-val">{{ formatLastPlayed }}</span>
        </div>
      </div>
      <div class="bar-track" v-if="maxPlaytime && maxPlaytime > 0">
        <div class="bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Game {
  appid: number;
  name: string;
  playtime_forever: number;
  rtime_last_played?: number;
}

const props = defineProps<{
  game: Game;
  maxPlaytime?: number;
}>();

const formatPlaytime = computed(() => {
  const hours = Math.floor(props.game.playtime_forever / 60);
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}k_h`;
  return `${hours}h`;
});

const formatLastPlayed = computed(() => {
  if (!props.game.rtime_last_played) return "";
  const diffDays = Math.floor(
    (Date.now() / 1000 - props.game.rtime_last_played) / 86400
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d";
  if (diffDays < 30) return `${diffDays}d`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
});

const progressPercent = computed(() => {
  if (!props.maxPlaytime) return 0;
  return Math.min((props.game.playtime_forever / props.maxPlaytime) * 100, 100);
});

const openSteamPage = () => {
  window.open(
    `https://store.steampowered.com/app/${props.game.appid}`,
    "_blank"
  );
};
</script>

<style scoped>
.featured-game {
  background: var(--bg-card);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border-dim);
  transition: all 0.25s ease;
}

.featured-game:hover {
  border-color: var(--border-subtle);
  background: rgba(10, 14, 22, 0.95);
}

.featured-game:hover .game-name {
  color: var(--neon-green);
}

.featured-game:hover .game-image img {
  filter: brightness(1.1);
}

/* 顶部条 */
.card-top {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.6rem;
  background: var(--bg-medium);
  border-bottom: 1px solid var(--border-dim);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

/* 图片 */
.game-image {
  position: relative;
  aspect-ratio: 460 / 215;
  overflow: hidden;
}

.game-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.8) saturate(0.75);
  transition: filter 0.3s ease;
}

.run-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.featured-game:hover .run-overlay {
  opacity: 1;
}

.run-text {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--neon-green);
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--neon-green);
  letter-spacing: 0.1em;
}

/* 信息 */
.game-info {
  padding: 0.75rem;
  border-top: 1px solid var(--border-dim);
}

.game-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-ui);
  transition: color 0.2s ease;
}

.game-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat {
  display: flex;
  gap: 0.3rem;
  font-size: 0.65rem;
  font-family: var(--font-mono);
}

.stat-key {
  color: var(--text-muted);
}

.stat-val {
  color: var(--neon-green);
}
</style>
