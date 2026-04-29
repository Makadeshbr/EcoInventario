import { useState, useCallback } from 'react';
import { generateUUID } from '@/utils/uuid';
import { insertMonitoramento, enqueueSyncItem } from '../repository';
import { createMonitoramentoSchema } from '../schemas';
import { useAuthStore } from '@/stores/auth-store';

export interface SaveMonitoramentoParams {
  assetId: string;
  notes: string;
  healthStatus: string;
}

export function useCreateMonitoramento() {
  const user = useAuthStore((s) => s.user);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (params: SaveMonitoramentoParams): Promise<string> => {
      if (!user) throw new Error('Usuário não autenticado');

      const validation = createMonitoramentoSchema.safeParse({
        notes: params.notes,
        healthStatus: params.healthStatus,
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      setIsSaving(true);
      try {
        const now = new Date().toISOString();
        const monitoramentoId = generateUUID();

        await insertMonitoramento({
          id: monitoramentoId,
          organizationId: user.organizationId,
          assetId: params.assetId,
          notes: params.notes,
          healthStatus: params.healthStatus,
          createdBy: user.id,
          createdAt: now,
        });

        await enqueueSyncItem({
          id: generateUUID(),
          idempotencyKey: `create-monitoramento-${monitoramentoId}`,
          action: 'CREATE',
          entityType: 'monitoramento',
          entityId: monitoramentoId,
          payload: JSON.stringify({
            id: monitoramentoId,
            organization_id: user.organizationId,
            asset_id: params.assetId,
            notes: params.notes,
            health_status: params.healthStatus,
            status: 'draft',
            created_by: user.id,
            updated_at: now,
          }),
          createdAt: now,
        });

        return monitoramentoId;
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  return { save, isSaving };
}
