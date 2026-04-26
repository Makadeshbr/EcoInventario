import { api } from '@/api/client';
import { toCamelCase } from '@/api/transforms';
import type { LoginRequest, LoginResponse } from '@/types/api';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await api.post('auth/login', { json: credentials }).json<Record<string, unknown>>();
  return toCamelCase<LoginResponse>(data);
}
