import { NextResponse } from 'next/server';

import { apiFetch, ApiClientError } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';

const ENTITY_PATHS: Record<string, string> = {
  asset: 'assets',
  manejo: 'manejos',
  monitoramento: 'monitoramentos',
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissao para aprovar' }, { status: 403 });
  }

  const { entityType, id } = await params;
  const path = ENTITY_PATHS[entityType];
  if (!path) {
    return NextResponse.json({ error: 'Tipo de entidade invalido' }, { status: 400 });
  }

  try {
    const result = await apiFetch(`/${path}/${id}/approve`, {
      token: session.accessToken,
      method: 'POST',
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao aprovar' }, { status: 500 });
  }
}
