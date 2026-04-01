<template>
  <div class="app-layout">
    <!-- 终端顶部栏 -->
    <header class="top-bar">
      <div class="top-bar-inner">
        <router-link to="/" class="logo">
          <span class="logo-prompt">&gt;</span>
          <span class="logo-text">MAYS://GAME</span>
          <span class="status-dot online"></span>
        </router-link>

        <nav class="nav-links">
          <router-link to="/" class="nav-link">
            <span class="nav-arrow">&#9656;</span>
            HOME
          </router-link>
          <router-link to="/games" class="nav-link">
            <span class="nav-arrow">&#9656;</span>
            LIBRARY
          </router-link>
        </nav>

        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <span class="menu-icon">{{ mobileMenuOpen ? '&#10005;' : '&#9776;' }}</span>
        </button>
      </div>

      <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
        <router-link to="/" class="mobile-nav-link" @click="mobileMenuOpen = false">
          <span class="nav-arrow">&#9656;</span> HOME
        </router-link>
        <router-link to="/games" class="mobile-nav-link" @click="mobileMenuOpen = false">
          <span class="nav-arrow">&#9656;</span> LIBRARY
        </router-link>
      </div>
    </header>

    <main class="main-content">
      <slot />
    </main>

    <!-- 底部状态栏 -->
    <footer class="status-bar">
      <div class="status-bar-inner">
        <span class="status-item">
          <span class="status-dot online"></span>
          STEAM:ONLINE
        </span>
        <span class="status-divider">|</span>
        <span class="status-item status-dim">V2.0.1</span>
        <span class="status-divider">|</span>
        <span class="status-item status-dim">{{ currentTime }}</span>
        <span class="status-spacer"></span>
        <span class="status-item status-dim">BUILT WITH VUE3 + TS</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const mobileMenuOpen = ref(false);
const currentTime = ref("--:--:--");

let timeInterval: number | null = null;

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function updateTime() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("en-GB", { hour12: false });
}

onMounted(() => {
  updateTime();
  timeInterval = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ========== 顶部栏 ========== */
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(4, 6, 12, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-dim);
}

.top-bar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  transition: all 0.2s ease;
}

.logo::after {
  display: none;
}

.logo:hover {
  text-shadow: 0 0 8px var(--neon-green);
}

.logo-prompt {
  color: var(--text-muted);
  font-weight: 400;
}

.logo-text {
  color: var(--neon-green);
}

/* 导航 */
.nav-links {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-decoration: none;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.nav-link::after {
  display: none;
}

.nav-link:hover {
  color: var(--neon-green);
  border-color: var(--border-dim);
}

.nav-link.router-link-active {
  color: var(--neon-green);
  background: rgba(0, 255, 159, 0.05);
  border-color: var(--border-subtle);
}

.nav-arrow {
  font-size: 0.6rem;
  opacity: 0.5;
}

.nav-link.router-link-active .nav-arrow {
  opacity: 1;
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--border-dim);
  color: var(--neon-green);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.mobile-menu-btn:hover {
  border-color: var(--neon-green);
  box-shadow: var(--glow-green);
}

.menu-icon {
  line-height: 1;
}

/* 移动端菜单 */
.mobile-menu {
  display: none;
  padding: 0.5rem 1rem 1rem;
  background: rgba(4, 6, 12, 0.98);
  border-top: 1px solid var(--border-dim);
}

.mobile-menu.active {
  display: block;
  animation: slide-in 0.2s ease;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.5rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: all 0.2s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link.router-link-active {
  color: var(--neon-green);
  border-left-color: var(--neon-green);
  background: rgba(0, 255, 159, 0.03);
}

/* 主内容 */
.main-content {
  flex: 1;
  margin-top: 48px;
}

/* ========== 底部状态栏 ========== */
.status-bar {
  background: rgba(4, 6, 12, 0.92);
  border-top: 1px solid var(--border-dim);
  padding: 0.4rem 0;
}

.status-bar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
}

.status-dim {
  color: var(--text-muted);
}

.status-divider {
  color: var(--border-dim);
}

.status-spacer {
  flex: 1;
}

/* ========== 响应式 ========== */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .top-bar-inner {
    padding: 0 1rem;
  }

  .status-bar-inner {
    font-size: 0.55rem;
    gap: 0.35rem;
  }
}
</style>
