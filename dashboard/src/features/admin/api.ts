import { apiFetch } from '@/lib/api/client';
import type { UserRole } from '@/types/domain';

import {
  adminAssetTypeSchema,
  adminAssetTypesSchema,
  adminUserSchema,
  paginatedAdminUsersSchema,
} from './schemas';

export type UserListFilters = {
  role?: UserRole | string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type UpdateUserInput = {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type CreateAssetTypeInput = {
  name: string;
  description?: string;
};

export type UpdateAssetTypeInput = {
  name?: string;
  description?: string;
  isActive?: boolean;
};

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

function userUpdateBody(input: UpdateUserInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.role !== undefined ? { role: input.role } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  };
}

function assetTypeUpdateBody(input: UpdateAssetTypeInput) {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  };
}

export async function listUsers(token: string, filters: UserListFilters = {}) {
  const payload = await apiFetch<unknown>(
    `/users${toQuery({
      role: filters.role,
      is_active: filters.isActive,
      cursor: filters.cursor,
      limit: filters.limit ?? 50,
    })}`,
    { token },
  );
  return paginatedAdminUsersSchema.parse(payload);
}

export async function createUser(token: string, input: CreateUserInput) {
  const payload = await apiFetch<unknown>('/users', {
    token,
    method: 'POST',
    body: input,
  });
  return adminUserSchema.parse(payload);
}

export async function updateUser(token: string, id: string, input: UpdateUserInput) {
  const payload = await apiFetch<unknown>(`/users/${id}`, {
    token,
    method: 'PATCH',
    body: userUpdateBody(input),
  });
  return adminUserSchema.parse(payload);
}

export async function deleteUser(token: string, id: string) {
  await apiFetch<void>(`/users/${id}`, {
    token,
    method: 'DELETE',
  });
}

export async function listAssetTypesForAdmin(token: string) {
  const payload = await apiFetch<unknown>('/asset-types', { token });
  return adminAssetTypesSchema.parse(payload).data;
}

export async function createAssetType(token: string, input: CreateAssetTypeInput) {
  const payload = await apiFetch<unknown>('/asset-types', {
    token,
    method: 'POST',
    body: input,
  });
  return adminAssetTypeSchema.parse(payload);
}

export async function updateAssetType(token: string, id: string, input: UpdateAssetTypeInput) {
  const payload = await apiFetch<unknown>(`/asset-types/${id}`, {
    token,
    method: 'PATCH',
    body: assetTypeUpdateBody(input),
  });
  return adminAssetTypeSchema.parse(payload);
}
