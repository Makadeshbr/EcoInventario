import { getDb } from '@/db/database';

function rewritePayload(payload: string, oldId: string, newId: string): string {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    if (parsed.id === oldId) parsed.id = newId;
    if (parsed.asset_id === oldId) parsed.asset_id = newId;
    return JSON.stringify(parsed);
  } catch {
    return payload;
  }
}

export async function remapAssetId(oldId: string, newId: string): Promise<void> {
  if (!newId || oldId === newId) return;

  const db = getDb();
  const rows = await db.getAllAsync<{ id: string; payload: string }>(
    `SELECT id, payload FROM sync_queue
     WHERE entity_id = ? OR payload LIKE ?`,
    [oldId, `%${oldId}%`],
  );

  await db.withTransactionAsync(async () => {
    await db.runAsync(`UPDATE media_upload_queue SET asset_id = ? WHERE asset_id = ?`, [newId, oldId]);
    await db.runAsync(`UPDATE media SET asset_id = ? WHERE asset_id = ?`, [newId, oldId]);
    await db.runAsync(`UPDATE manejos SET asset_id = ? WHERE asset_id = ?`, [newId, oldId]);
    await db.runAsync(`UPDATE monitoramentos SET asset_id = ? WHERE asset_id = ?`, [newId, oldId]);
    await db.runAsync(
      `UPDATE sync_queue SET entity_id = ? WHERE entity_type = 'asset' AND entity_id = ?`,
      [newId, oldId],
    );

    for (const row of rows) {
      await db.runAsync(
        `UPDATE sync_queue SET payload = ? WHERE id = ?`,
        [rewritePayload(row.payload, oldId, newId), row.id],
      );
    }

    const existing = await db.getFirstAsync<{ id: string }>(`SELECT id FROM assets WHERE id = ?`, [newId]);
    if (!existing) {
      await db.runAsync(`UPDATE assets SET id = ? WHERE id = ?`, [newId, oldId]);
    }
  });
}
