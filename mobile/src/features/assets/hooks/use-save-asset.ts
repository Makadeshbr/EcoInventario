import { useState, useCallback } from 'react';
import { generateUUID } from '@/utils/uuid';
import { compressImage } from '@/utils/image-compression';
import { insertAsset, insertMedia, enqueueSyncItem, enqueueMediaUpload } from '../repository';
import { createAssetSchema } from '../schemas';
import { useAuthStore } from '@/stores/auth-store';
import type { User } from '@/types/domain';

export interface SaveAssetParams {
  assetTypeId: string;
  assetTypeName: string;
  latitude: number;
  longitude: number;
  gpsAccuracyM: number | null;
  notes: string | null;
  photoUris: string[];
}

interface SaveAsset {
  save: (params: SaveAssetParams) => Promise<string>;
  isSaving: boolean;
}

// Comprime, calcula tamanho e persiste cada foto na fila de upload.
async function processPhotos(
  uris: string[],
  assetId: string,
  user: User,
  now: string,
): Promise<void> {
  for (const uri of uris) {
    const compressed = await compressImage(uri);
    let sizeBytes = 1;
    try {
      const blob = await fetch(compressed.uri).then((r) => r.blob());
      sizeBytes = Math.max(blob.size, 1);
    } catch (error) {
      console.warn('[useSaveAsset] Não foi possível calcular tamanho da foto local', error);
    }
    const mediaId = generateUUID();

    await insertMedia({
      id: mediaId,
      organizationId: user.organizationId,
      assetId,
      localFilePath: compressed.uri,
      mimeType: 'image/jpeg',
      sizeBytes,
      type: 'general',
      createdBy: user.id,
      createdAt: now,
    });

    await enqueueMediaUpload({
      id: generateUUID(),
      idempotencyKey: generateUUID(),
      mediaId,
      localFilePath: compressed.uri,
      assetId,
      mediaType: 'general',
      mimeType: 'image/jpeg',
      sizeBytes,
      createdAt: now,
    });
  }
}

export function useSaveAsset(): SaveAsset {
  const user = useAuthStore((s) => s.user);
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (params: SaveAssetParams): Promise<string> => {
      if (!user) throw new Error('Usuário não autenticado');

      const validation = createAssetSchema.safeParse({
        assetTypeId: params.assetTypeId,
        latitude: params.latitude,
        longitude: params.longitude,
        gpsAccuracyM: params.gpsAccuracyM ?? undefined,
        notes: params.notes ?? undefined,
      });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      setIsSaving(true);
      try {
        const now = new Date().toISOString();
        const assetId = generateUUID();
        const qrCode = generateUUID();

        await insertAsset({
          id: assetId,
          organizationId: user.organizationId,
          assetTypeId: params.assetTypeId,
          assetTypeName: params.assetTypeName,
          latitude: params.latitude,
          longitude: params.longitude,
          gpsAccuracyM: params.gpsAccuracyM,
          qrCode,
          notes: params.notes,
          createdBy: user.id,
          createdAt: now,
        });

        await enqueueSyncItem({
          id: generateUUID(),
          idempotencyKey: `create-asset-${assetId}`,
          action: 'CREATE',
          entityType: 'asset',
          entityId: assetId,
          payload: JSON.stringify({
            id: assetId,
            organization_id: user.organizationId,
            asset_type_id: params.assetTypeId,
            asset_type_name: params.assetTypeName,
            latitude: params.latitude,
            longitude: params.longitude,
            gps_accuracy_m: params.gpsAccuracyM,
            qr_code: qrCode,
            status: 'draft',
            notes: params.notes,
            created_by: user.id,
            updated_at: now,
          }),
          createdAt: now,
        });

        await processPhotos(params.photoUris, assetId, user, now);

        return assetId;
      } finally {
        setIsSaving(false);
      }
    },
    [user],
  );

  return { save, isSaving };
}
