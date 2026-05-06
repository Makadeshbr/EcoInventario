import { z } from 'zod';

export const auditLogSchema = z
  .object({
    id: z.string().min(1),
    entity_type: z.string().min(1),
    entity_id: z.string().min(1),
    action: z.string().min(1),
    performed_by: z.object({
      id: z.string().min(1),
      name: z.string(),
    }),
    changes: z.unknown().optional(),
    metadata: z.unknown().optional(),
    created_at: z.string().min(1),
  })
  .transform((value) => ({
    id: value.id,
    entityType: value.entity_type,
    entityId: value.entity_id,
    action: value.action,
    performedBy: value.performed_by,
    changes: value.changes,
    metadata: value.metadata,
    createdAt: value.created_at,
  }));

export type AuditLog = z.infer<typeof auditLogSchema>;

export const paginatedAuditLogsSchema = z.object({
  data: z.array(auditLogSchema),
  pagination: z.object({
    next_cursor: z.string().nullable(),
    has_more: z.boolean(),
  }),
});
