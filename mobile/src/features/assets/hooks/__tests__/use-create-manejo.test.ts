import { renderHook, act } from '@testing-library/react-native';
import { useCreateManejo } from '../use-create-manejo';
import { insertManejo, insertMedia, enqueueSyncItem, enqueueMediaUpload } from '../../repository';
import { generateUUID } from '@/utils/uuid';
import { compressImage } from '@/utils/image-compression';

jest.mock('@/db/database', () => ({ getDb: jest.fn() }));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn((selector: (s: any) => any) =>
    selector({
      user: {
        id: 'u-1',
        organizationId: 'org-1',
        name: 'Tech Dev',
        email: 'tech@eco.com',
        role: 'tech',
      },
    }),
  ),
}));

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('@/utils/image-compression', () => ({
  compressImage: jest.fn().mockResolvedValue({ uri: 'file:///compressed.jpg' }),
}));

jest.mock('../../repository', () => ({
  insertManejo: jest.fn().mockResolvedValue(undefined),
  enqueueSyncItem: jest.fn().mockResolvedValue(undefined),
  insertMedia: jest.fn().mockResolvedValue(undefined),
  enqueueMediaUpload: jest.fn().mockResolvedValue(undefined),
}));

global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve({ size: 102400 }),
}) as jest.Mock;

describe('useCreateManejo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve criar manejo e enfileirar sync e mídia com sucesso', async () => {
    const { result } = renderHook(() => useCreateManejo());

    await act(async () => {
      await result.current.save({
        assetId: 'asset-123',
        description: 'Poda de formação',
        beforePhotoUri: 'file:///before.jpg',
        afterPhotoUri: 'file:///after.jpg',
      });
    });

    expect(insertManejo).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-123',
        description: 'Poda de formação',
        createdBy: 'u-1',
        organizationId: 'org-1',
      })
    );

    expect(compressImage).toHaveBeenCalledTimes(2);
    expect(insertMedia).toHaveBeenCalledTimes(2);
    expect(enqueueMediaUpload).toHaveBeenCalledTimes(2);

    expect(enqueueSyncItem).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityType: 'manejo',
      })
    );
  });

  test('deve falhar se a descrição for vazia', async () => {
    const { result } = renderHook(() => useCreateManejo());

    await expect(
      result.current.save({
        assetId: 'asset-123',
        description: '',
      })
    ).rejects.toThrow('A descrição do manejo é obrigatória.');
  });
});
