import { getDb } from '@/db/database';
import type { Asset, AssetType, Media } from '@/types/domain';

type AssetStatusCount = Record<'draft' | 'pending' | 'approved' | 'rejected', number>;

function rowToAsset(row: Record<string, unknown>): Asset {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    assetTypeId: row.asset_type_id as string,
    assetTypeName: row.asset_type_name as string,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    gpsAccuracyM: row.gps_accuracy_m as number | null,
    qrCode: row.qr_code as string,
    status: row.status as Asset['status'],
    version: row.version as number,
    parentId: row.parent_id as string | null,
    rejectionReason: row.rejection_reason as string | null,
    notes: row.notes as string | null,
    createdBy: row.created_by as string,
    approvedBy: row.approved_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: row.deleted_at as string | null,
    isSynced: (row.is_synced as number) === 1,
  };
}

function rowToAssetType(row: Record<string, unknown>): AssetType {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    description: row.description as string | null,
    isActive: (row.is_active as number) === 1,
  };
}

function rowToMedia(row: Record<string, unknown>): Media {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    assetId: row.asset_id as string,
    localFilePath: row.local_file_path as string,
    storageKey: row.storage_key as string | null,
    mimeType: row.mime_type as string,
    sizeBytes: row.size_bytes as number,
    type: row.type as Media['type'],
    uploadStatus: row.upload_status as Media['uploadStatus'],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

export async function getRecentAssets(limit = 5): Promise<Asset[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM assets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map(rowToAsset);
}

export async function getAssets(filter?: {
  status?: Asset['status'];
  isSynced?: boolean;
}): Promise<Asset[]> {
  const db = getDb();
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: Array<string | number | null> = [];

  if (filter?.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }
  if (filter?.isSynced !== undefined) {
    conditions.push('is_synced = ?');
    params.push(filter.isSynced ? 1 : 0);
  }

  const where = conditions.join(' AND ');
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM assets WHERE ${where} ORDER BY created_at DESC`,
    params,
  );
  return rows.map(rowToAsset);
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM assets WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return row ? rowToAsset(row) : null;
}

export async function getAssetByQR(qrCode: string): Promise<Asset | null> {
  const db = getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM assets WHERE qr_code = ? AND deleted_at IS NULL`,
    [qrCode],
  );
  return row ? rowToAsset(row) : null;
}

export async function countAssetsByStatus(): Promise<AssetStatusCount> {
  const db = getDb();
  const rows = await db.getAllAsync<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM assets WHERE deleted_at IS NULL GROUP BY status`,
  );
  const counts: AssetStatusCount = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of rows) {
    counts[row.status as keyof AssetStatusCount] = row.count;
  }
  return counts;
}

export async function countUnsyncedAssets(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM assets WHERE is_synced = 0 AND deleted_at IS NULL`,
  );
  return row?.count ?? 0;
}

export interface InsertAssetParams {
  id: string;
  organizationId: string;
  assetTypeId: string;
  assetTypeName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  qrCode: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export async function insertAsset(params: InsertAssetParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO assets (
      id, organization_id, asset_type_id, asset_type_name,
      latitude, longitude, gps_accuracy_m, qr_code,
      status, version, notes, created_by, created_at, updated_at, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?, 0)`,
    [
      params.id, params.organizationId, params.assetTypeId, params.assetTypeName,
      params.latitude, params.longitude, params.gpsAccuracyM, params.qrCode,
      params.notes, params.createdBy, params.createdAt, params.createdAt,
    ],
  );
}

export interface UpdateAssetParams {
  assetTypeId?: string;
  assetTypeName?: string;
  notes?: string | null;
  status?: Asset['status'];
  updatedAt: string;
}

export async function updateAsset(id: string, params: UpdateAssetParams): Promise<void> {
  const db = getDb();
  const sets: string[] = ['updated_at = ?', 'is_synced = 0'];
  const values: Array<string | number | null> = [params.updatedAt];

  if (params.assetTypeId !== undefined) { sets.push('asset_type_id = ?'); values.push(params.assetTypeId); }
  if (params.assetTypeName !== undefined) { sets.push('asset_type_name = ?'); values.push(params.assetTypeName); }
  if (params.notes !== undefined) { sets.push('notes = ?'); values.push(params.notes); }
  if (params.status !== undefined) { sets.push('status = ?'); values.push(params.status); }

  values.push(id);
  await db.runAsync(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function getAssetTypes(): Promise<AssetType[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM asset_types WHERE is_active = 1 ORDER BY name ASC`,
  );
  return rows.map(rowToAssetType);
}

