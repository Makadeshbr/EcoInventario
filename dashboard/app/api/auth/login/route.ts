import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { apiFetch, ApiClientError } from '@/lib/api/client';
import { authCookieOptions } from '@/lib/auth/cookies';
import { AUTH_COOKIES } from '@/lib/auth/session';
import { backendLoginResponseSchema, loginRequestSchema } from '@/features/auth/schemas';

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

export async function POST(request: Request) {
  try {
    const credentials = loginRequestSchema.parse(await request.json());
    const raw = await apiFetch<unknown>('/auth/login', {
      method: 'POST',
      body: credentials,
    });
    const response = backendLoginResponseSchema.parse(raw);
    const store = await cookies();

    store.set(
      AUTH_COOKIES.accessToken,
      response.accessToken,
      authCookieOptions(response.expiresIn),
    );
    store.set(
      AUTH_COOKIES.refreshToken,
      response.refreshToken,
      authCookieOptions(REFRESH_COOKIE_MAX_AGE),
    );
    store.set(
      AUTH_COOKIES.user,
      JSON.stringify(response.user),
      authCookieOptions(REFRESH_COOKIE_MAX_AGE),
    );

    return NextResponse.json({ user: response.user });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 400 });
    }
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao entrar' }, { status: 500 });
  }
}
