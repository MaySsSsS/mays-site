<template>
  <MainLayout>
    <div class="photos-page">
      <!-- 未认证时显示登录 -->
      <PhotoAuth v-if="!isAuthed" @success="handleAuthSuccess" />

      <!-- 已认证时显示照片内容 -->
      <template v-else>
        <section class="hero">
          <div class="hero-content">
            <h1 class="title">照片 · 足迹</h1>
            <p class="subtitle">
              把日常和旅行照片按地点分组，用地图的方式记录自己的足迹
            </p>
            <div class="hero-stats">
              <div class="stat-item">
                <span class="stat-value">{{ photoStore.groups.length }}</span>
                <span class="stat-label">个分组</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ photoStore.totalPhotos }}</span>
                <span class="stat-label">张照片</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ photoStore.cities.length }}</span>
                <span class="stat-label">个城市</span>
              </div>
            </div>
            <button class="btn-logout" @click="handleLogout" title="退出登录">
              🔓 退出
            </button>
          </div>
        </section>

        <section class="content">
          <div class="layout">
            <!-- 左侧：分组和城市选择 -->
            <aside class="sidebar">
              <div class="sidebar-section">
                <h2 class="section-title">
                  分组
                  <span class="section-count">{{
                    photoStore.groups.length
                  }}</span>
                </h2>
                <ul class="group-list">
                  <li
                    v-for="group in photoStore.groups"
                    :key="group.id"
                    :class="[
                      'group-item',
                      { active: group.id === activeGroupId },
                    ]"
                    @click="selectGroup(group.id)"
                  >
                    <div class="group-main">
                      <span class="group-name">{{ group.name }}</span>
                      <span class="group-meta">
                        {{ group.city }} · {{ group.photos.length }} 张
                      </span>
                    </div>
                    <button
                      class="group-delete"
                      @click.stop="deleteGroup(group.id)"
                      title="删除分组"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                </ul>
                <button class="btn btn-outline" @click="showCreateGroup = true">
                  + 新建分组
                </button>
              </div>

              <div class="sidebar-section">
                <h2 class="section-title">
                  城市筛选
                  <button
                    v-if="activeCity"
                    class="clear-filter"
                    @click="activeCity = null"
                  >
                    清除
                  </button>
                </h2>
                <div class="city-tags">
                  <button
                    v-for="city in photoStore.cities"
                    :key="city"
                    :class="['tag', { active: city === activeCity }]"
                    @click="selectCity(city)"
                  >
                    {{ city }}
                    <span class="tag-count">{{ getCityPhotoCount(city) }}</span>
                  </button>
                </div>
              </div>
            </aside>

            <!-- 中间：中国地图 -->
            <section class="map-section">
              <h2 class="section-title">
                足迹地图
                <span v-if="activeCity" class="current-city">
                  当前：{{ activeCity }}
                </span>
              </h2>
              <ChinaMap
                :activeCity="activeCity"
                :visitedCities="photoStore.cities"
                :cityPhotoCounts="cityPhotoCounts"
                :showConnections="true"
                @select="selectCity"
              />
            </section>

            <!-- 右侧：照片网格 -->
            <section class="photos-section">
              <div class="section-header">
                <h2 class="section-title">
                  照片
                  <span v-if="activeGroup" class="current-group">
                    · {{ activeGroup.name }}（{{
                      activeGroup.photos.length
                    }}
                    张）
                  </span>
                </h2>
                <button
                  v-if="activeGroup"
                  class="btn btn-primary btn-sm"
                  @click="showUploader = !showUploader"
                >
                  {{ showUploader ? "取消" : "+ 添加照片" }}
                </button>
              </div>

              <!-- 照片上传区域 -->
              <PhotoUploader
                v-if="showUploader && activeGroup"
                @upload="handlePhotoUpload"
                class="uploader-area"
              />

              <div v-if="!activeGroup" class="empty-state">
                <div class="empty-icon">📷</div>
                <p>还没有选择分组</p>
                <p class="empty-hint">在左侧选择一个分组，或者创建一个新的</p>
              </div>

              <div
                v-else-if="activeGroup.photos.length === 0"
                class="empty-state"
              >
                <div class="empty-icon">🖼️</div>
                <p>这个分组还没有照片</p>
                <p class="empty-hint">点击上方「添加照片」开始上传</p>
              </div>

              <div v-else class="photos-grid">
                <div
                  v-for="(photo, index) in activeGroup.photos"
                  :key="photo.id"
                  class="photo-item"
                  @click="openLightbox(index)"
                >
                  <div class="photo-thumb">
                    <img
                      v-if="photo.url"
                      :src="photo.url"
                      :alt="photo.title"
                      loading="lazy"
                    />
                    <div v-else class="photo-placeholder">
                      <span>{{ photo.title }}</span>
                    </div>
                  </div>
                  <div class="photo-meta">
                    <div class="photo-title">{{ photo.title }}</div>
                    <div v-if="photo.description" class="photo-desc">
                      {{ photo.description }}
                    </div>
                    <div v-if="photo.date" class="photo-date">
                      {{ formatDate(photo.date) }}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <!-- 新建分组弹窗 -->
        <CitySelector
          v-model:visible="showCreateGroup"
          @select="handleCitySelect"
        />

        <!-- 照片详情弹窗 -->
        <PhotoLightbox
          v-model:visible="showLightbox"
          :photos="activeGroup?.photos || []"
          :initialIndex="lightboxIndex"
          @delete="handlePhotoDelete"
        />
      </template>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import MainLayout from "@/layouts/MainLayout.vue";
