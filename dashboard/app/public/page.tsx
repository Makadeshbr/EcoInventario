import { PublicMapClient } from '@/components/public-map/public-map-client';
import { listPublicAssetTypes } from '@/features/public-map/api';

export const revalidate = 300;

export default async function PublicMapPage() {
  const assetTypes = await listPublicAssetTypes().catch(() => []);

  return <PublicMapClient assetTypes={assetTypes} />;
}
