import NetInfo from '@react-native-community/netinfo';
import { getDb } from '@/db/database';
import { useAuthStore } from '@/stores/auth-store';
import { useSyncStore } from '@/stores/sync-store';
import { pushMetadata } from './push-metadata';
import { pushMedia } from './push-media';
import { pullAssetTypes, pullChanges } from './pull-changes';
import { getSyncMetadata } from './sync-metadata';

const SYNC_COOLDOWN_MS = 15_000;

function isOnlineState(state: Awaited<ReturnType<typeof NetInfo.fetch>>): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

async function updateCounts(): Promise<void> {
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
  useSyncStore.getState().setCounts(
    metadata?.count ?? 0,
    media?.count ?? 0,
    conflicts?.count ?? 0,
  );
}

async function runSync(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!isOnlineState(state)) {
    await updateCounts();
    const pendingCount = useSyncStore.getState().pendingMetadataCount + useSyncStore.getState().pendingMediaCount;
    useSyncStore.getState().setStatus({ state: 'offline', pendingCount });
    return;
  }

  useSyncStore.getState().setStatus({ state: 'syncing', progress: 0 });
  try {
    const orgId = useAuthStore.getState().user?.organizationId ?? '';
    await pullAssetTypes(orgId);
    await pushMetadata();
    await pushMedia();
    await pullChanges();
    await updateCounts();

    const { pendingMetadataCount, pendingMediaCount, lastSyncAt } = useSyncStore.getState();
    const pendingCount = pendingMetadataCount + pendingMediaCount;
    const syncedAt = lastSyncAt ?? new Date().toISOString();

    useSyncStore.getState().setStatus({ state: 'synced', lastSyncAt: syncedAt, pendingCount });
  } catch (error) {
    await updateCounts();
    useSyncStore.getState().setStatus({ state: 'error', message: String(error) });
    console.warn('[SyncEngine] Erro no sync', error);
  }
}

class SyncEngineImpl {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
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

  async sync(options: { force?: boolean } = {}): Promise<void> {
    const now = Date.now();
    if (!options.force && now - this.lastSyncAttemptAt < SYNC_COOLDOWN_MS) {
      await updateCounts();
      return;
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
