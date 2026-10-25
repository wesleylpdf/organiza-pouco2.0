import type { Transacao } from '@/types'
import { formatarMoeda } from './format'

export function filtrarTransacoes(
  transacoes: Transacao[],
  search: string,
  showOnlyDividido: boolean
): Transacao[] {
  return transacoes.filter((t) => {
    if (showOnlyDividido && !t.dividido) return false
    if (!search) return true
    const [ano, mes, dia] = String(t.data).split('-')
    const dataBr = `${dia}/${mes}/${ano}`
    const valorFormatado = formatarMoeda(t.valor)
    return (
      t.descricao?.toLowerCase().includes(search) ||
      t.categoria?.toLowerCase().includes(search) ||
      dataBr.includes(search) ||
      valorFormatado.toLowerCase().includes(search)
    )
  })
}
