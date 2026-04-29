import { useState } from 'react';
import { router } from 'expo-router';
import { HTTPError } from 'ky';
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
      if (err instanceof HTTPError) {
        try {
          const errorBody = await err.response.json<{ error?: { message?: string } }>();
          setError(errorBody.error?.message ?? 'Credenciais inválidas ou erro no servidor.');
        } catch {
          setError('Erro ao conectar com o servidor. Tente novamente.');
        }
      } else {
        setError(
          err instanceof Error && err.message
            ? 'Falha na conexão. Verifique sua internet.'
            : 'Erro inesperado. Tente novamente.',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return { handleLogin, isLoading, error };
}
