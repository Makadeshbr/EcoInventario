import { useMemo, useRef } from 'react';
import Supercluster from 'supercluster';
import type { Region } from 'react-native-maps';
import type { ClusterFeature, PointFeature } from 'supercluster';
import type { PublicAssetMarker } from '@/features/public/types';

export interface AssetProps {
  id: string;
  assetTypeId: string;
}

export type ClusterItem =
  | { kind: 'cluster'; id: number; count: number; lat: number; lng: number }
  | { kind: 'point'; asset: PublicAssetMarker };

function toZoom(longitudeDelta: number): number {
  return Math.max(0, Math.min(20, Math.round(Math.log2(360 / longitudeDelta))));
}

export function useMapClusters(
  assets: PublicAssetMarker[] | undefined,
  currentRegion: Region
) {
  const scRef = useRef(
    new Supercluster<AssetProps>({ radius: 40, maxZoom: 15 })
  );

  // Recarrega o índice apenas quando os assets mudam — pan/zoom não re-indexa
  const loadedAssets = useMemo(() => {
    if (!assets || assets.length === 0) return null;
    scRef.current.load(
      assets.map((a) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [a.longitude, a.latitude] as [number, number],
        },
        properties: { id: a.id, assetTypeId: a.asset_type.id },
      }))
    );
    return assets;
  }, [assets]);

  // Recalcula os clusters quando a região muda (o índice já está carregado)
  return useMemo<ClusterItem[]>(() => {
    if (!loadedAssets) return [];

    const zoom = toZoom(currentRegion.longitudeDelta);
    const bbox: [number, number, number, number] = [
      currentRegion.longitude - currentRegion.longitudeDelta / 2,
      currentRegion.latitude - currentRegion.latitudeDelta / 2,
      currentRegion.longitude + currentRegion.longitudeDelta / 2,
      currentRegion.latitude + currentRegion.latitudeDelta / 2,
    ];

    return scRef.current
      .getClusters(bbox, zoom)
      .map((f: ClusterFeature<AssetProps> | PointFeature<AssetProps>) => {
        if (f.properties.cluster) {
          const coords = (f.geometry as GeoJSON.Point).coordinates;
          return {
            kind: 'cluster',
            id: f.properties.cluster_id,
            count: f.properties.point_count,
            lat: coords[1],
            lng: coords[0],
          } as ClusterItem;
        }
        const props = f.properties as AssetProps;
        const asset = loadedAssets.find((a) => a.id === props.id)!;
        return { kind: 'point', asset } as ClusterItem;
      });
  }, [loadedAssets, currentRegion]);
}
