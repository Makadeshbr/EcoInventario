import { z } from 'zod';

const publicAssetTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export type PublicAssetType = z.infer<typeof publicAssetTypeSchema>;

export const publicAssetTypesSchema = z.object({
  data: z.array(publicAssetTypeSchema),
});

export const publicAssetSummarySchema = z
  .object({
    id: z.string().min(1),
    asset_type: publicAssetTypeSchema,
    latitude: z.number(),
    longitude: z.number(),
    qr_code: z.string().min(1),
    thumbnail_url: z.string().url().nullable(),
  })
  .transform((value) => ({
    id: value.id,
    assetType: value.asset_type,
    latitude: value.latitude,
    longitude: value.longitude,
    qrCode: value.qr_code,
    thumbnailUrl: value.thumbnail_url,
  }));

export type PublicAssetSummary = z.infer<typeof publicAssetSummarySchema>;

export const publicAssetsSchema = z.object({
  data: z.array(publicAssetSummarySchema),
});

const publicMediaSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    url: z.string().url(),
  })
  .transform((value) => ({
    id: value.id,
    type: value.type,
    url: value.url,
  }));

const publicManejoSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    before_media_url: z.string().url().nullable(),
    after_media_url: z.string().url().nullable(),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    description: value.description,
    beforeMediaUrl: value.before_media_url,
    afterMediaUrl: value.after_media_url,
    createdAt: value.created_at,
  }));

const publicMonitoramentoSchema = z
  .object({
    id: z.string().min(1),
    notes: z.string().min(1),
    health_status: z.enum(['healthy', 'warning', 'critical', 'dead']),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    notes: value.notes,
    healthStatus: value.health_status,
    createdAt: value.created_at,
  }));

export const publicAssetDetailsSchema = z
  .object({
    id: z.string().min(1),
    asset_type: publicAssetTypeSchema,
    latitude: z.number(),
    longitude: z.number(),
    qr_code: z.string().min(1),
    organization_name: z.string().min(1),
    media: z.array(publicMediaSchema),
    manejos: z.array(publicManejoSchema),
    monitoramentos: z.array(publicMonitoramentoSchema),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    assetType: value.asset_type,
    latitude: value.latitude,
    longitude: value.longitude,
    qrCode: value.qr_code,
    organizationName: value.organization_name,
    media: value.media,
    manejos: value.manejos,
    monitoramentos: value.monitoramentos,
    createdAt: value.created_at,
  }));

export type PublicAssetDetailsData = z.infer<typeof publicAssetDetailsSchema>;
