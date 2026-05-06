jest.mock('@/db/database', () => ({
  getDb: jest.fn(),
}));

import { getDb } from '@/db/database';
import {
  getRecentAssets,
  getAssets,
  getAssetById,
  getAssetByQR,
  countAssetsByStatus,
  countUnsyncedAssets,
  insertAsset,
  updateAsset,
  getAssetTypes,
  upsertAssetType,
  insertMedia,
  getMediaForAsset,
  enqueueSyncItem,
  enqueueMediaUpload,
} from '../repository';

const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
};

function expectExplicitProjection(sql: string): void {
  expect(sql).not.toMatch(/\bSELECT\s+\*/i);
}

const assetRow = {
  id: 'a-1',
  organization_id: 'org-1',
  asset_type_id: 'at-1',
  asset_type_name: 'Árvore',
  latitude: -23.5,
  longitude: -46.6,
  gps_accuracy_m: 3,
  qr_code: 'qr-1',
  status: 'draft',
  version: 1,
  parent_id: null,
  rejection_reason: null,
  notes: 'nota',
  created_by: 'u-1',
  approved_by: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  is_synced: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  (getDb as jest.Mock).mockReturnValue(mockDb);
});

describe('getRecentAssets', () => {
  test('consulta com LIMIT e ORDER BY created_at DESC', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getRecentAssets(5);
    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('ORDER BY created_at DESC LIMIT');
    expect(params).toContain(5);
  });

  test('converte snake_case do banco para camelCase do domínio', async () => {
    mockDb.getAllAsync.mockResolvedValue([assetRow]);
    const [asset] = await getRecentAssets();
    expect(asset.id).toBe('a-1');
    expect(asset.organizationId).toBe('org-1');
    expect(asset.assetTypeName).toBe('Árvore');
    expect(asset.isSynced).toBe(false);
  });

  test('is_synced=1 mapeia para isSynced=true', async () => {
    mockDb.getAllAsync.mockResolvedValue([{ ...assetRow, is_synced: 1 }]);
    const [asset] = await getRecentAssets();
    expect(asset.isSynced).toBe(true);
  });
});

describe('getAssets', () => {
  test('sem filtro aplica apenas deleted_at IS NULL', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getAssets();
    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toHaveLength(0);
  });

  test('filtro por status adiciona status = ? ao WHERE', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getAssets({ status: 'draft' });
    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('status = ?');
    expect(params).toContain('draft');
  });

  test('filtro isSynced=false adiciona is_synced = 0 ao WHERE', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getAssets({ isSynced: false });
    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('is_synced = ?');
    expect(params).toContain(0);
  });

  test('filtro isSynced=true usa valor 1', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getAssets({ isSynced: true });
    const [, params] = mockDb.getAllAsync.mock.calls[0];
    expect(params).toContain(1);
  });
});

describe('getAssetById', () => {
  test('retorna null quando asset não existe', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const result = await getAssetById('inexistente');
    expect(result).toBeNull();
  });

  test('retorna asset mapeado quando encontrado', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ ...assetRow, is_synced: 1 });
    const asset = await getAssetById('a-1');
    expect(asset?.id).toBe('a-1');
    expect(asset?.isSynced).toBe(true);
  });

  test('filtra por deleted_at IS NULL', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    await getAssetById('a-1');
    const [sql] = mockDb.getFirstAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('deleted_at IS NULL');
  });
});

describe('getAssetByQR', () => {
  test('usa projecao explicita e filtra por qr_code', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    await getAssetByQR('qr-1');
    const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('qr_code = ?');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toContain('qr-1');
  });
});

describe('countAssetsByStatus', () => {
  test('inicializa todos os status com 0', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const counts = await countAssetsByStatus();
    expect(counts).toEqual({ draft: 0, pending: 0, approved: 0, rejected: 0 });
  });

  test('agrega contagens por status do banco', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { status: 'draft', count: 3 },
      { status: 'pending', count: 1 },
      { status: 'approved', count: 7 },
    ]);
    const counts = await countAssetsByStatus();
    expect(counts.draft).toBe(3);
    expect(counts.pending).toBe(1);
    expect(counts.approved).toBe(7);
    expect(counts.rejected).toBe(0);
  });
});

describe('countUnsyncedAssets', () => {
  test('retorna contagem de assets com is_synced=0', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 7 });
    const count = await countUnsyncedAssets();
    expect(count).toBe(7);
  });

  test('retorna 0 quando getFirstAsync retorna null', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    const count = await countUnsyncedAssets();
    expect(count).toBe(0);
  });
});

describe('insertAsset', () => {
  test('insere com status draft e is_synced=0 fixos', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await insertAsset({
      id: 'a-1', organizationId: 'org-1', assetTypeId: 'at-1',
      assetTypeName: 'Árvore', latitude: -23.5, longitude: -46.6,
      gpsAccuracyM: 5, qrCode: 'qr-1', notes: null,
      createdBy: 'u-1', createdAt: '2024-01-01T00:00:00Z',
    });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain("'draft'");
    expect(sql).toContain('is_synced');
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });
});

