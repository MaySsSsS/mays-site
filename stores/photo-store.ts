"use client";

import { create } from "zustand";

import {
  deletePhoto,
  fetchGroups,
  saveGroups,
  uploadPhoto
} from "@/lib/photo-api";
import {
  CHINA_CITIES,
  createSampleGroups,
  loadGroupsFromStorage,
  saveGroupsToStorage
} from "@/lib/photo";
import type { PhotoGroup, UploadPhotoInput } from "@/types/photo";

interface PhotoStoreState {
  groups: PhotoGroup[];
  loading: boolean;
  error: string | null;
  hydrateFromStorage: () => void;
  fetchFromApi: () => Promise<void>;
  saveToApi: () => Promise<void>;
  addGroup: (name: string, city: string) => Promise<PhotoGroup>;
  removeGroup: (groupId: string) => Promise<void>;
  addPhoto: (groupId: string, photo: UploadPhotoInput) => Promise<void>;
  removePhoto: (groupId: string, photoId: string) => Promise<void>;
  initSampleData: () => void;
}

function persistGroups(groups: PhotoGroup[]) {
  saveGroupsToStorage(groups);
}

export const usePhotoStore = create<PhotoStoreState>((set, get) => ({
  groups: [],
  loading: false,
  error: null,
  hydrateFromStorage: () => {
    const storedGroups = loadGroupsFromStorage();
    if (storedGroups.length > 0) {
      set({ groups: storedGroups });
    }
  },
  fetchFromApi: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetchGroups();
      const nextGroups = response.groups ?? [];
      persistGroups(nextGroups);
      set({
        groups: nextGroups,
        error: null
      });
    } catch (error) {
      const fallbackGroups = loadGroupsFromStorage();
      if (fallbackGroups.length > 0) {
        set({
          groups: fallbackGroups,
          error: error instanceof Error ? error.message : "加载失败"
        });
      } else {
        const sampleGroups = createSampleGroups();
        persistGroups(sampleGroups);
        set({
          groups: sampleGroups,
          error: error instanceof Error ? error.message : "加载失败"
        });
      }
    } finally {
      set({ loading: false });
    }
  },
  saveToApi: async () => {
    const nextGroups = get().groups;
    persistGroups(nextGroups);

    try {
      await saveGroups(nextGroups);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存失败"
      });
      throw error;
    }
  },
  addGroup: async (name, city) => {
    const cityInfo = CHINA_CITIES[city];
    const newGroup: PhotoGroup = {
      id: `${city}-${Date.now()}`,
      name,
      city,
      location: cityInfo
        ? {
            lat: cityInfo.lat,
            lng: cityInfo.lng
          }
        : undefined,
      photos: [],
      createdAt: new Date().toISOString()
    };

    const nextGroups = [newGroup, ...get().groups];
    set({ groups: nextGroups });
    persistGroups(nextGroups);

    try {
      await saveGroups(nextGroups);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存失败"
      });
    }

    return newGroup;
  },
  removeGroup: async (groupId) => {
    const nextGroups = get().groups.filter((group) => group.id !== groupId);
    set({ groups: nextGroups });
    persistGroups(nextGroups);

    try {
      await saveGroups(nextGroups);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存失败"
      });
    }
  },
  addPhoto: async (groupId, photoInput) => {
    const currentGroups = [...get().groups];
    const groupIndex = currentGroups.findIndex((group) => group.id === groupId);

    if (groupIndex === -1) {
      return;
    }

    const photoId = `photo-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    if (photoInput.file) {
      await uploadPhoto(photoInput.file, groupId, photoId);
    }

    const nextGroups = [...currentGroups];
    nextGroups[groupIndex] = {
      ...nextGroups[groupIndex],
      photos: [
        ...nextGroups[groupIndex].photos,
        {
          id: photoId,
          title: photoInput.title,
          description: photoInput.description,
          date: photoInput.date,
          url: photoInput.url
        }
      ]
    };

    set({ groups: nextGroups });
    persistGroups(nextGroups);

    try {
      await saveGroups(nextGroups);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存失败"
      });
    }
  },
  removePhoto: async (groupId, photoId) => {
    const currentGroups = [...get().groups];
    const groupIndex = currentGroups.findIndex((group) => group.id === groupId);

    if (groupIndex === -1) {
      return;
    }

    try {
      await deletePhoto(groupId, photoId);
    } catch {
      // Ignore storage cleanup failures and still remove the local record.
    }

    const nextGroups = [...currentGroups];
    nextGroups[groupIndex] = {
      ...nextGroups[groupIndex],
      photos: nextGroups[groupIndex].photos.filter((photo) => photo.id !== photoId)
    };

    set({ groups: nextGroups });
    persistGroups(nextGroups);

    try {
      await saveGroups(nextGroups);
      set({ error: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "保存失败"
      });
    }
  },
  initSampleData: () => {
    if (get().groups.length > 0) {
      return;
    }

    const sampleGroups = createSampleGroups();
    persistGroups(sampleGroups);
    set({ groups: sampleGroups });
  }
}));
