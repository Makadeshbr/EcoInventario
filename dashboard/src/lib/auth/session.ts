import { cookies } from 'next/headers';
import { z } from 'zod';

import type { User } from '@/types/domain';

export const AUTH_COOKIES = {
  accessToken: 'eco_access_token',
  refreshToken: 'eco_refresh_token',
  user: 'eco_user',
} as const;

const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'tech', 'viewer']),
  organizationId: z.string().min(1),
});

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export function decodeUserCookie(raw: string | undefined): User | null {
  if (!raw) {
    return null;
  }
  try {
    return userSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = store.get(AUTH_COOKIES.refreshToken)?.value;
  const user = decodeUserCookie(store.get(AUTH_COOKIES.user)?.value);

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return { accessToken, refreshToken, user };
}
