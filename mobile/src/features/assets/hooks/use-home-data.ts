import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getRecentAssets, countAssetsByStatus } from '../repository';
import type { Asset } from '@/types/domain';
import { SyncEngine } from '@/sync/sync-engine';

interface HomeData {
  recentAssets: Asset[];
  counts: Record<'draft' | 'pending' | 'approved' | 'rejected', number>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useHomeData(): HomeData {
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [counts, setCounts] = useState<Record<'draft' | 'pending' | 'approved' | 'rejected', number>>(
    { draft: 0, pending: 0, approved: 0, rejected: 0 },
  );
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      await SyncEngine.sync();
      const [assets, statusCounts] = await Promise.all([
        getRecentAssets(5),
        countAssetsByStatus(),
      ]);
      setRecentAssets(assets);
      setCounts(statusCounts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { recentAssets, counts, isLoading, refresh: load };
}
