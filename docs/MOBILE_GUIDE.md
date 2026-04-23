# MOBILE_GUIDE.md — Guia Completo do Mobile (Expo / React Native)

> **Propósito:** Tudo que a IA precisa para gerar código TypeScript do app mobile.
> Tipos, patterns, sync engine, stores, constantes.
> Para telas e fluxo de navegação, consulte APP_FLOW.md.

**Regra de produto:** no MVP, o modo profissional do mobile é exclusivo para usuários `tech`.
Contas `admin` e `viewer` devem ser direcionadas ao dashboard web.

---

## 1. Tipos TypeScript

### Entidades de Domínio

```typescript
// src/types/domain.ts

export type AssetStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'dead';
export type MediaType = 'before' | 'after' | 'general';
export type UserRole = 'tech' | 'admin' | 'viewer';

export interface Asset {
  id: string;
  organizationId: string;
  assetTypeId: string;
  assetTypeName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  qrCode: string;
  status: AssetStatus;
  version: number;
  parentId: string | null;
  rejectionReason: string | null;
  notes: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isSynced: boolean;
}

export interface AssetType {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface Media {
  id: string;
  organizationId: string;
  assetId: string;
  localFilePath: string;
  storageKey: string | null;
  mimeType: string;
  sizeBytes: number;
  type: MediaType;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  createdBy: string;
  createdAt: string;
}

export interface Manejo {
  id: string;
  organizationId: string;
  assetId: string;
  description: string;
  beforeMediaId: string | null;
  afterMediaId: string | null;
  status: AssetStatus;
  rejectionReason: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface Monitoramento {
  id: string;
  organizationId: string;
  assetId: string;
  notes: string;
  healthStatus: HealthStatus;
  status: AssetStatus;
  rejectionReason: string | null;
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
}
```

### Tipos de API

```typescript
// src/types/api.ts

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { nextCursor: string | null; hasMore: boolean };
}

export interface LoginRequest { email: string; password: string }

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface UploadUrlRequest {
  assetId: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  idempotencyKey: string;
}

export interface UploadUrlResponse {
  mediaId: string;
  uploadUrl: string;
  expiresIn: number;
}
```

### Tipos de Sync

```typescript
// src/types/sync.ts

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
  | { state: 'error'; message: string }
  | { state: 'conflict'; count: number }
  | { state: 'offline'; pendingCount: number };
```

---

## 2. Zod Schemas

```typescript
// src/features/assets/schemas.ts
import { z } from 'zod';

export const createAssetSchema = z.object({
  assetTypeId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gpsAccuracyM: z.number().min(0).max(1000).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateAssetPayload = z.infer<typeof createAssetSchema>;

export const createManejoSchema = z.object({
  assetId: z.string().uuid(),
  description: z.string().min(1).max(5000),
  beforeMediaId: z.string().uuid().optional(),
  afterMediaId: z.string().uuid().optional(),
});

export const createMonitoramentoSchema = z.object({
  assetId: z.string().uuid(),
  notes: z.string().min(1).max(5000),
  healthStatus: z.enum(['healthy', 'warning', 'critical', 'dead']),
});
```

---

## 3. Constantes

```typescript
// src/constants/config.ts

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1920;
export const JPEG_QUALITY = 0.8;
export const MAX_PHOTOS_PER_ASSET = 20;

export const MAX_SYNC_BATCH_SIZE = 50;
export const SYNC_INTERVAL_MS = 30_000;
export const SYNC_TIMEOUT_MS = 30_000;
export const MAX_METADATA_RETRIES = 5;
export const MAX_MEDIA_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_MAX_DELAY_MS = 300_000;

export const GPS_ACCURACY_THRESHOLD_M = 50;
export const DEFAULT_PAGE_SIZE = 20;
```

---

## 4. API Client

```typescript
// src/api/client.ts
import ky from 'ky';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL } from '@/constants/config';

export const api = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30_000,
  hooks: {
    beforeRequest: [(req) => {
      const token = useAuthStore.getState().accessToken;
      if (token) req.headers.set('Authorization', `Bearer ${token}`);
    }],
    afterResponse: [async (_req, _opts, res) => {
      if (res.status === 401) {
        const ok = await useAuthStore.getState().refreshAccessToken();
        if (!ok) useAuthStore.getState().logout();
      }
    }],
  },
});
```

