'use server';

import { revalidatePath } from 'next/cache';

import {
  createUser,
  deleteUser,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/features/admin/api';
import { getSession } from '@/lib/auth/session';

async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function createUserAction(input: CreateUserInput) {
  const session = await requireAdminSession();
  await createUser(session.accessToken, input);
  revalidatePath('/dashboard/users');
}

export async function updateUserAction(id: string, input: UpdateUserInput) {
  const session = await requireAdminSession();
  await updateUser(session.accessToken, id, input);
  revalidatePath('/dashboard/users');
}

export async function deleteUserAction(id: string) {
  const session = await requireAdminSession();
  if (id === session.user.id) {
    throw new Error('SELF_DELETE_BLOCKED');
  }

  await deleteUser(session.accessToken, id);
  revalidatePath('/dashboard/users');
}