import ChinaMap from "@/components/photos/ChinaMapEcharts.vue";
import CitySelector from "@/components/photos/CitySelector.vue";
import PhotoUploader from "@/components/photos/PhotoUploader.vue";
import PhotoLightbox from "@/components/photos/PhotoLightbox.vue";
import PhotoAuth from "@/components/photos/PhotoAuth.vue";
import { usePhotoStore } from "@/stores/photos";
import { isAuthenticated, clearToken } from "@/api/photoApi";

const photoStore = usePhotoStore();

const isAuthed = ref(false);
const activeGroupId = ref<string | null>(null);
const activeCity = ref<string | null>(null);
const showCreateGroup = ref(false);
const showUploader = ref(false);
const showLightbox = ref(false);
const lightboxIndex = ref(0);

// 检查认证状态
onMounted(() => {
  isAuthed.value = isAuthenticated();
  if (isAuthed.value) {
    initPhotoData();
  }
});

// 认证成功后初始化数据
const handleAuthSuccess = () => {
  isAuthed.value = true;
  initPhotoData();
};

// 退出登录
const handleLogout = () => {
  clearToken();
  isAuthed.value = false;
};

// 初始化照片数据
const initPhotoData = async () => {
  await photoStore.fetchFromApi();
  const firstGroup = photoStore.groups[0];
  if (firstGroup) {
    activeGroupId.value = firstGroup.id;
    activeCity.value = firstGroup.city;
  }
};

const activeGroup = computed(() => {
  return photoStore.groups.find((g) => g.id === activeGroupId.value) || null;
});

// 每个城市的照片数量
const cityPhotoCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const group of photoStore.groups) {
    const currentCount = counts[group.city];
    counts[group.city] = (currentCount ?? 0) + group.photos.length;
  }
  return counts;
});

const getCityPhotoCount = (city: string): number => {
  return cityPhotoCounts.value[city] || 0;
};

const selectGroup = (id: string) => {
  activeGroupId.value = id;
  const group = photoStore.groups.find((g) => g.id === id);
  if (group) {
    activeCity.value = group.city;
  }
  showUploader.value = false;
};

const selectCity = (city: string) => {
  activeCity.value = city;
  // 选择该城市的第一个分组
  const group = photoStore.groups.find((g) => g.city === city);
  if (group) {
    activeGroupId.value = group.id;
  }
};

const handleCitySelect = (city: string) => {
  // 弹出输入分组名称
  const name = window.prompt(`新建「${city}」的分组，请输入分组名称：`);
  if (!name) return;

  const newGroup = photoStore.addGroup(name, city);
  activeGroupId.value = newGroup.id;
  activeCity.value = city;
  showCreateGroup.value = false;
};

const deleteGroup = (id: string) => {
  const group = photoStore.groups.find((g) => g.id === id);
  if (!group) return;

  if (confirm(`确定要删除分组「${group.name}」及其所有照片吗？`)) {
    photoStore.removeGroup(id);

    // 如果删除的是当前选中的分组，选择第一个
    if (activeGroupId.value === id) {
      activeGroupId.value = photoStore.groups[0]?.id || null;
      activeCity.value = photoStore.groups[0]?.city || null;
    }
  }
};

