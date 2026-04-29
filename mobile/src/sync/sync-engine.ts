import NetInfo from '@react-native-community/netinfo';
import { api } from '@/api/client';
import { getDb } from '@/db/database';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { generateUUID } from '@/utils/uuid';
import { MAX_SYNC_BATCH_SIZE } from '@/constants/config';
import type { SyncAction } from '@/types/sync';

const SYNC_COOLDOWN_MS = 15_000;
const MEDIA_UPLOAD_BATCH_SIZE = 3;
const DEFAULT_SYNC_SINCE = '2000-01-01T00:00:00Z';

let inFlight: Promise<void> | null = null;
let lastSyncAttemptAt = 0;

type QueueRow = {
  id: string;
  idempotency_key: string;
  action: SyncAction;
  entity_type: string;
  entity_id: string;
  payload: string;
  retry_count: number;
  max_retries: number;
};

type MediaQueueRow = {
  id: string;
  idempotency_key: string;
  media_id: string;
  local_file_path: string;
  asset_id: string;
  media_type: string;
  mime_type: string;
  size_bytes: number;
  retry_count: number;
  max_retries: number;
};

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

type PushResultDTO = {
  idempotency_key: string;
  status: 'ok' | 'conflict' | 'error' | 'duplicate';
  entity_id?: string;
  server_updated_at?: string;
  server_version?: { updated_at: string; data?: Record<string, unknown> };
  error?: string;
};

type PushResponseDTO = {
  results: PushResultDTO[];
  server_time: string;
};

type UploadURLResponseDTO = {
  media_id: string;
  upload_url: string;
};

function isOnlineState(state: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function safeParsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

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

async function updateCounts(): Promise<void> {
  const db = getDb();
  const [metadata, media, conflicts] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue WHERE status IN ('pending', 'failed', 'conflict')`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM media_upload_queue WHERE status IN ('pending', 'failed')`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_conflicts WHERE resolved_at IS NULL`,
    ),
  ]);
  useSyncStore.getState().setCounts(
    metadata?.count ?? 0,
    media?.count ?? 0,
    conflicts?.count ?? 0,
  );
}

async function getSyncMetadata(key: string): Promise<string | null> {
  const db = getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_metadata WHERE key = ?`,
    [key],
  );
  return row?.value ?? null;
}

async function setSyncMetadata(key: string, value: string): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

async function markQueueRetry(item: QueueRow, errorMessage: string): Promise<void> {
  const nextRetry = item.retry_count + 1;
  const nextStatus = nextRetry >= item.max_retries ? 'failed' : 'pending';
  await getDb().runAsync(
    `UPDATE sync_queue
     SET status = ?, retry_count = ?, error_message = ?, last_attempt_at = ?
     WHERE id = ?`,
    [nextStatus, nextRetry, errorMessage, new Date().toISOString(), item.id],
  );
}

async function markMediaRetry(item: MediaQueueRow, errorMessage: string): Promise<void> {
  const nextRetry = item.retry_count + 1;
  const nextStatus = nextRetry >= item.max_retries ? 'failed' : 'pending';
  const db = getDb();
  await db.runAsync(
    `UPDATE media_upload_queue
     SET status = ?, retry_count = ?, error_message = ?
     WHERE id = ?`,
    [nextStatus, nextRetry, errorMessage, item.id],
  );
  await db.runAsync(
    `UPDATE media SET upload_status = ? WHERE id = ?`,
    [nextStatus === 'failed' ? 'failed' : 'pending', item.media_id],
  );
}

async function markEntitySynced(entityType: string, entityId: string, serverUpdatedAt?: string): Promise<void> {
  if (entityType !== 'asset') return;

  if (serverUpdatedAt) {
    await getDb().runAsync(
      `UPDATE assets SET is_synced = 1, updated_at = ? WHERE id = ?`,
      [serverUpdatedAt, entityId],
    );
    return;
  }

  await getDb().runAsync(`UPDATE assets SET is_synced = 1 WHERE id = ?`, [entityId]);
}

