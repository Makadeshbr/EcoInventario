import { api } from '@/api/client';
import { getDb } from '@/db/database';
import { remapAssetId } from './remap-asset-id';

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

type AssetListDTO = {
  data?: Array<{ id: string; qr_code?: string }>;
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

async function resolveServerAssetId(localAssetId: string): Promise<string | null> {
  const asset = await getDb().getFirstAsync<{ qr_code: string }>(
    `SELECT qr_code FROM assets WHERE id = ?`,
    [localAssetId],
  );
  if (!asset?.qr_code) return null;

  const params = new URLSearchParams({ qr_code: asset.qr_code, limit: '1' });
  const response = await api.get(`assets?${params.toString()}`).json<AssetListDTO>();
  return response.data?.[0]?.id ?? null;
}

async function requestUploadURL(item: MediaQueueRow): Promise<UploadURLResponseDTO> {
  try {
    return await api.post('media/upload-url', {
      json: {
        media_id: item.media_id,
        asset_id: item.asset_id,
        media_type: item.media_type,
        mime_type: item.mime_type,
        size_bytes: item.size_bytes,
        idempotency_key: item.idempotency_key,
      },
    }).json<UploadURLResponseDTO>();
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;
    if (status !== 404) throw error;

    const serverAssetId = await resolveServerAssetId(item.asset_id);
    if (!serverAssetId || serverAssetId === item.asset_id) throw error;

    await remapAssetId(item.asset_id, serverAssetId);
    item.asset_id = serverAssetId;

    return api.post('media/upload-url', {
      json: {
        media_id: item.media_id,
        asset_id: item.asset_id,
        media_type: item.media_type,
        mime_type: item.mime_type,
        size_bytes: item.size_bytes,
        idempotency_key: item.idempotency_key,
      },
    }).json<UploadURLResponseDTO>();
  }
}

export async function pushMedia(): Promise<void> {
  const db = getDb();
  const items = await db.getAllAsync<MediaQueueRow>(
    `SELECT id, idempotency_key, media_id, local_file_path, asset_id, media_type,
            mime_type, size_bytes, retry_count, max_retries
     FROM media_upload_queue
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC`,
  );

  const batch = items.slice(0, MEDIA_UPLOAD_BATCH_SIZE);

  for (const item of batch) {
    await db.runAsync(`UPDATE media_upload_queue SET status = 'uploading' WHERE id = ?`, [item.id]);
    await db.runAsync(`UPDATE media SET upload_status = 'uploading' WHERE id = ?`, [item.media_id]);

    try {
      const upload = await requestUploadURL(item);

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
