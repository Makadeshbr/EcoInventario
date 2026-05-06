import { api } from '@/api/client';
import { getDb } from '@/db/database';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { getSyncMetadata, setSyncMetadata } from './sync-metadata';

const DEFAULT_SYNC_SINCE = '2000-01-01T00:00:00Z';

type AssetTypeDTO = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type PullChangeDTO = {
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
  updated_at: string;
};

type PullResponseDTO = {
  changes: PullChangeDTO[];
  has_more: boolean;
  next_cursor: string | null;
  server_time: string;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

async function applyAssetChange(change: PullChangeDTO): Promise<void> {
  const db = getDb();

  if (change.action === 'delete') {
    await db.runAsync(
      `UPDATE assets SET deleted_at = ?, is_synced = 1 WHERE id = ? AND is_synced = 1`,
      [change.updated_at, change.entity_id],
    );
    return;
  }

  const data = change.data ?? {};
  const id = asString(data.id, change.entity_id);
  const createdBy = asString(data.created_by, useAuthStore.getState().user?.id ?? '');
  const createdAt = asString(data.created_at, change.updated_at);
  const updatedAt = asString(data.updated_at, change.updated_at);

  await db.runAsync(
    `INSERT INTO assets (
      id, organization_id, asset_type_id, asset_type_name,
      latitude, longitude, gps_accuracy_m, qr_code,
      status, version, parent_id, rejection_reason, notes,
      created_by, approved_by, created_at, updated_at, deleted_at, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)
    ON CONFLICT(id) DO UPDATE SET
      organization_id = excluded.organization_id,
      asset_type_id = excluded.asset_type_id,
      asset_type_name = excluded.asset_type_name,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      gps_accuracy_m = excluded.gps_accuracy_m,
      qr_code = excluded.qr_code,
      status = excluded.status,
      version = excluded.version,
      parent_id = excluded.parent_id,
      rejection_reason = excluded.rejection_reason,
      notes = excluded.notes,
      created_by = excluded.created_by,
      approved_by = excluded.approved_by,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = NULL,
      is_synced = 1
    WHERE assets.is_synced = 1 OR excluded.updated_at >= assets.updated_at`,
    [
      id,
      asString(data.organization_id, useAuthStore.getState().user?.organizationId ?? ''),
      asString(data.asset_type_id),
      asString(data.asset_type_name, 'Ativo sincronizado'),
      asNumber(data.latitude, -15.7801),
      asNumber(data.longitude, -47.9292),
      nullableNumber(data.gps_accuracy_m),
      asString(data.qr_code, id),
      asString(data.status, 'draft'),
      asNumber(data.version, 1),
      nullableString(data.parent_id),
      nullableString(data.rejection_reason),
      nullableString(data.notes),
      createdBy,
      nullableString(data.approved_by),
      createdAt,
      updatedAt,
    ],
  );
}

export async function pullAssetTypes(orgId: string): Promise<void> {
  const response = await api.get('asset-types').json<{ data: AssetTypeDTO[] }>();
  const db = getDb();

  for (const type of response.data) {
    await db.runAsync(
      `INSERT INTO asset_types (id, organization_id, name, description, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         is_active = excluded.is_active`,
      [type.id, orgId, type.name, type.description, type.is_active ? 1 : 0],
    );
  }
}

export async function pullChanges(): Promise<void> {
  const since = (await getSyncMetadata('last_sync_at')) ?? DEFAULT_SYNC_SINCE;
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ since, limit: '100' });
    if (cursor) params.set('cursor', cursor);
    const response = await api.get(`sync/pull?${params.toString()}`).json<PullResponseDTO>();

    for (const change of response.changes) {
      if (change.entity_type === 'asset') {
        await applyAssetChange(change);
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor;
    await setSyncMetadata('last_sync_at', response.server_time);
    useSyncStore.getState().setLastSyncAt(response.server_time);
  }
}
