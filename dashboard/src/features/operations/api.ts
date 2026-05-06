import { apiFetch } from '@/lib/api/client';

import {
  paginatedManejosSchema,
  paginatedMonitoramentosSchema,
  type Manejo,
  type Monitoramento,
} from './schemas';

type ListFilters = {
  status?: string;
  assetId?: string;
  createdBy?: string;
  date?: string;
  healthStatus?: string;
  cursor?: string;
  limit?: number;
};

function toQuery(filters: ListFilters) {
  const search = new URLSearchParams();
  if (filters.status) search.set('status', filters.status);
  if (filters.assetId) search.set('asset_id', filters.assetId);
  if (filters.createdBy) search.set('created_by', filters.createdBy);
  if (filters.date) search.set('date', filters.date);
  if (filters.healthStatus) search.set('health_status', filters.healthStatus);
  if (filters.cursor) search.set('cursor', filters.cursor);
  search.set('limit', String(filters.limit ?? 50));
  return `?${search.toString()}`;
}

export async function listManejos(token: string, filters: ListFilters = {}) {
  const payload = await apiFetch<unknown>(`/manejos${toQuery(filters)}`, { token });
  return paginatedManejosSchema.parse(payload);
}

export async function listMonitoramentos(token: string, filters: ListFilters = {}) {
  const payload = await apiFetch<unknown>(`/monitoramentos${toQuery(filters)}`, { token });
  return paginatedMonitoramentosSchema.parse(payload);
}

export async function listManejosForAsset(token: string, assetId: string): Promise<Manejo[]> {
  const payload = await apiFetch<unknown>(`/assets/${assetId}/manejos?limit=50`, { token });
  return paginatedManejosSchema.parse(payload).data;
}

export async function listMonitoramentosForAsset(
  token: string,
  assetId: string,
): Promise<Monitoramento[]> {
  const payload = await apiFetch<unknown>(`/assets/${assetId}/monitoramentos?limit=50`, { token });
  return paginatedMonitoramentosSchema.parse(payload).data;
}
