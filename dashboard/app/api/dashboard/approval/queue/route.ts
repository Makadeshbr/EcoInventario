import { NextResponse } from 'next/server';

import { listApprovalQueue } from '@/features/approval/api';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissao para acessar aprovacoes' }, { status: 403 });
  }

  try {
    return NextResponse.json(await listApprovalQueue(session.accessToken));
  } catch {
    return NextResponse.json({ error: 'Falha ao carregar fila de aprovacao' }, { status: 500 });
  }
}
