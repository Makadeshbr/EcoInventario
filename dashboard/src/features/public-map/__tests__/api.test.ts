import { describe, expect, test, vi } from 'vitest';

import { getPublicAsset, listPublicAssets, listPublicAssetTypes } from '../api';

describe('public map api', () => {
  test('lista assets publicos por bounds com cache de cinco minutos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'asset-1',
            asset_type: { id: 'type-1', name: 'Arvore' },
            latitude: -23.5,
            longitude: -46.6,
            qr_code: 'qr-1',
            thumbnail_url: null,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const assets = await listPublicAssets({
      bounds: '-24,-47,-23,-46',
      typeId: 'type-1',
      limit: 150,
    });

    expect(assets[0]?.assetType.name).toBe('Arvore');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/public/assets?bounds=-24%2C-47%2C-23%2C-46&type_id=type-1&limit=150',
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 300 },
      },
    );
  });

  test('normaliza detalhes publicos sem campos sensiveis', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'asset-1',
        asset_type: { id: 'type-1', name: 'Arvore' },
        latitude: -23.5,
        longitude: -46.6,
        qr_code: 'qr-1',
        organization_name: 'Secretaria Verde',
        media: [{ id: 'media-1', type: 'general', url: 'https://example.com/photo.jpg' }],
        manejos: [],
        monitoramentos: [{ id: 'mon-1', notes: 'Saudavel', health_status: 'healthy', created_at: '2026-05-04T10:00:00Z' }],
        created_at: '2026-05-04T10:00:00Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const asset = await getPublicAsset('asset-1');

    expect(asset).toMatchObject({
      id: 'asset-1',
      organizationName: 'Secretaria Verde',
      monitoramentos: [{ id: 'mon-1', notes: 'Saudavel', healthStatus: 'healthy' }],
    });
    expect(asset).not.toHaveProperty('createdBy');
    expect(asset).not.toHaveProperty('status');
  });

  test('lista tipos publicos sem token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'type-1', name: 'Arvore' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await listPublicAssetTypes();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/api/v1/public/asset-types', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
  });
});
