jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

jest.mock('../../repository', () => ({
  updateAsset: jest.fn().mockResolvedValue(undefined),
  enqueueSyncItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSubmitAsset } from '../use-submit-asset';
import { updateAsset, enqueueSyncItem } from '../../repository';

beforeEach(() => jest.clearAllMocks());

describe('useSubmitAsset', () => {
  test('chama updateAsset com status pending', async () => {
    const { result } = renderHook(() => useSubmitAsset());
    await act(async () => { await result.current.submit('asset-1', 2, '2026-04-29T10:00:00Z'); });
    expect(updateAsset).toHaveBeenCalledWith(
      'asset-1',
      expect.objectContaining({ status: 'pending' }),
    );
  });

  test('enfileira UPDATE no sync_queue', async () => {
    const { result } = renderHook(() => useSubmitAsset());
    await act(async () => { await result.current.submit('asset-1', 2, '2026-04-29T10:00:00Z'); });
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
    expect(payload.status).toBe('pending');
    expect(payload.version).toBe(2);
    expect(payload.client_updated_at).toBe('2026-04-29T10:00:00Z');
  });

  test('isSubmitting é false após completar', async () => {
    const { result } = renderHook(() => useSubmitAsset());
    await act(async () => { await result.current.submit('asset-1', 1, '2026-04-29T10:00:00Z'); });
    expect(result.current.isSubmitting).toBe(false);
  });

  test('propaga erro quando updateAsset falha', async () => {
    (updateAsset as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    const { result } = renderHook(() => useSubmitAsset());
    await expect(
      act(async () => { await result.current.submit('asset-1', 1, '2026-04-29T10:00:00Z'); }),
    ).rejects.toThrow('DB error');
    expect(result.current.isSubmitting).toBe(false);
  });
});
