import ky from 'ky';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL } from '@/constants/config';

export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 10_000,
  hooks: {
    beforeRequest: [
      (req) => {
        const token = useAuthStore.getState().accessToken;
        if (token) req.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (req, _opts, res) => {
        // Se for 401 e não for rota de auth, tenta refresh
        const isAuthRoute = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
        if (res.status === 401 && !isAuthRoute) {
          const ok = await useAuthStore.getState().refreshAccessToken();
          if (!ok) useAuthStore.getState().logout();
        }
      },
    ],
    beforeError: [
      (error) => {
        const { response } = error;
        if (!response) {
          console.error('[API] Erro de rede ou servidor inacessível');
        }
        return error;
      },
    ],
  },
});
