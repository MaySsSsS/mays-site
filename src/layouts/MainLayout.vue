<template>
  <div class="app-layout">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="navbar-container">
        <router-link to="/" class="logo">
          <span class="logo-icon">🎮</span>
          <span class="logo-text">Mays Space</span>
        </router-link>

        <nav class="nav-links">
          <router-link to="/" class="nav-link">
            <span class="nav-icon">🏠</span>
            首页
          </router-link>
          <router-link to="/games" class="nav-link">
            <span class="nav-icon">🎯</span>
            游戏
          </router-link>
          <router-link to="/photos" class="nav-link">
            <span class="nav-icon">🗺️</span>
            照片·足迹
          </router-link>
          <router-link to="/about" class="nav-link">
            <span class="nav-icon">👤</span>
            关于我
          </router-link>
        </nav>

        <button class="mobile-menu-btn" @click="toggleMobileMenu">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <!-- 移动端菜单 -->
      <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
        <router-link
          to="/"
          class="mobile-nav-link"
          @click="mobileMenuOpen = false"
          >首页</router-link
        >
        <router-link
          to="/games"
          class="mobile-nav-link"
          @click="mobileMenuOpen = false"
          >游戏</router-link
        >
        <router-link
          to="/photos"
          class="mobile-nav-link"
          @click="mobileMenuOpen = false"
          >照片·足迹</router-link
        >
        <router-link
          to="/about"
          class="mobile-nav-link"
          @click="mobileMenuOpen = false"
          >关于我</router-link
        >
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <slot />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-info">
          <p>© 2024 Mays Space. Personal blog · Games · Photos</p>
          <p class="footer-sub">Built with Vue 3 + TypeScript + Pinia</p>
        </div>
        <div class="footer-links">
          <a
            href="https://store.steampowered.com"
            target="_blank"
            rel="noopener"
            >Steam</a
          >
          <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const mobileMenuOpen = ref(false);

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 - Glassmorphism 风格 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
}

.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  font-size: 1.4rem;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.logo::after {
  display: none;
}

.logo-icon {
  font-size: 1.6rem;
  filter: drop-shadow(0 2px 4px rgba(99, 102, 241, 0.3));
  animation: bounce-soft 3s ease-in-out infinite;
}

@keyframes bounce-soft {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.logo-text {
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-flow 5s ease infinite;
}

@keyframes gradient-flow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.nav-links {
  display: flex;
  gap: 0.25rem;
  background: rgba(241, 245, 249, 0.6);
  padding: 6px;
  border-radius: 16px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  font-size: 0.9rem;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.nav-link::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(236, 72, 153, 0.1)
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-link::after {
  display: none;
}

.nav-link:hover {
  color: #6366f1;
  transform: translateY(-2px);
}

.nav-link:hover::before {
  opacity: 1;
}

.nav-link.router-link-active {
  color: #6366f1;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85)
  );
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.15),
    inset 0 0 0 1px rgba(99, 102, 241, 0.1);
}

.nav-icon {
  font-size: 1rem;
  transition: transform 0.3s ease;
}

.nav-link:hover .nav-icon {
  transform: scale(1.2) rotate(-5deg);
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 10px;
  cursor: none;
  transition: all 0.3s ease;
}

.mobile-menu-btn:hover {
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1),
    rgba(236, 72, 153, 0.1)
  );
  transform: scale(1.05);
}

.mobile-menu-btn span {
  display: block;
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #ec4899);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.mobile-menu {
  display: none;
  padding: 1rem 1.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.mobile-menu.active {
  display: block;
  animation: slide-down 0.3s ease;
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mobile-nav-link {
  display: block;
  padding: 0.9rem 1rem;
  color: #64748b;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link.router-link-active {
  color: #6366f1;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.08),
    rgba(236, 72, 153, 0.08)
  );
  transform: translateX(5px);
}

/* 主内容 */
.main-content {
  flex: 1;
  margin-top: 72px;
}

/* 页脚 - Glassmorphism 风格 */
.footer {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding: 2rem;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer-info p {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.footer-sub {
  margin-top: 0.4rem !important;
  font-size: 0.8rem !important;
  color: #94a3b8 !important;
}

.footer-links {
  display: flex;
  gap: 1rem;
}

.footer-links a {
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  background: rgba(241, 245, 249, 0.5);
  border: 1px solid transparent;
}

.footer-links a::after {
  display: none;
}

.footer-links a:hover {
  color: white;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  border-color: transparent;
  transform: translateY(-3px);
  box-shadow: 0 5px 20px rgba(99, 102, 241, 0.3);
}

/* 响应式 */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .navbar-container {
    padding: 0 1rem;
  }

  .footer-container {
    flex-direction: column;
    text-align: center;
  }
}
</style>
