// Prefixo `mock` obrigatório para variáveis referenciadas no factory do jest.mock()
let mockStorage: { set: jest.Mock; getString: jest.Mock; delete: jest.Mock };

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => {
    mockStorage = {
      set: jest.fn(),
      getString: jest.fn().mockReturnValue(null),
      delete: jest.fn(),
    };
    return mockStorage;
  }),
}));

jest.mock('@/constants/config', () => ({
  API_BASE_URL: 'http://test.local/api/v1',
}));

import { useAuthStore } from '../auth-store';
import type { User } from '@/types/domain';

const mockUser: User = {
  id: 'u-1',
  name: 'Tech User',
  email: 'tech@example.com',
  role: 'tech',
  organizationId: 'org-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.getString.mockReturnValue(null);
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
  });
});

describe('auth store — estado inicial', () => {
  test('começa desautenticado quando MMKV não tem token', () => {
    const { accessToken, isAuthenticated, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(user).toBeNull();
  });
});

describe('auth store — setAuth', () => {
  test('persiste tokens no MMKV', () => {
    useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);
    expect(mockStorage.set).toHaveBeenCalledWith('access_token', 'access-abc');
    expect(mockStorage.set).toHaveBeenCalledWith('refresh_token', 'refresh-xyz');
    expect(mockStorage.set).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
  });

  test('atualiza state com tokens e isAuthenticated true', () => {
    useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-abc');
    expect(state.refreshToken).toBe('refresh-xyz');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });
});

describe('auth store — logout', () => {
  test('limpa MMKV', () => {
    useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);
    useAuthStore.getState().logout();
    expect(mockStorage.delete).toHaveBeenCalledWith('access_token');
    expect(mockStorage.delete).toHaveBeenCalledWith('refresh_token');
    expect(mockStorage.delete).toHaveBeenCalledWith('user');
  });

  test('reseta state para desautenticado', () => {
    useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('auth store — refreshAccessToken', () => {
  test('retorna false sem refresh token', async () => {
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('retorna false quando fetch retorna não-ok', async () => {
    useAuthStore.setState({ refreshToken: 'rt-1', user: mockUser });
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false });
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('retorna false quando fetch lança exceção', async () => {
    useAuthStore.setState({ refreshToken: 'rt-1', user: mockUser });
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('network error'));
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('atualiza tokens no state quando fetch retorna ok', async () => {
    useAuthStore.setState({ refreshToken: 'rt-old', user: mockUser });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    });
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });

  test('retorna false se user não for tech', async () => {
    const adminUser: User = { ...mockUser, role: 'admin' };
    useAuthStore.setState({ refreshToken: 'rt-1', user: adminUser });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    });
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });
});
