// useFocusEffect como no-op: evita loop infinito de re-renders no React 19
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

const mockAssets = [
  {
    id: 'a-1',
    organizationId: 'org-1',
    assetTypeId: 'at-1',
    assetTypeName: 'Árvore Nativa',
    latitude: -15.78,
    longitude: -47.93,
    gpsAccuracyM: 3,
    qrCode: 'qr-1',
    status: 'draft',
    version: 1,
    parentId: null,
    rejectionReason: null,
    notes: null,
    createdBy: 'u-1',
    approvedBy: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
    isSynced: false,
  },
];

jest.mock('../../repository', () => ({
  getAssets: jest.fn().mockResolvedValue(mockAssets),
}));

jest.mock('../../sync-lite', () => ({
  syncPullLite: jest.fn().mockResolvedValue(undefined),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useAssetsList } from '../use-assets-list';
import { getAssets } from '../../repository';

beforeEach(() => {
  jest.clearAllMocks();
  (getAssets as jest.Mock).mockResolvedValue(mockAssets);
});

describe('useAssetsList — estado inicial', () => {
  test('activeFilter inicial é "all"', () => {
    const { result } = renderHook(() => useAssetsList());
    expect(result.current.activeFilter).toBe('all');
  });

  test('aceita filtro inicial vindo da rota', () => {
    const { result } = renderHook(() => useAssetsList('approved'));
    expect(result.current.activeFilter).toBe('approved');
  });

  test('retorna assets do banco após carregar', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.assets).toEqual(mockAssets);
  });

  test('isLoading termina false após carregar', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAssetsList — changeFilter', () => {
  test('não recarrega ao tocar no filtro que já está ativo', async () => {
    const { result } = renderHook(() => useAssetsList('pending'));
    await act(async () => { await result.current.changeFilter('pending'); });
    expect(getAssets).not.toHaveBeenCalled();
  });

  test('filtro "all" chama getAssets sem argumento', async () => {
    const { result } = renderHook(() => useAssetsList('pending'));
    await act(async () => { await result.current.changeFilter('all'); });
    expect(getAssets).toHaveBeenCalledWith();
  });

  test('filtro "draft" chama getAssets com status draft', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('draft'); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'draft' });
  });

  test('filtro "pending" chama getAssets com status pending', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('pending'); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'pending' });
  });

  test('filtro "approved" chama getAssets com status approved', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('approved'); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'approved' });
  });

  test('filtro "rejected" chama getAssets com status rejected', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('rejected'); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'rejected' });
  });

  test('filtro "unsynced" chama getAssets com isSynced false', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('unsynced'); });
    expect(getAssets).toHaveBeenCalledWith({ isSynced: false });
  });

  test('atualiza activeFilter ao chamar changeFilter', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('pending'); });
    expect(result.current.activeFilter).toBe('pending');
  });
});

describe('useAssetsList — resiliência', () => {
  test('isLoading volta a false mesmo se o banco retornar erro', async () => {
    (getAssets as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useAssetsList());
    await act(async () => {
      try { await result.current.refresh(); } catch { /* ignorado */ }
    });
    expect(result.current.isLoading).toBe(false);
  });

  test('refresh usa o filtro ativo atual', async () => {
    const { result } = renderHook(() => useAssetsList());
    await act(async () => { await result.current.changeFilter('draft'); });
    jest.clearAllMocks();
    await act(async () => { await result.current.refresh(); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'draft' });
  });

  test('refresh usa o filtro inicial antes de qualquer troca manual', async () => {
    const { result } = renderHook(() => useAssetsList('approved'));
    await act(async () => { await result.current.refresh(); });
    expect(getAssets).toHaveBeenCalledWith({ status: 'approved' });
  });
});
