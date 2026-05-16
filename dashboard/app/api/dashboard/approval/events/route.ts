import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissao para acessar aprovacoes' }, { status: 403 });
  }

  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, '')}/approval/events`;

  const upstream = await fetch(url, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Falha ao conectar eventos de aprovacao' }, { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
