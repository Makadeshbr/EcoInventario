jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

const mockAsset = {
  id: 'asset-1',
  organizationId: 'org-1',
  assetTypeId: 'at-old',
  assetTypeName: 'Árvore',
  latitude: -15.78,
  longitude: -47.93,
  gpsAccuracyM: 3,
  qrCode: 'qr',
  status: 'draft',
  version: 1,
  parentId: null,
  rejectionReason: null,
  notes: 'nota antiga',
  createdBy: 'u-1',
  approvedBy: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
  isSynced: false,
};

jest.mock('../../repository', () => ({
  updateAsset: jest.fn().mockResolvedValue(undefined),
  getAssetById: jest.fn().mockResolvedValue(mockAsset),
  enqueueSyncItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useUpdateAsset } from '../use-update-asset';
import { updateAsset, enqueueSyncItem, getAssetById } from '../../repository';

beforeEach(() => {
  jest.clearAllMocks();
  // mockAsset pode ser undefined no factory por causa de hoisting — inicializa aqui
  (getAssetById as jest.Mock).mockResolvedValue(mockAsset);
});

describe('useUpdateAsset', () => {
  test('chama updateAsset com os campos fornecidos', async () => {
    const { result } = renderHook(() => useUpdateAsset());
    await act(async () => {
      await result.current.update('asset-1', { notes: 'nova nota' });
    });
    expect(updateAsset).toHaveBeenCalledWith(
      'asset-1',
      expect.objectContaining({ notes: 'nova nota' }),
    );
  });

  test('busca o asset após atualizar para montar o payload de sync', async () => {
    const { result } = renderHook(() => useUpdateAsset());
    await act(async () => {
      await result.current.update('asset-1', { notes: 'nova nota' });
    });
    expect(getAssetById).toHaveBeenCalledWith('asset-1');
  });

  test('enfileira UPDATE no sync_queue com dados atualizados', async () => {
    const { result } = renderHook(() => useUpdateAsset());
    await act(async () => {
      await result.current.update('asset-1', {
        assetTypeId: 'at-novo',
        assetTypeName: 'Arbusto',
      });
    });
    expect(enqueueSyncItem).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        entityType: 'asset',
        entityId: 'asset-1',
      }),
    );
    const payload = JSON.parse(
      (enqueueSyncItem as jest.Mock).mock.calls[0][0].payload,
    );
    expect(payload.asset_type_id).toBe('at-novo');
  });

  test('lança erro se asset não for encontrado após atualizar', async () => {
    const { getAssetById: mockGet } = require('../../repository');
    (mockGet as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useUpdateAsset());
    await expect(
      act(async () => {
        await result.current.update('asset-inexistente', { notes: 'x' });
      }),
    ).rejects.toThrow('não encontrado');
  });

  test('isSaving é false após completar', async () => {
    const { result } = renderHook(() => useUpdateAsset());
    await act(async () => { await result.current.update('asset-1', {}); });
    expect(result.current.isSaving).toBe(false);
  });
});
