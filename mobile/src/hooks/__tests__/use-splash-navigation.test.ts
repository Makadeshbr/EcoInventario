const mockRouterReplace = jest.fn();
let mockIsAuthenticated: boolean;
let mockRefreshAccessToken: jest.Mock;
let mockLogout: jest.Mock;

let mockNavigationState: any;

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: any[]) => mockRouterReplace(...args),
  },
  useRootNavigationState: () => mockNavigationState,
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    isAuthenticated: mockIsAuthenticated,
    refreshAccessToken: mockRefreshAccessToken,
    logout: mockLogout,
  })),
}));

import { renderHook } from '@testing-library/react-native';
import { waitFor } from '@testing-library/react-native';
import { useSplashNavigation } from '../use-splash-navigation';

beforeEach(() => {
  mockIsAuthenticated = false;
  mockRefreshAccessToken = jest.fn().mockResolvedValue(false);
  mockLogout = jest.fn();
  mockNavigationState = { key: 'mocked-key' };
  jest.clearAllMocks();
});

describe('useSplashNavigation', () => {
  test('sem token: navega para /(welcome)', async () => {
    mockIsAuthenticated = false;

    renderHook(() => useSplashNavigation());

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(welcome)');
    });
  });

  test('com token e refresh OK: navega para /(app)/(home)', async () => {
    mockIsAuthenticated = true;
    mockRefreshAccessToken = jest.fn().mockResolvedValue(true);

    renderHook(() => useSplashNavigation());

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/(app)/(home)');
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('com token e refresh falhou: chama logout e navega para /(welcome)', async () => {
    mockIsAuthenticated = true;
    mockRefreshAccessToken = jest.fn().mockResolvedValue(false);

    renderHook(() => useSplashNavigation());

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(welcome)');
    });
  });

  test('não chama refresh quando não autenticado', async () => {
    mockIsAuthenticated = false;

    renderHook(() => useSplashNavigation());

    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalled());
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });
});
