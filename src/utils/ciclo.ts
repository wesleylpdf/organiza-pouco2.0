import type { Ciclo } from '@/types'

/**
 * Calcula o ciclo financeiro baseado em um offset.
 * Ciclo: dia 9 do mês atual até dia 8 do próximo.
 * Se o dia atual for < 9, considera o ciclo anterior.
 */
export function getCicloAtual(offset = 0): Ciclo {
  const agora = new Date()
  const dia = agora.getDate()

  // Se dia < 9, ciclo atual é o anterior; senão, é o corrente
  const ajusteMes = dia >= 9 ? 0 : -1
  const totalMeses = agora.getMonth() + ajusteMes + offset

  // Normalizar mês/ano para casos de overflow/underflow
  const ano = agora.getFullYear() + Math.floor(totalMeses / 12)
  const mes = ((totalMeses % 12) + 12) % 12

  const inicio = new Date(ano, mes, 9)
  const fim = new Date(ano, mes + 1, 8, 23, 59, 59)

  return { inicio, fim, offset }
}

/**
 * Converte data para string ISO (YYYY-MM-DD)
 */
export function formatCicloISO(data: Date): string {
  return data.toISOString().split('T')[0]
}

/**
 * Calcula o ciclo_inicio para uma determinada data.
 * Se dia >= 9, ciclo começa dia 9 do próprio mês.
 * Se dia < 9, ciclo começou dia 9 do mês anterior.
 */
export function getCicloInicioParaData(data: Date): string {
  const dia = data.getDate()
  const inicio = new Date(data)

  if (dia < 9) {
    inicio.setMonth(inicio.getMonth() - 1)
  }
  inicio.setDate(9)
  inicio.setHours(0, 0, 0, 0)

  return formatCicloISO(inicio)
}

/**
 * Retorna offset inicial baseado na data atual.
 * Se dia atual < 9, offset = 0; senão, offset = 1.
 */
export function getOffsetInicial(): number {
  return new Date().getDate() < 9 ? 0 : 1
}

/**
 * Formata intervalo do ciclo para exibição
 */
export function formatarIntervaloCiclo(inicio: Date, fim: Date): string {
  const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  return `${inicio.toLocaleDateString('pt-BR', opt)} a ${fim.toLocaleDateString('pt-BR', opt)}`
}
