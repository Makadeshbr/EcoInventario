import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export function useSplashNavigation() {
  // Expo Router só aceita navigate() depois que o estado de navegação está pronto
  const navigationState = useRootNavigationState();
  const { isAuthenticated, refreshAccessToken, logout } = useAuthStore();

  useEffect(() => {
    if (!navigationState?.key) return; // navStack ainda não montado

    let cancelled = false;

    async function navigate() {
      if (!isAuthenticated) {
        router.replace('/(welcome)');
        return;
      }
      const ok = await refreshAccessToken();
      if (cancelled) return;
      if (ok) {
        router.replace('/(app)/(home)');
      } else {
        logout();
        router.replace('/(welcome)');
      }
    }

    navigate();

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key]);
}
