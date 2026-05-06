import { api } from '@/api/client';
import { getDb } from '@/db/database';
import { MAX_SYNC_BATCH_SIZE } from '@/constants/config';
import type { SyncAction } from '@/types/sync';
import { setSyncMetadata } from './sync-metadata';

type QueueRow = {
  id: string;
  idempotency_key: string;
  action: SyncAction;
  entity_type: string;
  entity_id: string;
  payload: string;
  retry_count: number;
  max_retries: number;
  last_attempt_at: string | null;
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

function isReadyForRetry(retryCount: number, lastAttemptAt: string | null): boolean {
  if (retryCount === 0 || !lastAttemptAt) return true;

  const baseMs = 1000;
  const maxMs = 5 * 60 * 1000;
  let delay = baseMs * Math.pow(2, retryCount - 1);
  if (delay > maxMs) delay = maxMs;

  const jitter = delay * 0.25;
  delay = delay + (Math.random() * jitter * 2 - jitter);

  return Date.now() >= new Date(lastAttemptAt).getTime() + delay;
}

function safeParsePayload(payload: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
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
  const { generateUUID } = await import('@/utils/uuid');
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

export async function pushMetadata(): Promise<void> {
  const db = getDb();
  const items = await db.getAllAsync<QueueRow>(
    `SELECT id, idempotency_key, action, entity_type, entity_id, payload, retry_count, max_retries, last_attempt_at
     FROM sync_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC`,
  );

  const readyItems = items
    .filter((item) => isReadyForRetry(item.retry_count, item.last_attempt_at))
    .slice(0, MAX_SYNC_BATCH_SIZE);

  if (readyItems.length === 0) return;

  await db.runAsync(
    `UPDATE sync_queue SET status = 'syncing', last_attempt_at = ?
     WHERE id IN (${readyItems.map(() => '?').join(',')})`,
    [new Date().toISOString(), ...readyItems.map((item) => item.id)],
  );

  try {
    const operations = readyItems.map((item) => {
      const payload = safeParsePayload(item.payload);
      const clientUpdatedAt = typeof payload.client_updated_at === 'string'
        ? payload.client_updated_at
        : typeof payload.updated_at === 'string' ? payload.updated_at : '';
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
