<template>
  <div class="cursor-container" v-if="!isMobile">
    <!-- 十字准星 -->
    <div
      class="cursor-crosshair"
      :style="{
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        transform: `translate(-50%, -50%) scale(${isHovering ? 1.8 : 1})`,
      }"
    />
    <!-- 跟随方块 -->
    <div
      class="cursor-dot"
      :style="{
        left: `${followerPos.x}px`,
        top: `${followerPos.y}px`,
        transform: `translate(-50%, -50%) scale(${isHovering ? 2 : 1})`,
      }"
    />
    <!-- 点击波纹 -->
    <div
      v-for="ripple in ripples"
      :key="ripple.id"
      class="cursor-ripple"
      :style="{
        left: `${ripple.x}px`,
        top: `${ripple.y}px`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const cursorPos = reactive({ x: 0, y: 0 });
const followerPos = reactive({ x: 0, y: 0 });
const isHovering = ref(false);
const isMobile = ref(false);
const ripples = ref<Ripple[]>([]);
let rippleId = 0;
let animationFrame: number;

const checkMobile = () => {
  isMobile.value = "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

const handleMouseMove = (e: MouseEvent) => {
  cursorPos.x = e.clientX;
  cursorPos.y = e.clientY;
};

const updateFollower = () => {
  const ease = 0.12;
  followerPos.x += (cursorPos.x - followerPos.x) * ease;
  followerPos.y += (cursorPos.y - followerPos.y) * ease;
  animationFrame = requestAnimationFrame(updateFollower);
};

const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    target?.matches?.(
      'a, button, [role="button"], .clickable, input, select, textarea, .game-card, .process-item, .activity-item, .featured-game, .nav-link, .term-btn'
    )
  ) {
    isHovering.value = true;
  }
};

const handleMouseOut = () => {
  isHovering.value = false;
};

const handleClick = (e: MouseEvent) => {
  if (!e?.clientX || !e.clientY) return;
  const id = ++rippleId;
  ripples.value.push({ id, x: e.clientX, y: e.clientY });
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== id);
  }, 500);
};

onMounted(() => {
  checkMobile();
  if (!isMobile.value) {
    const initCursor = () => {
      followerPos.x = cursorPos.x;
      followerPos.y = cursorPos.y;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("mouseout", handleMouseOut);
      document.addEventListener("click", handleClick);
      updateFollower();
      document.body.style.cursor = "none";
      document
        .querySelectorAll("a, button, input, select, textarea")
        .forEach((el) => {
          (el as HTMLElement).style.cursor = "none";
        });
    };
    if (document.readyState === "complete") {
      initCursor();
    } else {
      window.addEventListener("load", initCursor);
    }
  }
});

onUnmounted(() => {
  if (!isMobile.value) {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseover", handleMouseOver);
    document.removeEventListener("mouseout", handleMouseOut);
    document.removeEventListener("click", handleClick);
    cancelAnimationFrame(animationFrame);
    document.body.style.cursor = "auto";
  }
});
</script>

<style scoped>
.cursor-container {
  pointer-events: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9999;
  overflow: hidden;
}

/* 十字准星 */
.cursor-crosshair {
  position: fixed;
  width: 16px;
  height: 16px;
  transition: transform 0.15s ease;
  pointer-events: none;
}

.cursor-crosshair::before,
.cursor-crosshair::after {
  content: "";
  position: absolute;
  background: rgba(0, 255, 159, 0.6);
}

.cursor-crosshair::before {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  transform: translateY(-50%);
}

.cursor-crosshair::after {
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  transform: translateX(-50%);
}

/* 中心点 */
.cursor-dot {
  position: fixed;
  width: 4px;
  height: 4px;
  background: var(--neon-green);
  transition: transform 0.1s ease;
  pointer-events: none;
  box-shadow: 0 0 6px var(--neon-green);
}

/* 点击波纹 */
.cursor-ripple {
  position: fixed;
  width: 4px;
  height: 4px;
  border: 1px solid var(--neon-green);
  transform: translate(-50%, -50%);
  animation: ripple-out 0.5s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-out {
  0% {
    width: 4px;
    height: 4px;
    opacity: 0.8;
  }
  100% {
    width: 40px;
    height: 40px;
    opacity: 0;
  }
}
</style>