### Conversão snake_case ↔ camelCase

A API usa `snake_case`. O app usa `camelCase`. Conversão na camada de API:

```typescript
// src/api/transforms.ts
export function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    result[camel] = value && typeof value === 'object' && !Array.isArray(value)
      ? toCamelCase(value as Record<string, unknown>) : value;
  }
  return result as T;
}

export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
    result[snake] = value && typeof value === 'object' && !Array.isArray(value)
      ? toSnakeCase(value as Record<string, unknown>) : value;
  }
  return result;
}
```

---

## 5. Zustand Stores

### Auth Store

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import { API_BASE_URL } from '@/constants/config';
import type { User } from '@/types/domain';

const storage = new MMKV();

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (access: string, refresh: string, user: User) => void;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: storage.getString('access_token') ?? null,
  refreshToken: storage.getString('refresh_token') ?? null,
  user: JSON.parse(storage.getString('user') ?? 'null'),
  isAuthenticated: !!storage.getString('access_token'),

  setAuth: (access, refresh, user) => {
    storage.set('access_token', access);
    storage.set('refresh_token', refresh);
    storage.set('user', JSON.stringify(user));
    set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true });
  },

  refreshAccessToken: async () => {
    const rt = get().refreshToken;
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const user = get().user;
      if (!user || user.role !== 'tech') return false;
      get().setAuth(data.access_token, data.refresh_token, user);
      return true;
    } catch (error) {
      // Falha de rede ou token inválido — não propaga, mas loga para diagnóstico
      console.error('[AuthStore] refreshAccessToken falhou:', error);
      return false;
    }
  },

  logout: () => {
    storage.delete('access_token');
    storage.delete('refresh_token');
    storage.delete('user');
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
```

### Sync Store

```typescript
// src/stores/sync-store.ts
import { create } from 'zustand';
import type { SyncStatus } from '@/types/sync';

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingMetadataCount: number;
  pendingMediaCount: number;
  conflictCount: number;
  setStatus: (s: SyncStatus) => void;
  setLastSyncAt: (t: string) => void;
  setCounts: (meta: number, media: number, conflicts: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: { state: 'idle' },
  lastSyncAt: null,
  pendingMetadataCount: 0,
  pendingMediaCount: 0,
  conflictCount: 0,
  setStatus: (status) => set({ status }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  setCounts: (meta, media, conflicts) => set({
    pendingMetadataCount: meta, pendingMediaCount: media, conflictCount: conflicts,
  }),
}));
```

---

## 6. Sync Engine

### Prioridade de Operações

1. **Push metadados** (sync_queue) — leve, crítico
2. **Push mídia** (media_upload_queue) — pesado, background
3. **Pull atualizações** (GET /sync/pull) — por último

### Fluxo Completo

```typescript
// src/sync/sync-engine.ts

