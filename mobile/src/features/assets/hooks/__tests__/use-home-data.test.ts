// useFocusEffect como no-op: evita loop infinito de re-renders no React 19
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

jest.mock('@/sync/sync-engine', () => ({
  SyncEngine: {
    sync: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockAssets = [
  {
    id: 'a-1', organizationId: 'org-1', assetTypeId: 'at-1', assetTypeName: 'Árvore',
    latitude: -15.78, longitude: -47.93, gpsAccuracyM: 3, qrCode: 'qr-1',
    status: 'approved', version: 1, parentId: null, rejectionReason: null,
    notes: null, createdBy: 'u-1', approvedBy: 'u-2', createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z', deletedAt: null, isSynced: true,
  },
];

jest.mock('../../repository', () => ({
  getRecentAssets: jest.fn().mockResolvedValue(mockAssets),
  countAssetsByStatus: jest.fn().mockResolvedValue({
    draft: 2, pending: 1, approved: 5, rejected: 0,
  }),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useHomeData } from '../use-home-data';
import { getRecentAssets, countAssetsByStatus } from '../../repository';

beforeEach(() => {
  jest.clearAllMocks();
  (getRecentAssets as jest.Mock).mockResolvedValue(mockAssets);
  (countAssetsByStatus as jest.Mock).mockResolvedValue({ draft: 2, pending: 1, approved: 5, rejected: 0 });
});

describe('useHomeData', () => {
  test('chama getRecentAssets com limit 5', async () => {
    const { result } = renderHook(() => useHomeData());
    await act(async () => { await result.current.refresh(); });
    expect(getRecentAssets).toHaveBeenCalledWith(5);
  });

  test('chama countAssetsByStatus', async () => {
    const { result } = renderHook(() => useHomeData());
    await act(async () => { await result.current.refresh(); });
    expect(countAssetsByStatus).toHaveBeenCalled();
  });

  test('retorna os assets recentes do banco', async () => {
    const { result } = renderHook(() => useHomeData());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.recentAssets).toEqual(mockAssets);
  });

  test('retorna os contadores por status corretamente', async () => {
    const { result } = renderHook(() => useHomeData());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.counts.draft).toBe(2);
    expect(result.current.counts.pending).toBe(1);
    expect(result.current.counts.approved).toBe(5);
    expect(result.current.counts.rejected).toBe(0);
  });

  test('isLoading termina como false após carregar', async () => {
    const { result } = renderHook(() => useHomeData());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isLoading).toBe(false);
  });

  test('isLoading volta a false mesmo se o banco retornar erro', async () => {
    (getRecentAssets as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useHomeData());
    await act(async () => {
      try { await result.current.refresh(); } catch { /* ignorado */ }
    });
    expect(result.current.isLoading).toBe(false);
  });
});
