import { getDb } from '@/db/database';

type EntityType = 'asset' | 'manejo' | 'monitoramento';

export type EntitySyncStatus = {
  pendingMetadataCount: number;
  pendingMediaCount: number;
};

export async function getEntitySyncStatus(entityType: EntityType, entityId: string): Promise<EntitySyncStatus> {
  const db = getDb();
  const metadata = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM sync_queue
     WHERE status IN ('pending', 'failed', 'conflict')
       AND (entity_type = ? AND entity_id = ? OR payload LIKE ?)`,
    [entityType, entityId, `%${entityId}%`],
  );

  if (entityType !== 'asset') {
    return {
      pendingMetadataCount: metadata?.count ?? 0,
      pendingMediaCount: 0,
    };
  }

  const media = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM media_upload_queue
     WHERE status IN ('pending', 'failed') AND asset_id = ?`,
    [entityId],
  );

  return {
    pendingMetadataCount: metadata?.count ?? 0,
    pendingMediaCount: media?.count ?? 0,
  };
}
