import { create } from 'zustand';
import type { AuthUser } from '@gym-app/shared';
import { api, getToken, setToken } from './api';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ status: 'signedOut', user: null });
      return;
    }
    try {
      const user = await api.get<AuthUser>('/api/auth/me');
      set({ status: 'signedIn', user });
    } catch {
      await setToken(null);
      set({ status: 'signedOut', user: null });
    }
  },

  signIn: async (token, user) => {
    await setToken(token);
    set({ status: 'signedIn', user });
  },

  signOut: async () => {
    await setToken(null);
    set({ status: 'signedOut', user: null });
  },

  setUser: (user) => set({ user }),
}));
