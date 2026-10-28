import type { Transacao } from '@/types'

export type OrdemTransacao =
  | 'data-desc'
  | 'data-asc'
  | 'valor-desc'
  | 'valor-asc'
  | 'categoria-asc'
  | 'categoria-desc'
  | 'criado-desc'
  | 'criado-asc'

/**
 * Ordena uma lista de transações conforme a ordem escolhida pelo usuário.
 * Não muta o array original — retorna um novo array ordenado.
 */
export function ordenarTransacoes(
  transacoes: Transacao[],
  ordem: OrdemTransacao = 'data-desc'
): Transacao[] {
  return [...transacoes].sort((a, b) => {
    switch (ordem) {
      case 'data-desc':
        return new Date(b.data).getTime() - new Date(a.data).getTime()
      case 'data-asc':
        return new Date(a.data).getTime() - new Date(b.data).getTime()
      case 'valor-desc':
        return Number(b.valor) - Number(a.valor)
      case 'valor-asc':
        return Number(a.valor) - Number(b.valor)
      case 'categoria-asc':
        return String(a.categoria).localeCompare(String(b.categoria))
      case 'categoria-desc':
        return String(b.categoria).localeCompare(String(a.categoria))
      case 'criado-desc':
        return new Date(b.created_at || b.data).getTime() - new Date(a.created_at || a.data).getTime()
      case 'criado-asc':
        return new Date(a.created_at || a.data).getTime() - new Date(b.created_at || b.data).getTime()
      default:
        return new Date(b.data).getTime() - new Date(a.data).getTime()
    }
  })
}
