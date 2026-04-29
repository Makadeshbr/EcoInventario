import { useQuery } from '@tanstack/react-query';
import {
  getPublicAssetTypes,
  getPublicAssets,
  getPublicAsset,
  resolveQRCode,
} from './api';

const STALE_5MIN = 5 * 60 * 1_000;

export const publicKeys = {
  assetTypes: ['public', 'asset-types'] as const,
  assets: (bounds: string, typeId?: string) =>
    ['public', 'assets', bounds, typeId ?? null] as const,
  asset: (id: string) => ['public', 'asset', id] as const,
  resolveQR: (code: string) => ['public', 'resolve-qr', code] as const,
};

export function usePublicAssetTypes() {
  return useQuery({
    queryKey: publicKeys.assetTypes,
    queryFn: getPublicAssetTypes,
    staleTime: STALE_5MIN,
  });
}

export function usePublicAssets(bounds: string | null, typeId?: string) {
  return useQuery({
    queryKey: publicKeys.assets(bounds ?? '', typeId),
    queryFn: () => getPublicAssets(bounds!, typeId),
    enabled: !!bounds,
    staleTime: STALE_5MIN,
  });
}

export function usePublicAsset(id: string) {
  return useQuery({
    queryKey: publicKeys.asset(id),
    queryFn: () => getPublicAsset(id),
    staleTime: STALE_5MIN,
  });
}

export function useResolveQR(code: string | null) {
  return useQuery({
    queryKey: publicKeys.resolveQR(code ?? ''),
    queryFn: () => resolveQRCode(code!),
    enabled: !!code,
    retry: 1,
  });
}
