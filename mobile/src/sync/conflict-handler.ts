import { getDb } from '@/db/database';
import { generateUUID } from '@/utils/uuid';
import { enqueueSyncItem } from '@/features/assets/repository';
import type * as SQLite from 'expo-sqlite';
import { SyncEngine } from './sync-engine';

export interface ConflictRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  local_payload: string;
  server_payload: string;
  created_at: string;
  resolved_at: string | null;
}

export async function getConflicts(): Promise<ConflictRecord[]> {
  return await getDb().getAllAsync<ConflictRecord>(
    `SELECT * FROM sync_conflicts WHERE resolved_at IS NULL ORDER BY created_at DESC`,
  );
}

export async function getConflictById(id: string): Promise<ConflictRecord | null> {
  return await getDb().getFirstAsync<ConflictRecord>(
    `SELECT * FROM sync_conflicts WHERE id = ?`,
    [id],
  );
}

export async function resolveConflictAcceptServer(conflictId: string): Promise<void> {
  const db = getDb();
  const conflict = await getConflictById(conflictId);
  if (!conflict) throw new Error('Conflito não encontrado');

  const serverData = JSON.parse(conflict.server_payload).data ?? {};
  
  if (conflict.entity_type === 'asset') {
    // Force update local asset with server data
    await db.runAsync(
      `UPDATE assets SET 
        asset_type_id = ?,
        notes = ?,
        updated_at = ?,
        is_synced = 1
       WHERE id = ?`,
      [
        serverData.asset_type_id ?? '',
        serverData.notes ?? '',
        serverData.updated_at ?? new Date().toISOString(),
        conflict.entity_id,
      ]
    );
  }

  // Marcar conflito como resolvido e falhar a fila antiga
  await markConflictResolved(db, conflictId, conflict.entity_type, conflict.entity_id);
  SyncEngine.sync({ force: true });
}

export async function resolveConflictForceLocal(conflictId: string): Promise<void> {
  const db = getDb();
  const conflict = await getConflictById(conflictId);
  if (!conflict) throw new Error('Conflito não encontrado');

  const serverVersion = JSON.parse(conflict.server_payload);
  const localPayload = JSON.parse(conflict.local_payload);

  // Forçar atualização local usando o client_updated_at como o server.updated_at
  const now = new Date().toISOString();
  
  // Atualiza asset local para forçar nova versão
  if (conflict.entity_type === 'asset') {
    await db.runAsync(`UPDATE assets SET updated_at = ?, is_synced = 0 WHERE id = ?`, [now, conflict.entity_id]);
  }

  await enqueueSyncItem({
    id: generateUUID(),
    idempotencyKey: `force-update-${conflict.entity_id}-${now}`,
    action: 'UPDATE',
    entityType: conflict.entity_type,
    entityId: conflict.entity_id,
    payload: JSON.stringify({
      ...localPayload,
      updated_at: now,
      client_updated_at: serverVersion.updated_at, // Aqui está o segredo: enviamos a data base do servidor
    }),
    createdAt: now,
  });

  await markConflictResolved(db, conflictId, conflict.entity_type, conflict.entity_id);
  SyncEngine.sync({ force: true });
}

async function markConflictResolved(
  db: SQLite.SQLiteDatabase,
  conflictId: string,
  entityType: string,
  entityId: string,
): Promise<void> {
  // Marca o conflito como resolvido
  await db.runAsync(`UPDATE sync_conflicts SET resolved_at = ? WHERE id = ?`, [new Date().toISOString(), conflictId]);
  
  // Marca o item antigo da fila como failed para sair de pending/conflict
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed', error_message = 'Resolvido pelo usuário' 
     WHERE entity_id = ? AND entity_type = ? AND status = 'conflict'`,
    [entityId, entityType]
  );
}
