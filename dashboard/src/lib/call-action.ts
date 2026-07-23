import type { ActionResult } from '@/types/action-result';

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Executa uma Server Action e devolve a mensagem de erro (ou null se deu certo).
 *
 * Tolera os dois formatos: erro retornado como valor (ActionResult) — o caminho
 * correto, que preserva a mensagem real em produção — e promise rejeitada, que
 * em produção chega redigida pelo Next e cai no fallback.
 */
export async function callAction(
  run: () => Promise<ActionResult | void>,
  fallback: string,
): Promise<string | null> {
  try {
    const result = await run();
    if (result && result.ok === false) {
      return result.error || fallback;
    }
    return null;
  } catch (err) {
    return errorMessage(err, fallback);
  }
}
