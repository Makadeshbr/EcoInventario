import { api } from '@/api/client';
import { getDb } from '@/db/database';

const MEDIA_UPLOAD_BATCH_SIZE = 3;

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

type UploadURLResponseDTO = {
  media_id: string;
  upload_url: string;
};

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

export async function pushMedia(): Promise<void> {
  const db = getDb();
  const items = await db.getAllAsync<MediaQueueRow>(
    `SELECT id, idempotency_key, media_id, local_file_path, asset_id, media_type,
            mime_type, size_bytes, retry_count, max_retries
     FROM media_upload_queue
     WHERE status = 'pending'
     ORDER BY created_at ASC`,
  );

  const batch = items.slice(0, MEDIA_UPLOAD_BATCH_SIZE);

  for (const item of batch) {
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
