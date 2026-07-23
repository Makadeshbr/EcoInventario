'use server';

import {
  createAssetType,
  updateAssetType,
  type CreateAssetTypeInput,
  type UpdateAssetTypeInput,
} from '@/features/admin/api';
import { runAdminAction } from '@/lib/admin-actions';
import type { ActionResult } from '@/types/action-result';

const ASSET_TYPES_PATH = '/dashboard/asset-types';

export async function createAssetTypeAction(
  input: CreateAssetTypeInput,
): Promise<ActionResult> {
  return runAdminAction(async (session) => {
    await createAssetType(session.accessToken, input);
  }, ASSET_TYPES_PATH);
}

export async function updateAssetTypeAction(
  id: string,
  input: UpdateAssetTypeInput,
): Promise<ActionResult> {
  return runAdminAction(async (session) => {
    await updateAssetType(session.accessToken, id, input);
  }, ASSET_TYPES_PATH);
}
