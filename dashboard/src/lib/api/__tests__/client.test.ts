import { beforeEach, describe, expect, test, vi } from 'vitest';

import { apiFetch } from '../client';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test/api/v1';
  });

  test('envia bearer token e serializa body JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ ok: boolean }>('/stats', {
      token: 'jwt-1',
      method: 'POST',
      body: { hello: 'world' },
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/v1/stats', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer jwt-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hello: 'world' }),
      cache: 'no-store',
    });
  });

  test('propaga mensagem segura retornada pela API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Credenciais invalidas' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiFetch('/auth/login')).rejects.toThrow('Credenciais invalidas');
  });
});
