<template>
  <div class="game-card" @click="openSteamPage">
    <div class="card-top-bar">
      <span class="card-tag">PID:{{ game.appid }}</span>
      <span class="card-playtime" v-if="game.playtime_forever > 0">
        {{ steamStore.formatPlaytime(game.playtime_forever) }}
      </span>
    </div>
    <div class="card-image">
      <img
        :src="steamStore.getGameHeaderImage(game.appid)"
        :alt="game.name"
        @error="handleImageError"
      />
      <div class="card-overlay">
        <span class="run-indicator">&#9654; RUN</span>
      </div>
    </div>
    <div class="card-content">
      <h3 class="game-name">{{ game.name }}</h3>
      <div class="game-meta">
        <span class="meta-item" v-if="showRecent && game.playtime_2weeks">
          <span class="meta-key">2W:</span>
          {{ steamStore.formatPlaytime(game.playtime_2weeks) }}
        </span>
        <span class="meta-item" v-if="game.rtime_last_played">
          <span class="meta-key">LAST:</span>
          {{ formatLastPlayed(game.rtime_last_played) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSteamStore } from "../../stores/steam";
import type { GameData } from "../../types";

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

const placeholderImage =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0NjAiIGhlaWdodD0iMjE1IiB2aWV3Qm94PSIwIDAgNDYwIDIxNSI+PHJlY3QgZmlsbD0iIzBjMGUxNiIgd2lkdGg9IjQ2MCIgaGVpZ2h0PSIyMTUiLz48dGV4dCBmaWxsPSIjM2E0NDUwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjI0IiB4PSI1MCUiIHk9IjUwJSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tk9fSU1BR0U8L3RleHQ+PC9zdmc+";

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img.src === placeholderImage) return;
  img.src = placeholderImage;
}

function formatLastPlayed(timestamp: number): string {
  const diffDays = Math.floor(
    (Date.now() / 1000 - timestamp) / 86400
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1d";
  if (diffDays < 30) return `${diffDays}d`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo`;
  return `${Math.floor(diffDays / 365)}y`;
}
</script>

<style scoped>
.game-card {
  background: var(--bg-card);
  border: 1px solid var(--border-dim);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.game-card:hover {
  border-color: var(--border-subtle);
  background: rgba(10, 14, 22, 0.95);
}

.game-card:hover .card-overlay {
  opacity: 1;
}

.game-card:hover .game-name {
  color: var(--neon-green);
}

.game-card:hover .card-image img {
  filter: brightness(1.1);
}

/* 顶部信息条 */
.card-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0.6rem;
  background: var(--bg-medium);
  border-bottom: 1px solid var(--border-dim);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.05em;
}

.card-tag {
  color: var(--text-muted);
}

.card-playtime {
  color: var(--neon-green);
}

/* 图片 */
.card-image {
  position: relative;
  aspect-ratio: 460 / 215;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter 0.3s ease;
  filter: brightness(0.85) saturate(0.8);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.run-indicator {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--neon-green);
  letter-spacing: 0.1em;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--neon-green);
}

/* 内容 */
.card-content {
  padding: 0.75rem;
  border-top: 1px solid var(--border-dim);
}

.game-name {
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-ui);
  color: var(--text-primary);
  margin-bottom: 0.4rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
  letter-spacing: 0.02em;
}

.game-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
  letter-spacing: 0.03em;
}

.meta-key {
  color: var(--text-muted);
  opacity: 0.6;
}

.game-card:hover .meta-item {
  color: var(--text-secondary);
}
</style>
