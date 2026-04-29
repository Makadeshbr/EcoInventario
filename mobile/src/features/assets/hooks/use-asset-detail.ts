import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAssetById, getMediaForAsset } from '../repository';
import type { Asset, Media } from '@/types/domain';

interface AssetDetail {
  asset: Asset | null;
  media: Media[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useAssetDetail(id: string): AssetDetail {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assetData, mediaData] = await Promise.all([
        getAssetById(id),
        getMediaForAsset(id),
      ]);
      setAsset(assetData);
      setMedia(mediaData);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { asset, media, isLoading, refresh: load };
}
