import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { API_BASE_URL } from '@/constants/config';
import type { User } from '@/types/domain';

const storage = new MMKV();

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (access: string, refresh: string, user: User) => void;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: storage.getString('access_token') ?? null,
  refreshToken: storage.getString('refresh_token') ?? null,
  user: JSON.parse(storage.getString('user') ?? 'null'),
  isAuthenticated: !!storage.getString('access_token'),

  setAuth: (access, refresh, user) => {
    storage.set('access_token', access);
    storage.set('refresh_token', refresh);
    storage.set('user', JSON.stringify(user));
    set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true });
  },

  refreshAccessToken: async () => {
    const rt = get().refreshToken;
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const user = get().user;
      if (!user || user.role !== 'tech') return false;
      get().setAuth(data.access_token, data.refresh_token, user);
      return true;
    } catch (error) {
      // Falha de rede ou token inválido — não propaga, mas loga para diagnóstico
      console.error('[AuthStore] refreshAccessToken falhou:', error);
      return false;
    }
  },

  logout: () => {
    storage.delete('access_token');
    storage.delete('refresh_token');
    storage.delete('user');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
