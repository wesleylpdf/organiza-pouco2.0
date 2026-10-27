/**
 * Executa uma função assíncrona com retry automático em caso de falha de rede.
 *
 * Retenta apenas erros de rede (falhas transitórias), não erros de validação
 * ou regra de negócio retornados pelo Supabase (ex.: código de erro SQL,
 * violação de RLS, email já cadastrado).
 *
 * @param fn      Função assíncrona a ser executada
 * @param opts    tentativas (padrão 3) e atrasoInicial em ms (padrão 500, dobra a cada tentativa)
 * @returns       Resultado da função
 * @throws        Último erro se todas as tentativas falharem
 */
export async function comRetry<T>(
  fn: () => T | Promise<T>,
  opts: { tentativas?: number; atrasoInicial?: number } = {}
): Promise<T> {
  const tentativas = opts.tentativas ?? 3
  let atraso = opts.atrasoInicial ?? 500
  let ultimoErro: unknown

  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn()
    } catch (error) {
      ultimoErro = error

      // Última tentativa: não re-tenta
      if (i === tentativas - 1) break

      // Não re-tenta erros de negócio/validação do Supabase (código de erro conhecido)
      const codigoErro =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: unknown }).code
          : undefined
      if (typeof codigoErro === 'string' && codigoErro.length > 0) {
        throw error
      }

      await new Promise((resolve) => setTimeout(resolve, atraso))
      atraso *= 2 // backoff exponencial
    }
  }

  throw ultimoErro
}
