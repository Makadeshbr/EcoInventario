import ky from 'ky';
import { API_BASE_URL } from '@/constants/config';
import type {
  PublicAssetType,
  PublicAssetMarker,
  PublicAssetDetail,
  QRResolveResult,
} from './types';

const publicApi = ky.create({
  prefixUrl: API_BASE_URL,
  timeout: 30_000,
});

export async function getPublicAssetTypes(): Promise<PublicAssetType[]> {
  const res = await publicApi
    .get('public/asset-types')
    .json<{ data: PublicAssetType[] }>();
  return res.data;
}

export async function getPublicAssets(
  bounds: string,
  typeId?: string,
): Promise<PublicAssetMarker[]> {
  const searchParams: Record<string, string> = { bounds };
  if (typeId) searchParams.type_id = typeId;
  const res = await publicApi
    .get('public/assets', { searchParams })
    .json<{ data: PublicAssetMarker[] }>();
  return res.data;
}

export async function getPublicAsset(id: string): Promise<PublicAssetDetail> {
  return publicApi.get(`public/assets/${id}`).json<PublicAssetDetail>();
}

export async function resolveQRCode(code: string): Promise<QRResolveResult> {
  return publicApi
    .get('public/assets/resolve-qr', { searchParams: { code } })
    .json<QRResolveResult>();
}
