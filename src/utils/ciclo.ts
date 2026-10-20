import type { Ciclo } from '@/types'

export const DIA_INICIO_PADRAO = 9
export const DIA_FIM_PADRAO = 8

/**
 * Calcula o ciclo financeiro baseado em um offset.
 * O ciclo começa no dia `diaInicio` e termina no dia `diaFim`.
 * Se diaFim < diaInicio, o ciclo cruza para o mês seguinte.
 */
export function getCicloAtual(
  offset = 0,
  diaInicio = DIA_INICIO_PADRAO,
  diaFim = DIA_FIM_PADRAO
): Ciclo {
  const agora = new Date()
  const dia = agora.getDate()
  const mes = agora.getMonth()
  const ano = agora.getFullYear()

  let cicloMes = mes
  let cicloAno = ano

  if (dia >= diaInicio) {
    cicloMes = mes
    cicloAno = ano
  } else {
    // Ainda estamos dentro do ciclo do mês anterior (ou na lacuna)
    cicloMes = mes - 1
    cicloAno = mes === 0 ? ano - 1 : ano
  }

  // Aplica offset
  const totalMeses = cicloMes + offset
  const anoCiclo = cicloAno + Math.floor(totalMeses / 12)
  const mesCiclo = ((totalMeses % 12) + 12) % 12

  const inicio = new Date(anoCiclo, mesCiclo, diaInicio)

  // Fim: se fim < inicio, cruza para o mês seguinte
  const anoFim = diaFim < diaInicio ? anoCiclo : anoCiclo
  const mesFim = diaFim < diaInicio ? mesCiclo + 1 : mesCiclo
  const fim = new Date(anoFim, mesFim, diaFim, 23, 59, 59)

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
 * Baseado no dia de início configurado.
 */
export function getCicloInicioParaData(
  data: Date,
  diaInicio = DIA_INICIO_PADRAO
): string {
  const dia = data.getDate()
  const mes = data.getMonth()
  const ano = data.getFullYear()

  let cicloMes = mes
  let cicloAno = ano

  if (dia >= diaInicio) {
    cicloMes = mes
    cicloAno = ano
  } else if (mes === 0) {
    // Janeiro: ciclo começou em dezembro do ano anterior
    cicloMes = 11
    cicloAno = ano - 1
  } else {
    cicloMes = mes - 1
    cicloAno = ano
  }

  const inicio = new Date(cicloAno, cicloMes, diaInicio)
  inicio.setHours(0, 0, 0, 0)

  return formatCicloISO(inicio)
}

/**
 * Retorna offset inicial baseado na data atual.
 * O getCicloAtual já faz o ajuste internamente, então offset é sempre 0.
 */
export function getOffsetInicial(): number {
  return 0
}

/**
 * Formata intervalo do ciclo para exibição
 */
export function formatarIntervaloCiclo(inicio: Date, fim: Date): string {
  const opt: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  return `${inicio.toLocaleDateString('pt-BR', opt)} a ${fim.toLocaleDateString('pt-BR', opt)}`
}
