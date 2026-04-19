"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { countCityPhotos } from "@/lib/photo";
import { useAuthStore } from "@/stores/auth-store";
import { usePhotoStore } from "@/stores/photo-store";

import { CitySelector } from "./CitySelector";
import { PhotoAsset } from "./PhotoAsset";
import { PhotoAuth } from "./PhotoAuth";

import styles from "@/styles/photo/photos.module.css";

const ChinaMap = dynamic(
  () => import("./ChinaMap").then((module) => module.ChinaMap),
  {
    ssr: false,
    loading: () => <div className={styles.loading}>正在加载地图...</div>
  }
);

const PhotoLightbox = dynamic(
  () => import("./PhotoLightbox").then((module) => module.PhotoLightbox),
  {
    ssr: false
  }
);

const PhotoUploader = dynamic(
  () => import("./PhotoUploader").then((module) => module.PhotoUploader),
  {
    ssr: false
  }
);

export function PhotosClient() {
  const initialized = useAuthStore((state) => state.initialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const logout = useAuthStore((state) => state.logout);

  const groups = usePhotoStore((state) => state.groups);
  const loading = usePhotoStore((state) => state.loading);
  const error = usePhotoStore((state) => state.error);
  const hydrateFromStorage = usePhotoStore((state) => state.hydrateFromStorage);
  const fetchFromApi = usePhotoStore((state) => state.fetchFromApi);
  const addGroup = usePhotoStore((state) => state.addGroup);
  const removeGroup = usePhotoStore((state) => state.removeGroup);
  const addPhoto = usePhotoStore((state) => state.addPhoto);
  const removePhoto = usePhotoStore((state) => state.removePhoto);
  const initSampleData = usePhotoStore((state) => state.initSampleData);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    initializeAuth();
    hydrateFromStorage();
  }, [hydrateFromStorage, initializeAuth]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (groups.length === 0) {
        initSampleData();
      }
      return;
    }

    void fetchFromApi();
  }, [fetchFromApi, groups.length, initSampleData, isAuthenticated]);

  useEffect(() => {
    if (groups.length === 0) {
      setActiveGroupId(null);
      setActiveCity(null);
      return;
    }

    const activeGroup = groups.find((group) => group.id === activeGroupId);
    if (!activeGroup) {
      setActiveGroupId(groups[0]?.id ?? null);
      setActiveCity(groups[0]?.city ?? null);
      return;
    }

    setActiveCity(activeGroup.city);
  }, [activeGroupId, groups]);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;
  const cities = Array.from(new Set(groups.map((group) => group.city)));
  const totalPhotos = groups.reduce((total, group) => total + group.photos.length, 0);
  const cityPhotoCounts = countCityPhotos(groups);

  async function handleCreateGroup(city: string) {
    const name = window.prompt(`新建「${city}」的分组，请输入分组名称：`);
    if (!name) {
      return;
    }

    const nextGroup = await addGroup(name, city);
    setActiveGroupId(nextGroup.id);
    setActiveCity(city);
    setShowCreateGroup(false);
  }

  async function handlePhotoUpload(photos: Parameters<typeof addPhoto>[1][]) {
    if (!activeGroup) {
      return;
    }

    for (const photo of photos) {
      await addPhoto(activeGroup.id, photo);
    }

    setShowUploader(false);
  }

  async function handlePhotoDelete(photoId: string) {
    if (!activeGroup) {
      return;
    }

    await removePhoto(activeGroup.id, photoId);
    setShowLightbox(false);
  }

  if (!initialized) {
    return <div className={styles.loading}>正在初始化...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>PHOTO JOURNAL</p>
            <h1 className={styles.heroTitle}>把照片按城市重新归档</h1>
            <p className={styles.heroText}>
              登录后查看按城市整理的照片、地图和时间线。
            </p>
          </div>
        </section>
        <PhotoAuth onSuccess={() => void fetchFromApi()} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>PHOTO JOURNAL</p>
          <h1 className={styles.heroTitle}>照片 · 足迹</h1>
          <p className={styles.heroText}>
            按城市整理照片，在地图上查看足迹，管理分组、上传和删除。
          </p>

          <div className={styles.stats}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{groups.length}</span>
              <span className={styles.statLabel}>个分组</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{totalPhotos}</span>
              <span className={styles.statLabel}>张照片</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{cities.length}</span>
              <span className={styles.statLabel}>个城市</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.logoutButton}
            onClick={() => logout()}
          >
            退出登录
          </button>
        </div>
      </section>

      {error ? <div className={styles.errorBanner}>ERROR: {error}</div> : null}

      <section className={styles.content}>
        <aside className={styles.sidebar}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>分组</h2>
              <span className={styles.panelCount}>{groups.length}</span>
            </div>
            <div className={styles.groupList}>
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`${styles.groupItem} ${
                    group.id === activeGroupId ? styles.groupItemActive : ""
                  }`}
                >
                  <button
                    type="button"
                    className={styles.groupButton}
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveGroupId(group.id);
                      setActiveCity(group.city);
                      setShowUploader(false);
                    }}
                  >
                    <span className={styles.groupName}>{group.name}</span>
                    <span className={styles.groupMeta}>
                      {group.city} · {group.photos.length} 张
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.groupDelete}
                    onClick={() => void removeGroup(group.id)}
                    aria-label={`删除分组 ${group.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setShowCreateGroup(true)}
            >
              + 新建分组
            </button>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>城市筛选</h2>
              {activeCity ? (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={() => setActiveCity(null)}
                >
                  清除
                </button>
              ) : null}
            </div>
            <div className={styles.tags}>
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`${styles.tag} ${
                    city === activeCity ? styles.tagActive : ""
                  }`}
                  onClick={() => {
                    setActiveCity(city);
                    const firstGroup = groups.find((group) => group.city === city);
                    if (firstGroup) {
                      setActiveGroupId(firstGroup.id);
                    }
                  }}
                >
                  {city}
                  <span className={styles.tagCount}>{cityPhotoCounts[city] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className={styles.mapPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>足迹地图</h2>
            {activeCity ? <span className={styles.currentTag}>当前：{activeCity}</span> : null}
          </div>
          <ChinaMap
            activeCity={activeCity}
            visitedCities={cities}
            cityPhotoCounts={cityPhotoCounts}
            onSelect={(city) => {
              setActiveCity(city);
              const firstGroup = groups.find((group) => group.city === city);
              if (firstGroup) {
                setActiveGroupId(firstGroup.id);
              }
            }}
          />
        </section>

        <section className={styles.galleryPanel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              照片
              {activeGroup ? (
                <span className={styles.currentTag}>
                  · {activeGroup.name}（{activeGroup.photos.length} 张）
                </span>
              ) : null}
            </h2>

            {activeGroup ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setShowUploader((open) => !open)}
              >
                {showUploader ? "取消" : "+ 添加照片"}
              </button>
            ) : null}
          </div>

          {showUploader && activeGroup ? (
            <PhotoUploader
              onUpload={handlePhotoUpload}
              onCancel={() => setShowUploader(false)}
            />
          ) : null}

          {loading ? <div className={styles.loading}>正在同步照片...</div> : null}

          {!activeGroup ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>还没有选择分组</p>
              <p className={styles.emptyText}>在左侧选择分组，或者先创建一个新的城市分组。</p>
            </div>
          ) : activeGroup.photos.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>这个分组还没有照片</p>
              <p className={styles.emptyText}>点击上方「添加照片」开始上传。</p>
            </div>
          ) : (
            <div className={styles.photoGrid}>
              {activeGroup.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={styles.photoCard}
                  onClick={() => {
                    setLightboxIndex(index);
                    setShowLightbox(true);
                  }}
                >
                  <PhotoAsset
                    groupId={activeGroup.id}
                    photo={photo}
                    alt={photo.title}
                    className={styles.photoImage}
                    fallbackClassName={styles.photoFallback}
                  />
                  <div className={styles.photoMeta}>
                    <span className={styles.photoTitle}>{photo.title}</span>
                    {photo.date ? <span className={styles.photoDate}>{photo.date}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      <CitySelector
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onSelect={(city) => void handleCreateGroup(city)}
      />

      <PhotoLightbox
        open={showLightbox}
        groupId={activeGroup?.id ?? null}
        photos={activeGroup?.photos ?? []}
        initialIndex={lightboxIndex}
        onClose={() => setShowLightbox(false)}
        onDelete={handlePhotoDelete}
      />
    </div>
  );
}
