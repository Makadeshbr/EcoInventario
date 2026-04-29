import { useState, useCallback } from 'react';
import { generateUUID } from '@/utils/uuid';
import { compressImage } from '@/utils/image-compression';
import { insertManejo, insertMedia, enqueueSyncItem, enqueueMediaUpload } from '../repository';
import { createManejoSchema } from '../schemas';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/domain';

export interface SaveManejoParams {
  assetId: string;
  description: string;
  beforePhotoUri?: string;
  afterPhotoUri?: string;
}

export function useCreateManejo() {
  const user = useAuthStore((s) => s.user);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (params: SaveManejoParams): Promise<string> => {
      if (!user) throw new Error('Usuário não autenticado');

      const validation = createManejoSchema.safeParse({
        description: params.description,
        beforePhotoUri: params.beforePhotoUri,
        afterPhotoUri: params.afterPhotoUri,
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      setIsSaving(true);
      try {
        const now = new Date().toISOString();
        const manejoId = generateUUID();

        let beforeMediaId: string | null = null;
        let afterMediaId: string | null = null;

        if (params.beforePhotoUri) {
          beforeMediaId = generateUUID();
          await processPhoto(params.beforePhotoUri, params.assetId, beforeMediaId, 'before', user, now);
        }

        if (params.afterPhotoUri) {
          afterMediaId = generateUUID();
          await processPhoto(params.afterPhotoUri, params.assetId, afterMediaId, 'after', user, now);
        }

        await insertManejo({
          id: manejoId,
          organizationId: user.organizationId,
          assetId: params.assetId,
          description: params.description,
          beforeMediaId,
          afterMediaId,
          createdBy: user.id,
          createdAt: now,
        });

        await enqueueSyncItem({
          id: generateUUID(),
          idempotencyKey: `create-manejo-${manejoId}`,
          action: 'CREATE',
          entityType: 'manejo',
          entityId: manejoId,
          payload: JSON.stringify({
            id: manejoId,
            organization_id: user.organizationId,
            asset_id: params.assetId,
            description: params.description,
            before_media_id: beforeMediaId,
            after_media_id: afterMediaId,
            status: 'draft',
            created_by: user.id,
            updated_at: now,
          }),
          createdAt: now,
        });

        return manejoId;
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  return { save, isSaving };
}

async function processPhoto(
  uri: string,
  assetId: string,
  mediaId: string,
  type: 'before' | 'after',
  user: User,
  now: string,
): Promise<void> {
  const compressed = await compressImage(uri);
  let sizeBytes = 1;
  try {
    const blob = await fetch(compressed.uri).then((r) => r.blob());
    sizeBytes = Math.max(blob.size, 1);
  } catch (error) {
    console.warn('[useCreateManejo] Não foi possível calcular tamanho da foto local', error);
  }

  await insertMedia({
    id: mediaId,
    organizationId: user.organizationId,
    assetId,
    localFilePath: compressed.uri,
    mimeType: 'image/jpeg',
    sizeBytes,
    type,
    createdBy: user.id,
    createdAt: now,
  });

  await enqueueMediaUpload({
    id: generateUUID(),
    idempotencyKey: generateUUID(),
    mediaId,
    localFilePath: compressed.uri,
    assetId,
    mediaType: type,
    mimeType: 'image/jpeg',
    sizeBytes,
    createdAt: now,
  });
}
