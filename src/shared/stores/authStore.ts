// Auth store — current user + login/logout helpers.

import { create } from 'zustand';
import type { User } from '@/shared/types';
import * as authApi from '@/shared/api/auth';
import { getAuthToken } from '@/shared/api/client';
import { disconnectModule } from '@/shared/api/socket';
import { MODULE_IDS } from '@/shared/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  bootstrap: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const { user } = await authApi.login(email, password);
      set({ user, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  logout() {
    authApi.logout();
    // Drop any open websocket so the next login handshakes with a fresh token.
    for (const m of MODULE_IDS) disconnectModule(m);
    set({ user: null, error: null });
  },

  async bootstrap() {
    if (!getAuthToken()) return;
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  setUser(user) {
    set({ user });
  },
}));

export const selectIsAdmin = (s: AuthState) =>
  s.user?.role === 'admin' || s.user?.role === 'caterer' || s.user?.adminAccess === true;
