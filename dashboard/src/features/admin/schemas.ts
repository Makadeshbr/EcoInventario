import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'tech', 'viewer']);

export const adminUserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
    role: roleSchema,
    is_active: z.boolean(),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    name: value.name,
    email: value.email,
    role: value.role,
    isActive: value.is_active,
    createdAt: value.created_at,
  }));

export type AdminUser = z.infer<typeof adminUserSchema>;

export const paginatedAdminUsersSchema = z.object({
  data: z.array(adminUserSchema),
  pagination: z.object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});

export const adminAssetTypeSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    is_active: z.boolean(),
  })
  .transform((value) => ({
    id: value.id,
    name: value.name,
    description: value.description ?? null,
    isActive: value.is_active,
  }));

export type AdminAssetType = z.infer<typeof adminAssetTypeSchema>;

export const adminAssetTypesSchema = z.object({
  data: z.array(adminAssetTypeSchema),
});