export class SyncEngine {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.sync(), SYNC_INTERVAL_MS);
    this.sync(); // executa imediatamente
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  async sync() {
    if (this.isRunning) return;
    this.isRunning = true;
    useSyncStore.getState().setStatus({ state: 'syncing', progress: 0 });

    try {
      await this.pushMetadata();  // 1
      await this.pushMedia();     // 2
      await this.pullChanges();   // 3
      await this.updateCounts();
      useSyncStore.getState().setStatus({ state: 'idle' });
    } catch (error) {
      useSyncStore.getState().setStatus({ state: 'error', message: String(error) });
    } finally {
      this.isRunning = false;
    }
  }

  private async updateCounts() {
    const [meta, media, conflicts] = await Promise.all([
      db.countSyncQueueByStatus('pending'),
      db.countMediaUploadByStatus('pending'),
      db.countUnresolvedConflicts(),
    ]);
    useSyncStore.getState().setCounts(meta, media, conflicts);
  }

  private async handleRetry(item: SyncQueueItem) {
    if (item.retryCount >= item.maxRetries) {
      await db.updateSyncQueueStatus([item.id], 'failed');
      return;
    }
    // Backoff exponencial antes de marcar como pending novamente
    const delay = getRetryDelay(item.retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    await db.incrementSyncQueueRetry(item.id);
    await db.updateSyncQueueStatus([item.id], 'pending');
  }

  private async handleMediaRetry(item: MediaUploadQueueItem, errorMessage: string) {
    if (item.retryCount >= item.maxRetries) {
      await db.updateMediaUploadStatus(item.id, 'failed', errorMessage);
      return;
    }
    const delay = getRetryDelay(item.retryCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    await db.incrementMediaUploadRetry(item.id);
    await db.updateMediaUploadStatus(item.id, 'pending');
  }
}
```

### Push Metadados

```typescript
private async pushMetadata() {
  const items = await db.getSyncQueueItems({ status: 'pending', limit: MAX_SYNC_BATCH_SIZE });
  if (items.length === 0) return;

  await db.updateSyncQueueStatus(items.map(i => i.id), 'syncing');

  try {
    const operations = items.map(item => ({
      idempotency_key: item.idempotencyKey,
      action: item.action,
      entity_type: item.entityType,
      entity_id: item.entityId,
      payload: JSON.parse(item.payload),
      client_updated_at: JSON.parse(item.payload).updated_at,
    }));

    const { results, serverTime } = await api.post('sync/push', { json: { operations } }).json();

    for (const result of results) {
      const item = items.find(i => i.idempotencyKey === result.idempotencyKey);
      if (!item) continue;

      if (result.status === 'ok' || result.status === 'duplicate') {
        await db.updateSyncQueueStatus([item.id], 'synced');
        await db.markEntitySynced(item.entityType, item.entityId);
      } else if (result.status === 'conflict') {
        await db.updateSyncQueueStatus([item.id], 'conflict');
        await db.saveSyncConflict(
          item.entityType,
          item.entityId,
          item.payload,
          JSON.stringify(result.serverVersion)
        );
      } else {
        await this.handleRetry(item);
      }
    }

    await db.setSyncMetadata('last_sync_at', serverTime);
  } catch {
    // Falha de rede: volta para pending com retry
    for (const item of items) await this.handleRetry(item);
  }
}
```

### Push Mídia

```typescript
private async pushMedia() {
  const items = await db.getMediaUploadQueue({ status: 'pending', limit: 5 });

  for (const item of items) {
    await db.updateMediaUploadStatus(item.id, 'uploading');
    try {
      const { mediaId, uploadUrl } = await api.post('media/upload-url', {
        json: toSnakeCase({
          assetId: item.assetId, mediaType: item.mediaType,
          mimeType: item.mimeType, sizeBytes: item.sizeBytes,
          idempotencyKey: item.idempotencyKey,
        }),
      }).json();

      const file = await readLocalFile(item.localFilePath);
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': item.mimeType }, body: file });
      await api.post(`media/${mediaId}/confirm`);
      await db.updateMediaUploadStatus(item.id, 'uploaded');
    } catch (error) {
      await this.handleMediaRetry(item, String(error));
    }
  }
}
```

### Pull

```typescript
private async pullChanges() {
  const since = await db.getSyncMetadata('last_sync_at') || '1970-01-01T00:00:00Z';
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ since, limit: '100' });
    if (cursor) params.set('cursor', cursor);

    const response: SyncPullResponse = await api.get(`sync/pull?${params}`).json();

    for (const change of response.changes) {
      if (change.action === 'delete') {
        await db.softDeleteEntity(change.entityType, change.entityId);
      } else {
        await db.upsertEntity(change.entityType, change.entityId, toCamelCase(change.data));
      }
    }

    hasMore = response.hasMore;
    cursor = response.nextCursor;
    await db.setSyncMetadata('last_sync_at', response.serverTime);
  }
}
```

### Retry com Backoff

```typescript
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(RETRY_BASE_DELAY_MS * Math.pow(2, retryCount), RETRY_MAX_DELAY_MS);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return delay + jitter;
}
```

---

## 7. Utilities

### UUID

```typescript
// src/utils/uuid.ts
import 'react-native-get-random-values'; // DEVE ser importado antes de uuid
import { v4 as uuidv4 } from 'uuid';
export const generateUUID = () => uuidv4();
```

### Compressão de Imagem

```typescript
// src/utils/image-compression.ts
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );
}
```

### Network Status

```typescript
// src/hooks/use-network-status.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  useEffect(() => NetInfo.addEventListener(s => setIsConnected(s.isConnected ?? false)), []);
  return { isConnected };
}
```
