import { api } from '@/api/client';
import { LOGIN_TIMEOUT_MS } from '@/constants/config';
import { toCamelCase } from '@/api/transforms';
import type { LoginRequest, LoginResponse } from '@/types/api';

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const data = await api
    .post('auth/login', { json: credentials, timeout: LOGIN_TIMEOUT_MS })
    .json<Record<string, unknown>>();
  return toCamelCase<LoginResponse>(data);
}
