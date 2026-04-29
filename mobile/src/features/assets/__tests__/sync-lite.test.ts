const mockRunAsync = jest.fn().mockResolvedValue(undefined);
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock('@/db/database', () => ({
  getDb: () => ({ runAsync: mockRunAsync, getAllAsync: mockGetAllAsync, getFirstAsync: mockGetFirstAsync }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

jest.mock('@/api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      user: { id: 'user-1', organizationId: 'org-1' },
      accessToken: 'token',
    }),
  },
}));

import { api } from '@/api/client';
import { syncPullLite } from '../sync-lite';

function jsonResponse<T>(data: T) {
  return { json: jest.fn().mockResolvedValue(data) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetFirstAsync.mockResolvedValue(null);
  mockGetAllAsync.mockResolvedValue([]);
  (api.get as jest.Mock).mockImplementation((url: string) => {
    if (url === 'asset-types') return jsonResponse({ data: [] });
    return jsonResponse({
      changes: [],
      has_more: false,
      next_cursor: null,
      server_time: '2026-04-29T10:00:00Z',
    });
  });
  (api.post as jest.Mock).mockImplementation(() =>
    jsonResponse({ results: [], server_time: '2026-04-29T10:00:00Z' }),
  );
});

describe('syncPullLite', () => {
  test('importa assets do pull usando o contrato snake_case da API', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url === 'asset-types') return jsonResponse({ data: [] });
      return jsonResponse({
        changes: [
          {
            entity_type: 'asset',
            entity_id: 'asset-1',
            action: 'create',
            updated_at: '2026-04-29T10:00:00Z',
            data: {
              id: 'asset-1',
              organization_id: 'org-1',
              asset_type_id: 'type-1',
              asset_type_name: 'Árvore nativa',
              latitude: -15.78,
              longitude: -47.93,
              gps_accuracy_m: 5,
              qr_code: 'qr-1',
              status: 'approved',
              version: 1,
              parent_id: null,
              rejection_reason: null,
              notes: 'seed aprovado',
              created_by: 'user-1',
              approved_by: 'admin-1',
              created_at: '2026-04-29T09:00:00Z',
              updated_at: '2026-04-29T10:00:00Z',
            },
          },
        ],
        has_more: false,
        next_cursor: null,
        server_time: '2026-04-29T10:00:00Z',
      });
    });

    await syncPullLite({ force: true });

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO assets'),
      expect.arrayContaining(['asset-1', 'org-1', 'type-1', 'Árvore nativa', -15.78, -47.93]),
    );
  });

  test('envia operações pendentes para sync/push antes do pull', async () => {
    mockGetAllAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM sync_queue')) {
        return Promise.resolve([
          {
            id: 'queue-1',
            idempotency_key: 'idem-1',
            action: 'CREATE',
            entity_type: 'asset',
            entity_id: 'asset-1',
            payload: JSON.stringify({ id: 'asset-1', asset_type_id: 'type-1' }),
            retry_count: 0,
            max_retries: 5,
          },
        ]);
      }
      return Promise.resolve([]);
    });
    (api.post as jest.Mock).mockImplementation((url: string) => {
      if (url === 'sync/push') {
        return jsonResponse({
          results: [
            {
              idempotency_key: 'idem-1',
              status: 'ok',
              entity_id: 'asset-1',
              server_updated_at: '2026-04-29T10:00:00Z',
            },
          ],
          server_time: '2026-04-29T10:00:00Z',
        });
      }
      return jsonResponse({});
    });

    await syncPullLite({ force: true });

    expect(api.post).toHaveBeenCalledWith(
      'sync/push',
      expect.objectContaining({
        json: expect.objectContaining({
          operations: [
            expect.objectContaining({
              idempotency_key: 'idem-1',
              entity_type: 'asset',
              entity_id: 'asset-1',
            }),
          ],
        }),
      }),
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE assets SET is_synced = 1'),
      ['2026-04-29T10:00:00Z', 'asset-1'],
    );
  });
});
