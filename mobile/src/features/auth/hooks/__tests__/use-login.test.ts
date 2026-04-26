const mockRouterReplace = jest.fn();
let mockSetAuth: jest.Mock;

jest.mock('expo-router', () => ({
  router: {
    // wrapper lazy: lê mockRouterReplace no momento da chamada, não no factory
    replace: (...args: any[]) => mockRouterReplace(...args),
  },
}));

jest.mock('@/features/auth/api', () => ({
  login: jest.fn(),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn((selector?: (s: any) => any) => {
    const state = { setAuth: mockSetAuth };
    return selector ? selector(state) : state;
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { login } from '@/features/auth/api';
import { useLogin } from '../use-login';
import type { User } from '@/types/domain';

const mockUser: User = {
  id: 'u-1',
  name: 'Tech User',
  email: 'tech@eco.com',
  role: 'tech',
  organizationId: 'org-1',
};

beforeEach(() => {
  mockSetAuth = jest.fn();
  jest.clearAllMocks();
});

describe('useLogin — estado inicial', () => {
  test('não está loading e não tem erro', () => {
    const { result } = renderHook(() => useLogin());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useLogin — login bem-sucedido', () => {
  test('role tech: salva auth e navega para (app)/(home)', async () => {
    (login as jest.Mock).mockResolvedValueOnce({
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      expiresIn: 3600,
      user: mockUser,
    });

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleLogin({ email: 'tech@eco.com', password: 'senhasegura' });
    });

    expect(mockSetAuth).toHaveBeenCalledWith('at-1', 'rt-1', mockUser);
    expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/(home)');
    expect(result.current.error).toBeNull();
  });
});

describe('useLogin — bloqueio de roles não-tech', () => {
  test.each(['admin', 'viewer'] as const)(
    'role %s: não navega e exibe mensagem sobre dashboard web',
    async (role) => {
      (login as jest.Mock).mockResolvedValueOnce({
        accessToken: 'at-1',
        refreshToken: 'rt-1',
        expiresIn: 3600,
        user: { ...mockUser, role },
      });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.handleLogin({ email: `${role}@eco.com`, password: 'senhasegura' });
      });

      expect(mockSetAuth).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/dashboard/i);
    },
  );
});

describe('useLogin — erro de API', () => {
  test('exibe mensagem do erro retornado', async () => {
    (login as jest.Mock).mockRejectedValueOnce(new Error('Credenciais inválidas.'));

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleLogin({ email: 'user@eco.com', password: 'wrongpass1' });
    });

    expect(result.current.error).toBe('Credenciais inválidas.');
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  test('erro genérico (sem message): exibe mensagem padrão', async () => {
    (login as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useLogin());

    await act(async () => {
      await result.current.handleLogin({ email: 'user@eco.com', password: 'wrongpass1' });
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('useLogin — loading state', () => {
  test('isLoading é true durante o request e false ao finalizar', async () => {
    let resolveLogin!: (v: any) => void;
    (login as jest.Mock).mockImplementationOnce(
      () => new Promise((res) => { resolveLogin = res; }),
    );

    const { result } = renderHook(() => useLogin());

    act(() => {
      result.current.handleLogin({ email: 'user@eco.com', password: 'senhasegura' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolveLogin({ accessToken: 'at', refreshToken: 'rt', expiresIn: 3600, user: mockUser });
    });

    expect(result.current.isLoading).toBe(false);
  });
});
