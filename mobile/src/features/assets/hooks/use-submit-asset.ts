import { useState, useCallback } from 'react';
import { generateUUID } from '@/utils/uuid';
import { updateAsset, enqueueSyncItem } from '../repository';

interface SubmitAsset {
  submit: (assetId: string, currentVersion: number, currentUpdatedAt: string) => Promise<void>;
  isSubmitting: boolean;
}

export function useSubmitAsset(): SubmitAsset {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (assetId: string, currentVersion: number, currentUpdatedAt: string) => {
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      await updateAsset(assetId, { status: 'pending', updatedAt: now });
      await enqueueSyncItem({
        id: generateUUID(),
        idempotencyKey: `submit-asset-${assetId}-${currentVersion}`,
        action: 'UPDATE',
        entityType: 'asset',
        entityId: assetId,
        payload: JSON.stringify({
          id: assetId,
          status: 'pending',
          version: currentVersion,
          client_updated_at: currentUpdatedAt,
          updated_at: now,
        }),
        createdAt: now,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting };
}
