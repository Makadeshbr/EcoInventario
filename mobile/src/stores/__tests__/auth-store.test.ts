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

jest.mock('@/db/database', () => ({
  resetLocalDatabase: jest.fn().mockResolvedValue(undefined),
}));

const mockSyncReset = jest.fn();
jest.mock('@/stores/sync-store', () => ({
  useSyncStore: {
    getState: () => ({ reset: mockSyncReset }),
  },
}));

import { resetLocalDatabase } from '@/db/database';
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

describe('auth store - estado inicial', () => {
  test('comeca desautenticado quando MMKV nao tem token', () => {
    const { accessToken, isAuthenticated, user } = useAuthStore.getState();
    expect(accessToken).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(user).toBeNull();
  });
});

describe('auth store - setAuth', () => {
  test('persiste tokens no MMKV', async () => {
    await useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);

    expect(mockStorage.set).toHaveBeenCalledWith('access_token', 'access-abc');
    expect(mockStorage.set).toHaveBeenCalledWith('refresh_token', 'refresh-xyz');
    expect(mockStorage.set).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(mockStorage.set).toHaveBeenCalledWith('local_data_user_id', mockUser.id);
  });

  test('atualiza state com tokens e isAuthenticated true', async () => {
    await useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access-abc');
    expect(state.refreshToken).toBe('refresh-xyz');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  test('reseta banco local quando owner local difere do usuario autenticado', async () => {
    mockStorage.getString.mockImplementation((key: string) =>
      key === 'local_data_user_id' ? 'old-user' : null,
    );

    await useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);

    expect(resetLocalDatabase).toHaveBeenCalledTimes(1);
    expect(mockSyncReset).toHaveBeenCalledTimes(1);
  });

  test('nao reseta banco local quando owner local ja e o mesmo usuario', async () => {
    mockStorage.getString.mockImplementation((key: string) =>
      key === 'local_data_user_id' ? mockUser.id : null,
    );

    await useAuthStore.getState().setAuth('access-abc', 'refresh-xyz', mockUser);

    expect(resetLocalDatabase).not.toHaveBeenCalled();
    expect(mockSyncReset).not.toHaveBeenCalled();
  });
});

describe('auth store - logout', () => {
  test('limpa MMKV e dados locais', () => {
    useAuthStore.getState().logout();

    expect(mockStorage.delete).toHaveBeenCalledWith('access_token');
    expect(mockStorage.delete).toHaveBeenCalledWith('refresh_token');
    expect(mockStorage.delete).toHaveBeenCalledWith('user');
    expect(mockStorage.delete).toHaveBeenCalledWith('local_data_user_id');
    expect(resetLocalDatabase).toHaveBeenCalledTimes(1);
    expect(mockSyncReset).toHaveBeenCalledTimes(1);
  });

  test('reseta state para desautenticado', () => {
    useAuthStore.setState({
      accessToken: 'access-abc',
      refreshToken: 'refresh-xyz',
      user: mockUser,
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('auth store - refreshAccessToken', () => {
  test('retorna false sem refresh token', async () => {
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('retorna false quando fetch retorna nao-ok', async () => {
    useAuthStore.setState({ refreshToken: 'rt-1', user: mockUser });
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false });
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('retorna false quando fetch lanca excecao', async () => {
    useAuthStore.setState({ refreshToken: 'rt-1', user: mockUser });
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('network error'));
    const result = await useAuthStore.getState().refreshAccessToken();
    expect(result).toBe(false);
  });

  test('atualiza tokens no state quando fetch retorna ok', async () => {
    mockStorage.getString.mockImplementation((key: string) =>
      key === 'local_data_user_id' ? mockUser.id : null,
    );
    useAuthStore.setState({ refreshToken: 'rt-old', user: mockUser });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-access', refresh_token: 'new-refresh' }),
    });

    const result = await useAuthStore.getState().refreshAccessToken();

    expect(result).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('new-access');
  });

  test('retorna false se user nao for tech', async () => {
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
