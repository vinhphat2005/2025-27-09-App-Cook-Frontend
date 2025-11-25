// hooks/useAuthStore.ts (hoặc file bạn đang dùng)
import { User } from "@/types";
import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;

  // optional helpers
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

// Simple store without persistence for web compatibility
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  _hasHydrated: true, // Always ready on web
  login: (token, user) => set({ token, user, isAuthenticated: true }),
  logout: () => set({ token: null, user: null, isAuthenticated: false }),
  setToken: (token) => set((s) => ({ ...s, token, isAuthenticated: !!token })),
  setUser: (user) => set((s) => ({ ...s, user })),
  setHasHydrated: (state) => set({ _hasHydrated: state }),
}));
