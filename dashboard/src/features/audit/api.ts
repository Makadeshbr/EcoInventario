import { apiFetch } from '@/lib/api/client';

import { paginatedAuditLogsSchema } from './schemas';

export type AuditLogFilters = {
  entityType?: string;
  entityId?: string;
  performedBy?: string;
  action?: string;
  from?: string;
  to?: string;
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

export async function listAuditLogs(token: string, filters: AuditLogFilters = {}) {
  const payload = await apiFetch<unknown>(
    `/audit-logs${toQuery({
      entity_type: filters.entityType,
      entity_id: filters.entityId,
      performed_by: filters.performedBy,
      action: filters.action,
      from: filters.from,
      to: filters.to,
      cursor: filters.cursor,
      limit: filters.limit ?? 50,
    })}`,
    { token },
  );
  return paginatedAuditLogsSchema.parse(payload);
}

export async function listAuditLogsForEntity(token: string, entityType: string, entityId: string) {
  const params = new URLSearchParams({
    entity_type: entityType,
    entity_id: entityId,
    limit: '30',
  });
  const payload = await apiFetch<unknown>(`/audit-logs?${params.toString()}`, { token });
  return paginatedAuditLogsSchema.parse(payload).data;
}
