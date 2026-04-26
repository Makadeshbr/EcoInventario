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
  setCounts: (meta, media, conflicts) =>
    set({ pendingMetadataCount: meta, pendingMediaCount: media, conflictCount: conflicts }),
}));