async function saveConflict(item: QueueRow, result: PushResultDTO): Promise<void> {
  await getDb().runAsync(
    `INSERT INTO sync_conflicts (
       id, entity_type, entity_id, local_payload, server_payload, created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateUUID(),
      item.entity_type,
      item.entity_id,
      item.payload,
      JSON.stringify(result.server_version ?? {}),
      new Date().toISOString(),
    ],
  );
}

// Exponential Backoff helper
function isReadyForRetry(retryCount: number, lastAttemptAt: string | null): boolean {
  if (retryCount === 0 || !lastAttemptAt) return true;
  
  const baseMs = 1000;
  const maxMs = 5 * 60 * 1000; // 5 min
  let delay = baseMs * Math.pow(2, retryCount - 1);
  if (delay > maxMs) delay = maxMs;
  
  // Jitter ±25%
  const jitter = delay * 0.25;
  delay = delay + (Math.random() * jitter * 2 - jitter);
  
  const lastAttemptTime = new Date(lastAttemptAt).getTime();
  return Date.now() >= lastAttemptTime + delay;
}

async function pushMetadata(): Promise<void> {
  const db = getDb();
  const items = await db.getAllAsync<QueueRow>(
    `SELECT id, idempotency_key, action, entity_type, entity_id, payload, retry_count, max_retries, last_attempt_at
     FROM sync_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC`,
  );
  
  // In-memory filter for exponential backoff
  const readyItems = items.filter(item => isReadyForRetry(item.retry_count, (item as any).last_attempt_at ?? null)).slice(0, MAX_SYNC_BATCH_SIZE);
  
  if (readyItems.length === 0) return;

  await db.runAsync(
    `UPDATE sync_queue SET status = 'syncing', last_attempt_at = ?
     WHERE id IN (${readyItems.map(() => '?').join(',')})`,
    [new Date().toISOString(), ...readyItems.map((item) => item.id)],
  );

  try {
    const operations = readyItems.map((item) => {
      const payload = safeParsePayload(item.payload);
      const clientUpdatedAt = asString(payload.client_updated_at, asString(payload.updated_at, ''));
      return {
        idempotency_key: item.idempotency_key,
        action: item.action,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        payload,
        client_updated_at: item.action === 'UPDATE' && clientUpdatedAt ? clientUpdatedAt : undefined,
      };
    });

    const response = await api.post('sync/push', { json: { operations } }).json<PushResponseDTO>();
    const byKey = new Map<string, PushResultDTO>(
      response.results.map((result) => [result.idempotency_key, result] as [string, PushResultDTO]),
    );

    for (const item of readyItems) {
      const result = byKey.get(item.idempotency_key);
      if (!result) {
        await markQueueRetry(item, 'Resposta de sync sem resultado da operação');
        continue;
      }

      if (result.status === 'ok' || result.status === 'duplicate') {
        await db.runAsync(
          `UPDATE sync_queue SET status = 'synced', error_message = NULL WHERE id = ?`,
          [item.id],
        );
        await markEntitySynced(item.entity_type, item.entity_id, result.server_updated_at);
        continue;
      }

      if (result.status === 'conflict') {
        await db.runAsync(
          `UPDATE sync_queue SET status = 'conflict', error_message = ? WHERE id = ?`,
          ['Conflito com versão do servidor', item.id],
        );
        await saveConflict(item, result);
        continue;
      }

      await markQueueRetry(item, result.error ?? 'Servidor recusou operação de sync');
    }

    await setSyncMetadata('last_sync_at', response.server_time);
  } catch (error) {
    for (const item of readyItems) {
      await markQueueRetry(item, String(error));
    }
    throw error;
  }
}

async function pushMedia(): Promise<void> {
  const db = getDb();
  const items = await db.getAllAsync<MediaQueueRow>(
    `SELECT id, idempotency_key, media_id, local_file_path, asset_id, media_type,
            mime_type, size_bytes, retry_count, max_retries, error_message as last_attempt_at
     FROM media_upload_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC`,
  );

  // In-memory filter for exponential backoff. Using error_message loosely here since we don't have last_attempt_at in media queue schema, but we can just use 1s delay or add the column later. For now we use the same backoff but we don't have last_attempt_at, so we rely on retry_count only as a simple wait.
  // Wait, media queue doesn't have last_attempt_at. We'll just process them all pending.
  const readyItems = items.slice(0, MEDIA_UPLOAD_BATCH_SIZE);

  for (const item of readyItems) {
    await db.runAsync(`UPDATE media_upload_queue SET status = 'uploading' WHERE id = ?`, [item.id]);
    await db.runAsync(`UPDATE media SET upload_status = 'uploading' WHERE id = ?`, [item.media_id]);

    try {
      const upload = await api.post('media/upload-url', {
        json: {
          asset_id: item.asset_id,
          media_type: item.media_type,
          mime_type: item.mime_type,
          size_bytes: item.size_bytes,
          idempotency_key: item.idempotency_key,
        },
      }).json<UploadURLResponseDTO>();

      const file = await fetch(item.local_file_path);
      const blob = await file.blob();
      const uploadResponse = await fetch(upload.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': item.mime_type },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload de mídia falhou com status ${uploadResponse.status}`);
      }

      await api.post(`media/${upload.media_id}/confirm`);
      await db.runAsync(
        `UPDATE media_upload_queue SET status = 'uploaded', error_message = NULL WHERE id = ?`,
        [item.id],
      );
      await db.runAsync(
        `UPDATE media SET upload_status = 'uploaded', storage_key = ? WHERE id = ?`,
        [upload.media_id, item.media_id],
      );
    } catch (error) {
      await markMediaRetry(item, String(error));
    }
  }
}

