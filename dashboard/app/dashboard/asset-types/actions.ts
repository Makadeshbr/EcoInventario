'use server';

import { revalidatePath } from 'next/cache';

import {
  createAssetType,
  updateAssetType,
  type CreateAssetTypeInput,
  type UpdateAssetTypeInput,
} from '@/features/admin/api';
import { getSession } from '@/lib/auth/session';

async function requireAdminToken() {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session.accessToken;
}

export async function createAssetTypeAction(input: CreateAssetTypeInput) {
  const token = await requireAdminToken();
  await createAssetType(token, input);
  revalidatePath('/dashboard/asset-types');
}

export async function updateAssetTypeAction(id: string, input: UpdateAssetTypeInput) {
  const token = await requireAdminToken();
  await updateAssetType(token, id, input);
  revalidatePath('/dashboard/asset-types');
}
