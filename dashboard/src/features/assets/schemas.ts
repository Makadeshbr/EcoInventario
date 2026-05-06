import { z } from 'zod';

import type { AssetStatus } from '@/types/domain';

const userRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

const assetTypeRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const assetStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected']);

export const assetSchema = z
  .object({
    id: z.string().min(1),
    asset_type: assetTypeRefSchema,
    latitude: z.number(),
    longitude: z.number(),
    gps_accuracy_m: z.number().nullable().optional(),
    qr_code: z.string().min(1),
    status: assetStatusSchema,
    version: z.number().int().nonnegative(),
    parent_id: z.string().nullable().optional(),
    rejection_reason: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    created_by: userRefSchema,
    approved_by: userRefSchema.nullable().optional(),
    distance_m: z.number().nullable().optional(),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    assetType: value.asset_type,
    latitude: value.latitude,
    longitude: value.longitude,
    gpsAccuracyM: value.gps_accuracy_m ?? null,
    qrCode: value.qr_code,
    status: value.status as AssetStatus,
    version: value.version,
    parentId: value.parent_id ?? null,
    rejectionReason: value.rejection_reason ?? null,
    notes: value.notes ?? null,
    createdBy: value.created_by,
    approvedBy: value.approved_by ?? null,
    distanceM: value.distance_m ?? null,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }));

export type Asset = z.infer<typeof assetSchema>;

export const paginatedAssetsSchema = z.object({
  data: z.array(assetSchema),
  pagination: z.object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});

export const assetTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const assetTypesSchema = z.object({
  data: z.array(assetTypeSchema),
});

export const historyEntrySchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int(),
    status: assetStatusSchema,
    parent_id: z.string().nullable().optional(),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    version: value.version,
    status: value.status as AssetStatus,
    parentId: value.parent_id ?? null,
    createdAt: value.created_at,
  }));

export const assetHistorySchema = z.object({
  data: z.array(historyEntrySchema),
});

export const mediaSchema = z
  .object({
    id: z.string().min(1),
    asset_id: z.string().min(1),
    type: z.enum(['before', 'after', 'general']),
    mime_type: z.string().min(1),
    size_bytes: z.number().int().nonnegative(),
    upload_status: z.string().min(1),
    url: z.string().url(),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    assetId: value.asset_id,
    type: value.type,
    mimeType: value.mime_type,
    sizeBytes: value.size_bytes,
    uploadStatus: value.upload_status,
    url: value.url,
    createdAt: value.created_at,
  }));

export type AssetMedia = z.infer<typeof mediaSchema>;

export const assetMediaListSchema = z.object({
  data: z.array(mediaSchema),
});
