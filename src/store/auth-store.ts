// ==============================================================================
// Auth Store — Zustand store with real backend integration
// ==============================================================================
// Drop-in replacement for the stub auth-store.ts in the repo.
// Reads/writes localStorage tokens and calls the backend API.

import { create } from 'zustand';
import { auth, setTokens, type AuthUser } from '../lib/api/client';

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;

  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,

  // Called once on app mount to rehydrate from localStorage
  init: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('parker_token');
    const userRaw = localStorage.getItem('parker_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as AuthUser;
        set({ isAuthenticated: true, user, accessToken: token });
      } catch {
        localStorage.removeItem('parker_token');
        localStorage.removeItem('parker_user');
      }
    }
  },

  login: async (email, password) => {
    const result = await auth.login(email, password);
    if (!result.ok) return { ok: false, error: result.error };

    const { user, access_token, refresh_token } = result.data;
    setTokens(access_token, refresh_token, user);
    set({ isAuthenticated: true, user, accessToken: access_token });
    return { ok: true };
  },

  register: async (name, email, password, role) => {
    const result = await auth.register(name, email, password, role);
    if (!result.ok) return { ok: false, error: result.error };

    const { user, access_token, refresh_token } = result.data;
    setTokens(access_token, refresh_token, user);
    set({ isAuthenticated: true, user, accessToken: access_token });
    return { ok: true };
  },

  logout: () => {
    localStorage.removeItem('parker_token');
    localStorage.removeItem('parker_refresh');
    localStorage.removeItem('parker_user');
    set({ isAuthenticated: false, user: null, accessToken: null });
  },
}));
