import { z } from 'zod';

import { assetStatusSchema } from '@/features/assets/schemas';

const userRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const manejoSchema = z
  .object({
    id: z.string().min(1),
    asset_id: z.string().min(1),
    description: z.string().min(1),
    before_media_id: z.string().nullable().optional(),
    after_media_id: z.string().nullable().optional(),
    status: assetStatusSchema,
    rejection_reason: z.string().nullable().optional(),
    created_by: userRefSchema,
    approved_by: userRefSchema.nullable().optional(),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    assetId: value.asset_id,
    description: value.description,
    beforeMediaId: value.before_media_id ?? null,
    afterMediaId: value.after_media_id ?? null,
    status: value.status,
    rejectionReason: value.rejection_reason ?? null,
    createdBy: value.created_by,
    approvedBy: value.approved_by ?? null,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }));

export type Manejo = z.infer<typeof manejoSchema>;

export const monitoramentoSchema = z
  .object({
    id: z.string().min(1),
    asset_id: z.string().min(1),
    notes: z.string().min(1),
    health_status: z.enum(['healthy', 'warning', 'critical', 'dead']),
    status: assetStatusSchema,
    rejection_reason: z.string().nullable().optional(),
    created_by: userRefSchema,
    approved_by: userRefSchema.nullable().optional(),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    assetId: value.asset_id,
    notes: value.notes,
    healthStatus: value.health_status,
    status: value.status,
    rejectionReason: value.rejection_reason ?? null,
    createdBy: value.created_by,
    approvedBy: value.approved_by ?? null,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }));

export type Monitoramento = z.infer<typeof monitoramentoSchema>;

export const paginatedManejosSchema = z.object({
  data: z.array(manejoSchema),
  pagination: z.object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});

export const paginatedMonitoramentosSchema = z.object({
  data: z.array(monitoramentoSchema),
  pagination: z.object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});
