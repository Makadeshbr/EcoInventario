import ky from 'ky';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL } from '@/constants/config';

export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30_000,
  hooks: {
    beforeRequest: [
      (req) => {
        const token = useAuthStore.getState().accessToken;
        if (token) req.headers.set('Authorization', `Bearer ${token}`);
      },
    ],
    afterResponse: [
      async (_req, _opts, res) => {
        if (res.status === 401) {
          const ok = await useAuthStore.getState().refreshAccessToken();
          if (!ok) useAuthStore.getState().logout();
        }
      },
    ],
  },
});
