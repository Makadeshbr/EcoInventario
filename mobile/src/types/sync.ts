export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  action: SyncAction;
  entityType: string;
  entityId: string;
  payload: string;
  status: SyncItemStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
}

export interface MediaUploadQueueItem {
  id: string;
  idempotencyKey: string;
  mediaId: string;
  localFilePath: string;
  assetId: string;
  mediaType: string;
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface SyncPushResponse {
  results: Array<{
    idempotencyKey: string;
    status: 'ok' | 'conflict' | 'error' | 'duplicate';
    entityId?: string;
    serverUpdatedAt?: string;
    serverVersion?: { updatedAt: string; data: Record<string, unknown> };
  }>;
  serverTime: string;
}

export interface SyncPullResponse {
  changes: Array<{
    entityType: string;
    entityId: string;
    action: 'create' | 'update' | 'delete';
    data: Record<string, unknown>;
    updatedAt: string;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
  serverTime: string;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localPayload: string;
  serverPayload: string;
  createdAt: string;
  resolvedAt: string | null;
}

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing'; progress: number }
  | { state: 'synced'; lastSyncAt: string; pendingCount: number }
  | { state: 'error'; message: string }
  | { state: 'conflict'; count: number }
  | { state: 'offline'; pendingCount: number };