export async function upsertAssetType(type: AssetType): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO asset_types (id, organization_id, name, description, is_active)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       description = excluded.description,
       is_active = excluded.is_active`,
    [type.id, type.organizationId, type.name, type.description, type.isActive ? 1 : 0],
  );
}

export interface InsertMediaParams {
  id: string;
  organizationId: string;
  assetId: string;
  localFilePath: string;
  mimeType: string;
  sizeBytes: number;
  type: Media['type'];
  createdBy: string;
  createdAt: string;
}

export async function insertMedia(params: InsertMediaParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO media (
      id, organization_id, asset_id, local_file_path,
      mime_type, size_bytes, type, upload_status, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      params.id, params.organizationId, params.assetId, params.localFilePath,
      params.mimeType, params.sizeBytes, params.type, params.createdBy, params.createdAt,
    ],
  );
}

export async function getMediaForAsset(assetId: string): Promise<Media[]> {
  const db = getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM media WHERE asset_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`,
    [assetId],
  );
  return rows.map(rowToMedia);
}

export interface EnqueueSyncParams {
  id: string;
  idempotencyKey: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  payload: string;
  createdAt: string;
}

export async function enqueueSyncItem(params: EnqueueSyncParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO sync_queue (
      id, idempotency_key, action, entity_type, entity_id,
      payload, status, retry_count, max_retries, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 5, ?)`,
    [
      params.id, params.idempotencyKey, params.action,
      params.entityType, params.entityId, params.payload, params.createdAt,
    ],
  );
}

export interface EnqueueMediaUploadParams {
  id: string;
  idempotencyKey: string;
  mediaId: string;
  localFilePath: string;
  assetId: string;
  mediaType: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export async function enqueueMediaUpload(params: EnqueueMediaUploadParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO media_upload_queue (
      id, idempotency_key, media_id, local_file_path, asset_id,
      media_type, mime_type, size_bytes, status, retry_count, max_retries, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 3, ?)`,
    [
      params.id, params.idempotencyKey, params.mediaId, params.localFilePath,
      params.assetId, params.mediaType, params.mimeType, params.sizeBytes, params.createdAt,
    ],
  );
}

export interface InsertManejoParams {
  id: string;
  organizationId: string;
  assetId: string;
  description: string;
  beforeMediaId: string | null;
  afterMediaId: string | null;
  createdBy: string;
  createdAt: string;
}

export async function insertManejo(params: InsertManejoParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO manejos (
      id, organization_id, asset_id, description,
      before_media_id, after_media_id, status, created_by, created_at, updated_at, is_synced
    ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0)`,
    [
      params.id, params.organizationId, params.assetId, params.description,
      params.beforeMediaId, params.afterMediaId, params.createdBy, params.createdAt, params.createdAt
    ]
  );
}

export interface InsertMonitoramentoParams {
  id: string;
  organizationId: string;
  assetId: string;
  notes: string;
  healthStatus: string;
  createdBy: string;
  createdAt: string;
}

export async function insertMonitoramento(params: InsertMonitoramentoParams): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO monitoramentos (
      id, organization_id, asset_id, notes, health_status,
      status, created_by, created_at, updated_at, is_synced
    ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0)`,
    [
      params.id, params.organizationId, params.assetId, params.notes, params.healthStatus,
      params.createdBy, params.createdAt, params.createdAt
    ]
  );
}
