<template>
  <div class="hero-background">
    <!-- 游戏封面背景轮播 -->
    <div class="game-covers">
      <div
        v-for="(game, index) in featuredGames"
        :key="game.appid"
        class="cover-slide"
        :class="{ active: currentIndex === index }"
      >
        <img
          :src="`https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/library_hero.jpg`"
          :alt="game.name"
          @error="handleImageError($event, game.appid)"
        />
      </div>
    </div>

    <!-- 深色遮罩 -->
    <div class="overlay"></div>

    <!-- 数字雨粒子 -->
    <div class="matrix-rain">
      <div
        v-for="col in rainColumns"
        :key="col.id"
        class="rain-column"
        :style="{
          left: col.x + '%',
          animationDuration: col.speed + 's',
          animationDelay: col.delay + 's',
        }"
      >
        {{ col.chars }}
      </div>
    </div>

    <!-- 当前游戏名称 -->
    <div class="current-game-name" v-if="featuredGames.length > 0">
      <span class="featuring-label">&gt; FEATURING:</span>
      <span class="game-title">{{ featuredGames[currentIndex]?.name }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const featuredGames = ref([
  { appid: 730, name: "Counter-Strike 2" },
  { appid: 1172470, name: "Apex Legends" },
  { appid: 1091500, name: "Cyberpunk 2077" },
  { appid: 367520, name: "Hollow Knight" },
  { appid: 814380, name: "Sekiro: Shadows Die Twice" },
  { appid: 582010, name: "Monster Hunter: World" },
  { appid: 292030, name: "The Witcher 3: Wild Hunt" },
  { appid: 1238810, name: "Battlefield V" },
]);

const currentIndex = ref(0);
let intervalId: number | null = null;

// 生成数字雨列
const chars = "01ABCDEF0123456789";
const rainColumns = ref(
  Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    speed: 8 + Math.random() * 15,
    delay: Math.random() * 10,
    chars: Array.from(
      { length: 8 + Math.floor(Math.random() * 8) },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("\n"),
  }))
);

const handleImageError = (event: Event, appid: number) => {
  const img = event.target as HTMLImageElement;
  img.src = `https://steamcdn-a.akamaihd.net/steam/apps/${appid}/header.jpg`;
};

onMounted(() => {
  intervalId = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % featuredGames.value.length;
  }, 6000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<style scoped>
.hero-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.game-covers {
  position: absolute;
  inset: 0;
}

.cover-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 2s ease-in-out;
}

.cover-slide.active {
  opacity: 1;
}

.cover-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(4px) brightness(0.2) saturate(0.5);
  transform: scale(1.05);
}

.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(2, 2, 4, 0.6) 0%,
    rgba(2, 2, 4, 0.3) 40%,
    rgba(2, 2, 4, 0.95) 100%
  );
}

/* 数字雨 */
.matrix-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.12;
}

.rain-column {
  position: absolute;
  top: -100%;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  line-height: 1.2;
  color: var(--neon-green);
  white-space: pre;
  animation: rain-fall linear infinite;
}

@keyframes rain-fall {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(calc(100vh + 100%));
    opacity: 0;
  }
}

/* 当前游戏名称 */
.current-game-name {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  text-align: right;
  opacity: 0.4;
  transition: opacity 0.3s ease;
  font-family: var(--font-mono);
}

.current-game-name:hover {
  opacity: 0.8;
}

.featuring-label {
  display: block;
  font-size: 0.55rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 0.15rem;
}

.game-title {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .current-game-name {
    bottom: 1rem;
    right: 1rem;
  }

  .rain-column {
    font-size: 0.5rem;
  }
}
</style>
