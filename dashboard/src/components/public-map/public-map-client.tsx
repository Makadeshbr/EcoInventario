'use client';

import dynamic from 'next/dynamic';

import type { PublicAssetType } from '@/features/public-map/schemas';

const PublicAssetsMap = dynamic(
  () => import('./public-assets-map').then((mod) => mod.PublicAssetsMap),
  { ssr: false },
);

export function PublicMapClient({ assetTypes }: { assetTypes: PublicAssetType[] }) {
  return <PublicAssetsMap assetTypes={assetTypes} />;
}
