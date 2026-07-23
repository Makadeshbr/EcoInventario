/**
 * Resultado padrão de uma Server Action.
 *
 * Server Actions NÃO devem lançar erros esperados (validação, conflito, etc.):
 * em produção o Next.js redige a mensagem e entrega só um digest opaco ao
 * cliente. Retornando o erro como VALOR, a mensagem real chega intacta à UI.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };
