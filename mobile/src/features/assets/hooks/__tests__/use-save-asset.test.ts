jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

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
  insertAsset: jest.fn().mockResolvedValue(undefined),
  enqueueSyncItem: jest.fn().mockResolvedValue(undefined),
  insertMedia: jest.fn().mockResolvedValue(undefined),
  enqueueMediaUpload: jest.fn().mockResolvedValue(undefined),
}));

// Simula fetch global para leitura de blob de imagem local
global.fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve({ size: 204800 }),
}) as jest.Mock;

import { renderHook, act } from '@testing-library/react-native';
import { useSaveAsset } from '../use-save-asset';
import {
  insertAsset,
  enqueueSyncItem,
  insertMedia,
  enqueueMediaUpload,
} from '../../repository';
import { generateUUID } from '@/utils/uuid';
import { compressImage } from '@/utils/image-compression';

const validParams = {
  assetTypeId: '550e8400-e29b-41d4-a716-446655440000',
  assetTypeName: 'Árvore Nativa',
  latitude: -15.78,
  longitude: -47.93,
  gpsAccuracyM: 3,
  notes: 'nota de teste',
  photoUris: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  // mockReset limpa a fila de mockReturnValueOnce acumulada entre testes
  (generateUUID as jest.Mock)
    .mockReset()
    .mockReturnValue('mock-uuid')
    .mockReturnValueOnce('asset-id')
    .mockReturnValueOnce('qr-id');
});

describe('useSaveAsset — validação', () => {
  test('rejeita assetTypeId inválido (não UUID)', async () => {
    const { result } = renderHook(() => useSaveAsset());
    await expect(
      result.current.save({ ...validParams, assetTypeId: 'invalido' }),
    ).rejects.toThrow();
  });

  test('rejeita latitude fora do range', async () => {
    const { result } = renderHook(() => useSaveAsset());
    await expect(
      result.current.save({ ...validParams, latitude: 91 }),
    ).rejects.toThrow();
  });

  test('lança erro quando usuário não está autenticado', async () => {
    const { useAuthStore } = require('@/stores/auth-store');
    (useAuthStore as jest.Mock).mockImplementationOnce((sel: any) => sel({ user: null }));
    const { result } = renderHook(() => useSaveAsset());
    await expect(result.current.save(validParams)).rejects.toThrow('Usuário não autenticado');
  });
});

describe('useSaveAsset — fluxo de salvamento', () => {
  test('chama insertAsset com os dados corretos', async () => {
    const { result } = renderHook(() => useSaveAsset());
    await act(async () => { await result.current.save(validParams); });
    expect(insertAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'asset-id',
        organizationId: 'org-1',
        assetTypeId: validParams.assetTypeId,
        latitude: validParams.latitude,
        longitude: validParams.longitude,
        notes: validParams.notes,
        createdBy: 'u-1',
      }),
    );
  });

  test('enfileira item no sync_queue com action CREATE', async () => {
    const { result } = renderHook(() => useSaveAsset());
    await act(async () => { await result.current.save(validParams); });
    expect(enqueueSyncItem).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityType: 'asset',
        entityId: 'asset-id',
        idempotencyKey: 'create-asset-asset-id',
      }),
    );
    const call = (enqueueSyncItem as jest.Mock).mock.calls[0][0];
    const payload = JSON.parse(call.payload);
    expect(payload.status).toBe('draft');
    expect(payload.organization_id).toBe('org-1');
  });

  test('retorna o assetId gerado', async () => {
    const { result } = renderHook(() => useSaveAsset());
    let id: string;
    await act(async () => { id = await result.current.save(validParams); });
    expect(id!).toBe('asset-id');
  });

  test('isSaving é true durante o save e false após', async () => {
    let resolveSave!: () => void;
    (insertAsset as jest.Mock).mockImplementationOnce(
      () => new Promise((res) => { resolveSave = res; }),
    );
    const { result } = renderHook(() => useSaveAsset());
    act(() => { result.current.save(validParams); });
    expect(result.current.isSaving).toBe(true);
    await act(async () => { resolveSave(); });
    expect(result.current.isSaving).toBe(false);
  });
});

describe('useSaveAsset — processamento de fotos', () => {
  test('comprime cada foto e enfileira media + upload', async () => {
    (generateUUID as jest.Mock)
      .mockReturnValueOnce('asset-id')
      .mockReturnValueOnce('qr-id')
      .mockReturnValueOnce('sq-id')
      .mockReturnValueOnce('media-id')
      .mockReturnValueOnce('mu-id');

    const { result } = renderHook(() => useSaveAsset());
    await act(async () => {
      await result.current.save({ ...validParams, photoUris: ['file:///photo1.jpg'] });
    });

    expect(compressImage).toHaveBeenCalledWith('file:///photo1.jpg');
    expect(insertMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-id',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
        type: 'general',
      }),
    );
    expect(enqueueMediaUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-id',
        mimeType: 'image/jpeg',
        sizeBytes: 204800,
      }),
    );
  });

  test('sem fotos não chama insertMedia nem enqueueMediaUpload', async () => {
    const { result } = renderHook(() => useSaveAsset());
    await act(async () => { await result.current.save({ ...validParams, photoUris: [] }); });
    expect(insertMedia).not.toHaveBeenCalled();
    expect(enqueueMediaUpload).not.toHaveBeenCalled();
  });
});
