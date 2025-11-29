<template>
  <div class="cursor-container" v-if="!isMobile">
    <!-- 主光标 -->
    <div
      class="cursor-main"
      :style="{
        left: `${cursorPos.x}px`,
        top: `${cursorPos.y}px`,
        transform: `translate(-50%, -50%) scale(${isHovering ? 1.5 : 1})`,
        backgroundColor: isHovering
          ? 'rgba(99, 102, 241, 0.3)'
          : 'rgba(99, 102, 241, 0.15)',
      }"
    />
    <!-- 跟随光标 -->
    <div
      class="cursor-follower"
      :style="{
        left: `${followerPos.x}px`,
        top: `${followerPos.y}px`,
        transform: `translate(-50%, -50%) scale(${isHovering ? 0.5 : 1})`,
        borderColor: isHovering ? '#ec4899' : '#6366f1',
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

// 检测是否为移动设备
const checkMobile = () => {
  isMobile.value = "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

// 鼠标移动处理
const handleMouseMove = (e: MouseEvent) => {
  cursorPos.x = e.clientX;
  cursorPos.y = e.clientY;
};

// 跟随动画
const updateFollower = () => {
  const ease = 0.15;
  followerPos.x += (cursorPos.x - followerPos.x) * ease;
  followerPos.y += (cursorPos.y - followerPos.y) * ease;
  animationFrame = requestAnimationFrame(updateFollower);
};

// 鼠标进入可交互元素
const handleMouseOver = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    target &&
    target.matches &&
    target.matches(
      'a, button, [role="button"], .clickable, input, select, textarea, .game-card, .photo-item, .nav-link, .glass-card'
    )
  ) {
    isHovering.value = true;
  }
};

// 鼠标离开可交互元素
const handleMouseOut = () => {
  isHovering.value = false;
};

// 点击波纹效果
const handleClick = (e: MouseEvent) => {
  if (!e || !e.clientX || !e.clientY) return;

  const id = ++rippleId;
  ripples.value.push({ id, x: e.clientX, y: e.clientY });

  // 动画结束后移除
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== id);
  }, 600);
};

onMounted(() => {
  checkMobile();

  if (!isMobile.value) {
    // 等待DOM完全加载
    const initCursor = () => {
      // 初始化位置
      followerPos.x = cursorPos.x;
      followerPos.y = cursorPos.y;

      // 添加事件监听
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseover", handleMouseOver);
      document.addEventListener("mouseout", handleMouseOut);
      document.addEventListener("click", handleClick);

      // 启动跟随动画
      updateFollower();

      // 隐藏默认光标
      document.body.style.cursor = "none";
      document
        .querySelectorAll("a, button, input, select, textarea")
        .forEach((el) => {
          (el as HTMLElement).style.cursor = "none";
        });
    };

    // 如果DOM已经加载完成，直接初始化
    if (document.readyState === "complete") {
      initCursor();
    } else {
      // 否则等待DOM加载完成
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

.cursor-main {
  position: fixed;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.15);
  backdrop-filter: blur(2px);
  transition: transform 0.2s ease, background-color 0.2s ease;
  pointer-events: none;
}

.cursor-follower {
  position: fixed;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid #6366f1;
  background: transparent;
  transition: transform 0.15s ease, border-color 0.2s ease;
  pointer-events: none;
}

.cursor-ripple {
  position: fixed;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.6), transparent);
  transform: translate(-50%, -50%);
  animation: ripple-expand 0.6s ease-out forwards;
  pointer-events: none;
}

@keyframes ripple-expand {
  0% {
    width: 20px;
    height: 20px;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

/* 悬浮发光效果 */
.cursor-main::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3), transparent);
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.5;
  }
}
</style>
