// useFocusEffect como no-op: evita loop infinito de re-renders no React 19
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

const mockAsset = {
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
};

const mockMedia = [
  {
    id: 'm-1',
    organizationId: 'org-1',
    assetId: 'a-1',
    localFilePath: 'file:///compressed.jpg',
    storageKey: null,
    mimeType: 'image/jpeg',
    sizeBytes: 204800,
    type: 'general',
    uploadStatus: 'pending',
    createdBy: 'u-1',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

jest.mock('../../repository', () => ({
  getAssetById: jest.fn().mockResolvedValue(mockAsset),
  getMediaForAsset: jest.fn().mockResolvedValue(mockMedia),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAssetDetail } from '../use-asset-detail';
import { getAssetById, getMediaForAsset } from '../../repository';

beforeEach(() => {
  jest.clearAllMocks();
  (getAssetById as jest.Mock).mockResolvedValue(mockAsset);
  (getMediaForAsset as jest.Mock).mockResolvedValue(mockMedia);
});

describe('useAssetDetail — carregamento', () => {
  test('chama getAssetById com o id fornecido', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    expect(getAssetById).toHaveBeenCalledWith('a-1');
  });

  test('chama getMediaForAsset com o id fornecido', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    expect(getMediaForAsset).toHaveBeenCalledWith('a-1');
  });

  test('retorna o asset do banco', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.asset).toEqual(mockAsset);
  });

  test('retorna a lista de media do banco', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.media).toEqual(mockMedia);
  });

  test('isLoading termina como false após carregar', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAssetDetail — asset inexistente', () => {
  test('retorna null quando asset não existe', async () => {
    (getAssetById as jest.Mock).mockResolvedValueOnce(null);
    (getMediaForAsset as jest.Mock).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAssetDetail('inexistente'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.asset).toBeNull();
  });

  test('retorna array vazio de media quando asset não existe', async () => {
    (getAssetById as jest.Mock).mockResolvedValueOnce(null);
    (getMediaForAsset as jest.Mock).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useAssetDetail('inexistente'));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.media).toEqual([]);
  });
});

describe('useAssetDetail — resiliência', () => {
  test('isLoading volta a false mesmo se o banco retornar erro', async () => {
    (getAssetById as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => {
      try { await result.current.refresh(); } catch { /* ignorado */ }
    });
    expect(result.current.isLoading).toBe(false);
  });

  test('refresh chama getAssetById e getMediaForAsset novamente', async () => {
    const { result } = renderHook(() => useAssetDetail('a-1'));
    await act(async () => { await result.current.refresh(); });
    await act(async () => { await result.current.refresh(); });
    expect(getAssetById).toHaveBeenCalledTimes(2);
    expect(getMediaForAsset).toHaveBeenCalledTimes(2);
  });
});
