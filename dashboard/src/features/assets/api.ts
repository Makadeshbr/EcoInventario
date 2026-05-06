import { apiFetch } from '@/lib/api/client';

import {
  assetHistorySchema,
  assetMediaListSchema,
  assetSchema,
  assetTypesSchema,
  mediaSchema,
  paginatedAssetsSchema,
  type Asset,
  type AssetMedia,
} from './schemas';

export type AssetListFilters = {
  status?: string;
  typeId?: string;
  createdBy?: string;
  qrCode?: string;
  cursor?: string;
  limit?: number;
};

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listAssets(token: string, filters: AssetListFilters = {}) {
  const payload = await apiFetch<unknown>(
    `/assets${toQuery({
      status: filters.status,
      type_id: filters.typeId,
      created_by: filters.createdBy,
      qr_code: filters.qrCode,
      cursor: filters.cursor,
      limit: filters.limit ?? 50,
    })}`,
    { token },
  );
  return paginatedAssetsSchema.parse(payload);
}

export async function getAsset(token: string, id: string): Promise<Asset> {
  const payload = await apiFetch<unknown>(`/assets/${id}`, { token });
  return assetSchema.parse(payload);
}

export async function getAssetHistory(token: string, id: string) {
  const payload = await apiFetch<unknown>(`/assets/${id}/history`, { token });
  return assetHistorySchema.parse(payload).data;
}

export async function listAssetTypes(token: string) {
  const payload = await apiFetch<unknown>('/asset-types', { token });
  return assetTypesSchema.parse(payload).data;
}

export async function listAssetMedia(token: string, mediaIds: string[]): Promise<AssetMedia[]> {
  const unique = Array.from(new Set(mediaIds.filter(Boolean)));
  const results = await Promise.allSettled(
    unique.map(async (id) =>
      mediaSchema.parse(
        await apiFetch<unknown>(`/media/${id}`, {
          token,
          signal:
            typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
              ? AbortSignal.timeout(4000)
              : undefined,
        }),
      ),
    ),
  );
  return results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
}

export async function listMediaForAsset(token: string, assetId: string): Promise<AssetMedia[]> {
  const payload = await apiFetch<unknown>(`/assets/${assetId}/media`, { token });
  return assetMediaListSchema.parse(payload).data;
}
