<template>
  <div class="game-card" @click="openSteamPage">
    <div class="card-image">
      <img
        :src="steamStore.getGameHeaderImage(game.appid)"
        :alt="game.name"
        @error="handleImageError"
      />
      <div class="card-overlay">
        <span class="play-icon">▶</span>
      </div>
      <div class="playtime-badge" v-if="game.playtime_forever > 0">
        {{ steamStore.formatPlaytime(game.playtime_forever) }}
      </div>
    </div>
    <div class="card-content">
      <h3 class="game-name">{{ game.name }}</h3>
      <div class="game-meta">
        <span class="meta-item" v-if="showRecent && game.playtime_2weeks">
          <span class="meta-icon">🕐</span>
          近两周: {{ steamStore.formatPlaytime(game.playtime_2weeks) }}
        </span>
        <span class="meta-item" v-if="game.rtime_last_played">
          <span class="meta-icon">📅</span>
          {{ formatLastPlayed(game.rtime_last_played) }}
        </span>
      </div>
    </div>
    <div class="card-glow"></div>
  </div>
</template>

<script setup lang="ts">
import { useSteamStore } from "@/stores/steam";
import type { GameData } from "@/types";

const props = defineProps<{
  game: GameData;
  showRecent?: boolean;
}>();

const steamStore = useSteamStore();

function openSteamPage() {
  window.open(
    `https://store.steampowered.com/app/${props.game.appid}`,
    "_blank"
  );
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement;
  img.src = "/placeholder-game.png";
}

function formatLastPlayed(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`;
  return `${Math.floor(diffDays / 365)} 年前`;
}
</script>

<style scoped>
.game-card {
  position: relative;
  background: rgba(22, 27, 34, 0.8);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(102, 192, 244, 0.1);
}

.game-card:hover {
  transform: translateY(-8px) scale(1.02);
  border-color: rgba(102, 192, 244, 0.3);
}

.game-card:hover .card-glow {
  opacity: 1;
}

.game-card:hover .card-overlay {
  opacity: 1;
}

.game-card:hover .card-image img {
  transform: scale(1.1);
}

.card-glow {
  position: absolute;
  inset: -1px;
  background: linear-gradient(
    135deg,
    rgba(102, 192, 244, 0.2),
    rgba(168, 85, 247, 0.2)
  );
  border-radius: 16px;
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
  filter: blur(20px);
}

.card-image {
  position: relative;
  aspect-ratio: 460 / 215;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.play-icon {
  width: 60px;
  height: 60px;
  background: rgba(102, 192, 244, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #0d1117;
  padding-left: 4px;
}

.playtime-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #66c0f4;
  border: 1px solid rgba(102, 192, 244, 0.2);
}

.card-content {
  padding: 1.25rem;
}

.game-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 0.75rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-meta {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #8b949e;
}

.meta-icon {
  font-size: 0.9rem;
}
</style>
