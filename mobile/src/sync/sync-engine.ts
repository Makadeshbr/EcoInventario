import NetInfo from '@react-native-community/netinfo';
import { getDb } from '@/db/database';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { pushMetadata } from './push-metadata';
import { pushMedia } from './push-media';
import { pullAssetTypes, pullChanges } from './pull-changes';
import { getSyncMetadata } from './sync-metadata';

const SYNC_COOLDOWN_MS = 15_000;

export type SyncResult = {
  state: 'synced' | 'offline' | 'error';
  pendingMetadataCount: number;
  pendingMediaCount: number;
  conflictCount: number;
  message?: string;
};

function isOnlineState(state: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

async function updateCounts(): Promise<Omit<SyncResult, 'state' | 'message'>> {
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
  const counts = {
    pendingMetadataCount: metadata?.count ?? 0,
    pendingMediaCount: media?.count ?? 0,
    conflictCount: conflicts?.count ?? 0,
  };
  useSyncStore.getState().setCounts(
    counts.pendingMetadataCount,
    counts.pendingMediaCount,
    counts.conflictCount,
  );
  return counts;
}

async function runSync(): Promise<SyncResult> {
  const state = await NetInfo.fetch();
  if (!isOnlineState(state)) {
    const counts = await updateCounts();
    const pendingCount = useSyncStore.getState().pendingMetadataCount + useSyncStore.getState().pendingMediaCount;
    useSyncStore.getState().setStatus({ state: 'offline', pendingCount });
    return { state: 'offline', ...counts };
  }

  useSyncStore.getState().setStatus({ state: 'syncing', progress: 0 });
  try {
    const db = getDb();
    await db.runAsync(`UPDATE sync_queue SET status = 'pending' WHERE status = 'syncing'`);
    await db.runAsync(`UPDATE media_upload_queue SET status = 'pending' WHERE status = 'uploading'`);
    await db.runAsync(`UPDATE media SET upload_status = 'pending' WHERE upload_status = 'uploading'`);

    const orgId = useAuthStore.getState().user?.organizationId ?? '';
    await pullAssetTypes(orgId);
    await pushMetadata({ includeSubmissions: false, entityTypes: ['asset'] });
    await pushMedia();
    await pushMetadata({ includeSubmissions: false, excludeEntityTypes: ['asset'] });
    await pushMetadata({ onlySubmissions: true });
    await pullChanges();
    const counts = await updateCounts();

    const { pendingMetadataCount, pendingMediaCount, lastSyncAt } = useSyncStore.getState();
    const pendingCount = pendingMetadataCount + pendingMediaCount;
    const syncedAt = lastSyncAt ?? new Date().toISOString();

    if (counts.conflictCount > 0) {
      useSyncStore.getState().setStatus({ state: 'conflict', count: counts.conflictCount });
    } else {
      useSyncStore.getState().setStatus({ state: 'synced', lastSyncAt: syncedAt, pendingCount });
    }
    return { state: 'synced', ...counts };
  } catch (error) {
    const counts = await updateCounts();
    const message = String(error);
    useSyncStore.getState().setStatus({ state: 'error', message });
    console.warn('[SyncEngine] Erro no sync', error);
    return { state: 'error', ...counts, message };
  }
}

class SyncEngineImpl {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<SyncResult> | null = null;
  private lastSyncAttemptAt = 0;

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.sync().catch(console.error);
    }, 30_000);
    this.sync().catch(console.error);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sync(options: { force?: boolean } = {}): Promise<SyncResult> {
    const now = Date.now();
    if (!options.force && now - this.lastSyncAttemptAt < SYNC_COOLDOWN_MS) {
      const counts = await updateCounts();
      return { state: 'synced', ...counts };
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

  async getLastSyncAt(): Promise<string | null> {
    return getSyncMetadata('last_sync_at');
  }
}

export const SyncEngine = new SyncEngineImpl();