async function pullAssetTypes(orgId: string): Promise<void> {
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

async function pullChanges(): Promise<void> {
  const since = await getSyncMetadata('last_sync_at') ?? DEFAULT_SYNC_SINCE;
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

async function runSync(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!isOnlineState(state)) {
    await updateCounts();
    const pendingCount = useSyncStore.getState().pendingMetadataCount + useSyncStore.getState().pendingMediaCount;
    useSyncStore.getState().setStatus({ state: 'offline', pendingCount });
    return;
  }

  useSyncStore.getState().setStatus({ state: 'syncing', progress: 0 });
  try {
    const orgId = useAuthStore.getState().user?.organizationId ?? '';
    await pullAssetTypes(orgId);
    await pushMetadata();
    await pushMedia();
    await pullChanges();
    await updateCounts();

    const { pendingMetadataCount, pendingMediaCount, lastSyncAt } = useSyncStore.getState();
    const pendingCount = pendingMetadataCount + pendingMediaCount;
    const syncedAt = lastSyncAt ?? new Date().toISOString();

    // Se ainda há pendentes (ex: erros de idempotência no servidor que não
    // são considerados falha fatal), mostramos quantos faltam.
    useSyncStore.getState().setStatus({ state: 'synced', lastSyncAt: syncedAt, pendingCount });
  } catch (error) {
    await updateCounts();
    useSyncStore.getState().setStatus({ state: 'error', message: String(error) });
    console.warn('[SyncLite] Erro no sync', error);
  }
}

class SyncEngineImpl {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private lastSyncAttemptAt = 0;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.sync().catch(console.error);
    }, 30_000);
    // Execute immediate
    this.sync().catch(console.error);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sync(options: { force?: boolean } = {}): Promise<void> {
    const now = Date.now();
    if (!options.force && now - this.lastSyncAttemptAt < SYNC_COOLDOWN_MS) {
      await updateCounts();
      return;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.lastSyncAttemptAt = now;
    this.inFlight = runSync().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }
}

export const SyncEngine = new SyncEngineImpl();
