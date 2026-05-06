import { describe, expect, test } from 'vitest';

import { assetSchema, paginatedAssetsSchema } from '../schemas';

describe('asset schemas', () => {
  test('normaliza asset do contrato da API', () => {
    const asset = assetSchema.parse({
      id: 'asset-1',
      asset_type: { id: 'type-1', name: 'Arvore' },
      latitude: -23.5,
      longitude: -46.6,
      gps_accuracy_m: 4,
      qr_code: 'QR-1',
      status: 'pending',
      version: 1,
      notes: 'Ipê',
      created_by: { id: 'user-1', name: 'Tecnico' },
      created_at: '2026-05-03T10:00:00Z',
      updated_at: '2026-05-03T10:00:00Z',
    });

    expect(asset.assetType.name).toBe('Arvore');
    expect(asset.createdBy.name).toBe('Tecnico');
    expect(asset.status).toBe('pending');
  });

  test('aceita paginação cursor-based', () => {
    const result = paginatedAssetsSchema.parse({
      data: [],
      pagination: { next_cursor: null, has_more: false },
    });

    expect(result.pagination.has_more).toBe(false);
  });
});
