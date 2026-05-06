import {
  publicAssetDetailsSchema,
  publicAssetsSchema,
  publicAssetTypesSchema,
} from './schemas';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';
const PUBLIC_REVALIDATE_SECONDS = 300;

export type PublicAssetFilters = {
  bounds: string;
  typeId?: string;
  limit?: number;
};

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    process.env.API_BASE_URL ??
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, '');
}

function publicUrl(path: string) {
  return `${apiBaseUrl()}/${path.replace(/^\//, '')}`;
}

async function publicFetch<T>(path: string) {
  const response = await fetch(publicUrl(path), {
    headers: { Accept: 'application/json' },
    next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error('Falha ao carregar dados publicos');
  }

  return (await response.json()) as T;
}

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

export async function listPublicAssetTypes() {
  const payload = await publicFetch<unknown>('/public/asset-types');
  return publicAssetTypesSchema.parse(payload).data;
}

export async function listPublicAssets(filters: PublicAssetFilters) {
  const payload = await publicFetch<unknown>(
    `/public/assets${toQuery({
      bounds: filters.bounds,
      type_id: filters.typeId,
      limit: filters.limit ?? 100,
    })}`,
  );
  return publicAssetsSchema.parse(payload).data;
}

export async function getPublicAsset(id: string) {
  const payload = await publicFetch<unknown>(`/public/assets/${id}`);
  return publicAssetDetailsSchema.parse(payload);
}
