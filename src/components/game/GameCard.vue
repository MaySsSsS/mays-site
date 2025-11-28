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
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  overflow: hidden;
  cursor: none;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.game-card:hover {
  transform: translateY(-10px) scale(1.02);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 25px 50px rgba(99, 102, 241, 0.15),
    0 0 0 1px rgba(99, 102, 241, 0.1);
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
  inset: -2px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.3),
    rgba(236, 72, 153, 0.3)
  );
  border-radius: 22px;
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
  filter: blur(25px);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.02);
  }
}

.game-card:hover .card-glow {
  animation: glow-pulse-hover 2s ease-in-out infinite;
}

@keyframes glow-pulse-hover {
  0%,
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
  }
}

.card-image {
  position: relative;
  aspect-ratio: 460 / 215;
  overflow: hidden;
}

.card-image::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.6s ease;
}

.game-card:hover .card-image::after {
  left: 150%;
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
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.4),
    rgba(236, 72, 153, 0.4)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.play-icon {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #6366f1;
  padding-left: 6px;
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3),
    0 0 0 4px rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  animation: play-pulse 2s ease-in-out infinite;
}

@keyframes play-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.playtime-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85)
  );
  color: #6366f1;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.card-content {
  padding: 1.5rem;
}

.game-name {
  font-size: 1.15rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.85rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: all 0.3s ease;
}

.game-card:hover .game-name {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #64748b;
  transition: color 0.3s ease;
}

.game-card:hover .meta-item {
  color: #6366f1;
}

.meta-icon {
  font-size: 1rem;
  filter: grayscale(0.3);
  transition: filter 0.3s ease;
}

.game-card:hover .meta-icon {
  filter: grayscale(0);
}
</style>
