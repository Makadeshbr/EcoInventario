import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { apiFetch } from '@/lib/api/client';
import { AUTH_COOKIES } from '@/lib/auth/session';

export async function POST() {
  const store = await cookies();
  const accessToken = store.get(AUTH_COOKIES.accessToken)?.value;
  const refreshToken = store.get(AUTH_COOKIES.refreshToken)?.value;

  if (accessToken && refreshToken) {
    await apiFetch('/auth/logout', {
      token: accessToken,
      method: 'POST',
      body: { refresh_token: refreshToken },
    }).catch(() => undefined);
  }

  store.delete(AUTH_COOKIES.accessToken);
  store.delete(AUTH_COOKIES.refreshToken);
  store.delete(AUTH_COOKIES.user);

  return new NextResponse(null, { status: 204 });
}
