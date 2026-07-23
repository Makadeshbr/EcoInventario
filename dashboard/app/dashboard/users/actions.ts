'use server';

import {
  createUser,
  deleteUser,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/features/admin/api';
import { ActionRuleError, runAdminAction } from '@/lib/admin-actions';
import type { ActionResult } from '@/types/action-result';

const USERS_PATH = '/dashboard/users';

export async function createUserAction(input: CreateUserInput): Promise<ActionResult> {
  return runAdminAction(async (session) => {
    await createUser(session.accessToken, input);
  }, USERS_PATH);
}

export async function updateUserAction(
  id: string,
  input: UpdateUserInput,
): Promise<ActionResult> {
  return runAdminAction(async (session) => {
    await updateUser(session.accessToken, id, input);
  }, USERS_PATH);
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  return runAdminAction(async (session) => {
    if (id === session.user.id) {
      throw new ActionRuleError('Você não pode excluir a própria conta.');
    }
    await deleteUser(session.accessToken, id);
  }, USERS_PATH);
}
