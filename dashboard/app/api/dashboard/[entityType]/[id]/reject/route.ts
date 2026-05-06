import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiFetch, ApiClientError } from '@/lib/api/client';
import { getSession } from '@/lib/auth/session';

const ENTITY_PATHS: Record<string, string> = {
  asset: 'assets',
  manejo: 'manejos',
  monitoramento: 'monitoramentos',
};

const rejectSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityType: string; id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissao para rejeitar' }, { status: 403 });
  }

  const { entityType, id } = await params;
  const path = ENTITY_PATHS[entityType];
  if (!path) {
    return NextResponse.json({ error: 'Tipo de entidade invalido' }, { status: 400 });
  }

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe o motivo da rejeicao' }, { status: 400 });
  }

  try {
    const result = await apiFetch(`/${path}/${id}/reject`, {
      token: session.accessToken,
      method: 'POST',
      body: { reason: parsed.data.reason },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Falha ao rejeitar' }, { status: 500 });
  }
}
