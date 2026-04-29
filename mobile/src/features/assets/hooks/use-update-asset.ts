import { useState, useCallback } from 'react';
import { generateUUID } from '@/utils/uuid';
import { updateAsset, enqueueSyncItem, getAssetById } from '../repository';

interface UpdateParams {
  assetTypeId?: string;
  assetTypeName?: string;
  notes?: string | null;
}

interface UpdateAsset {
  update: (id: string, params: UpdateParams) => Promise<void>;
  isSaving: boolean;
}

export function useUpdateAsset(): UpdateAsset {
  const [isSaving, setIsSaving] = useState(false);

  const update = useCallback(async (id: string, params: UpdateParams) => {
    setIsSaving(true);
    try {
      // Fetch base asset BEFORE updating local db to preserve the original updatedAt
      const baseAsset = await getAssetById(id);
      if (!baseAsset) throw new Error('Asset não encontrado');

      const now = new Date().toISOString();
      await updateAsset(id, { ...params, updatedAt: now });

      await enqueueSyncItem({
        id: generateUUID(),
        idempotencyKey: `update-asset-${id}-${now}`,
        action: 'UPDATE',
        entityType: 'asset',
        entityId: id,
        payload: JSON.stringify({
          id,
          asset_type_id: params.assetTypeId ?? baseAsset.assetTypeId,
          notes: params.notes ?? baseAsset.notes,
          version: baseAsset.version,
          updated_at: now,
          client_updated_at: baseAsset.updatedAt,
        }),
        createdAt: now,
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { update, isSaving };
}
