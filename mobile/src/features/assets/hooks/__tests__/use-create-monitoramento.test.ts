import { renderHook, act } from '@testing-library/react-native';
import { useCreateMonitoramento } from '../use-create-monitoramento';
import { insertMonitoramento, enqueueSyncItem } from '../../repository';
import { generateUUID } from '@/utils/uuid';

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

jest.mock('../../repository', () => ({
  insertMonitoramento: jest.fn().mockResolvedValue(undefined),
  enqueueSyncItem: jest.fn().mockResolvedValue(undefined),
}));

describe('useCreateMonitoramento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('deve criar monitoramento e enfileirar sync com sucesso', async () => {
    const { result } = renderHook(() => useCreateMonitoramento());

    await act(async () => {
      await result.current.save({
        assetId: 'asset-123',
        notes: 'Planta saudável e crescendo',
        healthStatus: 'healthy',
      });
    });

    expect(insertMonitoramento).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: 'asset-123',
        notes: 'Planta saudável e crescendo',
        healthStatus: 'healthy',
        createdBy: 'u-1',
        organizationId: 'org-1',
      })
    );

    expect(enqueueSyncItem).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        entityType: 'monitoramento',
      })
    );
  });

  test('deve falhar se as notas forem vazias', async () => {
    const { result } = renderHook(() => useCreateMonitoramento());

    await expect(
      result.current.save({
        assetId: 'asset-123',
        notes: '',
        healthStatus: 'healthy',
      })
    ).rejects.toThrow('As notas do monitoramento são obrigatórias.');
  });
});
