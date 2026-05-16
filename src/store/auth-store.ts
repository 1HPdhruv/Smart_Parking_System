import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: null | any;
}

export const useAuthStore = create<AuthState>(() => ({
  isAuthenticated: false,
  user: null,
}));
