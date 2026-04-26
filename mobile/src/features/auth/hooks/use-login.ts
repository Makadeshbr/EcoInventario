import { useState } from 'react';
import { router } from 'expo-router';
import { login } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginFormData } from '@/features/auth/schemas';

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleLogin(data: LoginFormData) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await login(data);
      if (response.user.role !== 'tech') {
        setError(
          'Acesso profissional mobile é exclusivo para perfil técnico. Use o dashboard web.',
        );
        return;
      }
      setAuth(response.accessToken, response.refreshToken, response.user);
      router.replace('/(app)/(home)');
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Erro ao entrar. Verifique suas credenciais.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { handleLogin, isLoading, error };
}
