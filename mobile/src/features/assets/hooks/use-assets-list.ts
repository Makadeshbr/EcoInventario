import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAssets } from '../repository';
import type { Asset } from '@/types/domain';
import { SyncEngine } from '@/sync/sync-engine';

export type AssetsFilter = 'all' | 'draft' | 'pending' | 'approved' | 'rejected' | 'unsynced';

interface AssetsList {
  assets: Asset[];
  activeFilter: AssetsFilter;
  isLoading: boolean;
  changeFilter: (f: AssetsFilter) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAssetsList(initialFilter: AssetsFilter = 'all'): AssetsList {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeFilter, setActiveFilter] = useState<AssetsFilter>(initialFilter);
  const [isLoading, setIsLoading] = useState(true);
  const activeFilterRef = useRef<AssetsFilter>(initialFilter);
  const requestIdRef = useRef(0);

  const load = useCallback(async (filter: AssetsFilter, shouldSync = false) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    try {
      if (shouldSync) {
        await SyncEngine.sync();
      }
      let data: Asset[];
      if (filter === 'unsynced') {
        data = await getAssets({ isSynced: false });
      } else if (filter === 'all') {
        data = await getAssets();
      } else {
        data = await getAssets({ status: filter });
      }
      if (requestIdRef.current === requestId) {
        setAssets(data);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(activeFilterRef.current, true);
    }, [load]),
  );

  const changeFilter = useCallback(
    async (f: AssetsFilter) => {
      if (f === activeFilterRef.current) return;
      activeFilterRef.current = f;
      setActiveFilter(f);
      await load(f, false);
    },
    [load],
  );

  const refresh = useCallback(() => load(activeFilterRef.current, true), [load]);

  return { assets, activeFilter, isLoading, changeFilter, refresh };
}