describe('updateAsset', () => {
  test('sempre inclui updated_at e reseta is_synced=0', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
    await updateAsset('a-1', { status: 'pending', updatedAt: '2024-01-02T00:00:00Z' });
    const [sql, values] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('updated_at = ?');
    expect(sql).toContain('is_synced = 0');
    expect(sql).toContain('status = ?');
    expect(values).toContain('pending');
    expect(values).toContain('a-1');
  });

  test('inclui apenas os campos passados além de updated_at', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });
    await updateAsset('a-1', { notes: 'nova nota', updatedAt: '2024-01-02T00:00:00Z' });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('notes = ?');
    expect(sql).not.toContain('status = ?');
  });
});

describe('getAssetTypes', () => {
  test('filtra apenas tipos ativos ordenados por nome', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getAssetTypes();
    const [sql] = mockDb.getAllAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('is_active = 1');
    expect(sql).toContain('ORDER BY name ASC');
  });
});

describe('enqueueSyncItem', () => {
  test('insere com status pending e usa INSERT OR IGNORE', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await enqueueSyncItem({
      id: 'sq-1', idempotencyKey: 'key-1', action: 'CREATE',
      entityType: 'asset', entityId: 'a-1',
      payload: '{}', createdAt: '2024-01-01T00:00:00Z',
    });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT OR IGNORE INTO sync_queue');
    expect(sql).toContain("'pending'");
  });
});

describe('enqueueMediaUpload', () => {
  test('insere com status pending e usa INSERT OR IGNORE', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await enqueueMediaUpload({
      id: 'mu-1', idempotencyKey: 'key-2', mediaId: 'm-1',
      localFilePath: '/tmp/photo.jpg', assetId: 'a-1',
      mediaType: 'general', mimeType: 'image/jpeg',
      sizeBytes: 204800, createdAt: '2024-01-01T00:00:00Z',
    });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT OR IGNORE INTO media_upload_queue');
    expect(sql).toContain("'pending'");
  });
});

describe('insertMedia', () => {
  test('insere com upload_status pending', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await insertMedia({
      id: 'm-1', organizationId: 'org-1', assetId: 'a-1',
      localFilePath: '/tmp/photo.jpg', mimeType: 'image/jpeg',
      sizeBytes: 204800, type: 'general',
      createdBy: 'u-1', createdAt: '2024-01-01T00:00:00Z',
    });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain("'pending'");
    expect(sql).toContain('media');
  });
});

describe('getMediaForAsset', () => {
  const mediaRow = {
    id: 'm-1',
    organization_id: 'org-1',
    asset_id: 'a-1',
    local_file_path: 'file:///photo.jpg',
    storage_key: null,
    mime_type: 'image/jpeg',
    size_bytes: 204800,
    type: 'general',
    upload_status: 'pending',
    created_by: 'u-1',
    created_at: '2024-01-01T00:00:00Z',
  };

  test('filtra por asset_id e deleted_at IS NULL', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getMediaForAsset('a-1');
    const [sql, params] = mockDb.getAllAsync.mock.calls[0];
    expectExplicitProjection(sql);
    expect(sql).toContain('asset_id = ?');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toContain('a-1');
  });

  test('ordena por created_at ASC', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await getMediaForAsset('a-1');
    const [sql] = mockDb.getAllAsync.mock.calls[0];
    expect(sql).toContain('ORDER BY created_at ASC');
  });

  test('converte snake_case do banco para camelCase do domínio', async () => {
    mockDb.getAllAsync.mockResolvedValue([mediaRow]);
    const [media] = await getMediaForAsset('a-1');
    expect(media.id).toBe('m-1');
    expect(media.assetId).toBe('a-1');
    expect(media.localFilePath).toBe('file:///photo.jpg');
    expect(media.mimeType).toBe('image/jpeg');
    expect(media.uploadStatus).toBe('pending');
  });

  test('retorna array vazio quando não há media', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const result = await getMediaForAsset('a-sem-fotos');
    expect(result).toEqual([]);
  });
});

describe('upsertAssetType', () => {
  test('usa INSERT OR CONFLICT para permitir atualização', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await upsertAssetType({
      id: 'at-1', organizationId: 'org-1', name: 'Árvore',
      description: null, isActive: true,
    });
    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO asset_types');
    expect(sql).toContain('ON CONFLICT');
  });

  test('armazena isActive como inteiro 1 quando true', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await upsertAssetType({
      id: 'at-1', organizationId: 'org-1', name: 'Árvore',
      description: null, isActive: true,
    });
    const [, params] = mockDb.runAsync.mock.calls[0];
    expect(params).toContain(1);
  });

  test('armazena isActive como inteiro 0 quando false', async () => {
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    await upsertAssetType({
      id: 'at-1', organizationId: 'org-1', name: 'Árvore',
      description: null, isActive: false,
    });
    const [, params] = mockDb.runAsync.mock.calls[0];
    expect(params).toContain(0);
  });
});