const handlePhotoUpload = (
  photos: { url: string; title: string; description?: string; date?: string }[]
) => {
  if (!activeGroupId.value) return;

  for (const photo of photos) {
    photoStore.addPhoto(activeGroupId.value, photo);
  }

  showUploader.value = false;
};

const handlePhotoDelete = (photoId: string) => {
  if (!activeGroupId.value) return;
  photoStore.removePhoto(activeGroupId.value, photoId);
};

const openLightbox = (index: number) => {
  lightboxIndex.value = index;
  showLightbox.value = true;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
</script>

<style scoped>
.photos-page {
  min-height: 100vh;
  padding-bottom: 4rem;
}

/* Hero 区域 - 毛玻璃风格 */
.hero {
  position: relative;
  padding: 2.5rem 1.5rem 2rem;
  margin-bottom: 1.5rem;
}

.hero-content {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

.title {
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #f43f5e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--color-text-secondary);
  font-size: 1rem;
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 1.5rem;
}

.stat-item {
  text-align: center;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
}

.btn-logout {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-logout:hover {
  background: rgba(244, 63, 94, 0.1);
  border-color: rgba(244, 63, 94, 0.3);
  color: #f43f5e;
}

/* 内容区域 */
.content {
  padding: 0 1.5rem;
}

.layout {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) minmax(0, 1.6fr);
  gap: 1.5rem;
}

/* 侧边栏 */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-section {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-primary);
}

.section-count {
  font-size: 0.75rem;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
  padding: 0.2rem 0.6rem;
  border-radius: 20px;
  font-weight: 500;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.clear-filter {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.clear-filter:hover {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
}

/* 分组列表 */
.group-list {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.group-item:hover {
  background: rgba(99, 102, 241, 0.05);
}

.group-item.active {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.2);
}

.group-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.group-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
}

.group-meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 0.15rem;
}

.group-delete {
  opacity: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.group-item:hover .group-delete {
  opacity: 1;
}

.group-delete:hover {
  background: rgba(244, 63, 94, 0.1);
  color: #f43f5e;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.7rem 1.2rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.25s ease;
}

.btn-outline {
  width: 100%;
  background: rgba(99, 102, 241, 0.05);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  color: #6366f1;
}

.btn-outline:hover {
  background: rgba(99, 102, 241, 0.1);
  border-style: solid;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  border-radius: 10px;
}

/* 城市标签 */
.city-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.05);
}

.tag.active {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-color: rgba(99, 102, 241, 0.3);
}

.tag-count {
  font-size: 0.7rem;
  background: rgba(99, 102, 241, 0.15);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 500;
}

/* 地图区域 */
.map-section {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(24px) saturate(190%);
  -webkit-backdrop-filter: blur(24px) saturate(190%);
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
  min-height: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.current-city {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

/* 强制地图组件适配卡片高度 */
.map-section > .china-map-container,
.map-section .china-map-container {
  height: 100%;
  min-height: 420px;
}

/* 照片区域 */
.photos-section {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.current-group {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 400;
}

.uploader-area {
  margin-bottom: 1.25rem;
}

/* 空状态 */
.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  filter: grayscale(0.3);
}

.empty-state p {
  color: var(--color-text-secondary);
  margin: 0;
}

.empty-hint {
  font-size: 0.85rem;
  margin-top: 0.5rem !important;
  color: var(--color-text-muted) !important;
}

/* 照片网格 */
.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.photo-item {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
}

.photo-item:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.12);
}

.photo-thumb {
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  overflow: hidden;
}

.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.photo-item:hover .photo-thumb img {
  transform: scale(1.08);
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.photo-meta {
  padding: 0.7rem 0.9rem 0.8rem;
}

.photo-title {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text-primary);
}

.photo-desc {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.photo-date {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

/* 响应式布局 */
@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr 1fr;
  }

  .sidebar {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    grid-column: span 1;
    display: flex;
    flex-direction: column;
  }

  .map-section {
    min-height: 350px;
  }

  .hero-stats {
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat-item {
    padding: 0.8rem 1.2rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 1.5rem 1rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .content {
    padding: 0 1rem;
  }

  .layout {
    gap: 1rem;
  }

  .photos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}
</style>
