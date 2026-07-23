import { revalidatePath } from 'next/cache';

import { ApiClientError } from '@/lib/api/client';
import { getSession, type Session } from '@/lib/auth/session';
import type { ActionResult } from '@/types/action-result';

/** Erro de regra de negócio da própria action (não veio da API). */
export class ActionRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionRuleError';
  }
}

/**
 * Executa uma operação administrativa com sessão validada, convertendo
 * qualquer falha em um ActionResult. Nunca propaga exceção para o cliente —
 * assim a mensagem real da API chega à UI em vez do digest opaco do Next.
 */
export async function runAdminAction(
  fn: (session: Session) => Promise<void>,
  revalidate: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return { ok: false, error: 'Acesso negado. Faça login como administrador.' };
  }

  try {
    await fn(session);
  } catch (error) {
    if (error instanceof ApiClientError || error instanceof ActionRuleError) {
      return { ok: false, error: error.message };
    }
    // Erro inesperado: detalhe fica no log do servidor, usuário vê mensagem segura.
    console.error('[admin-action] falha inesperada:', error);
    return { ok: false, error: 'Ocorreu um erro inesperado. Tente novamente.' };
  }

  revalidatePath(revalidate);
  return { ok: true };
}
