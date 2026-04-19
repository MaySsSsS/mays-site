"use client";

import { create } from "zustand";

import {
  authenticate,
  clearToken,
  hasStoredToken
} from "@/lib/photo-api";

interface AuthState {
  initialized: boolean;
  isAuthenticated: boolean;
  initialize: () => void;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  isAuthenticated: false,
  initialize: () => {
    set({
      initialized: true,
      isAuthenticated: hasStoredToken()
    });
  },
  login: async (password) => {
    const success = await authenticate(password);
    if (success) {
      set({
        initialized: true,
        isAuthenticated: true
      });
    }
    return success;
  },
  logout: () => {
    clearToken();
    set({
      initialized: true,
      isAuthenticated: false
    });
  }
}));
