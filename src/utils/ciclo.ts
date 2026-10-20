import type { Ciclo } from '@/types'

export const DIA_INICIO_PADRAO = 9
export const DIA_FIM_PADRAO = 8

/** Último dia do mês (1-12). */
function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate()
}

/**
 * Cria uma data no mês/ano indicados limitando o dia ao último dia do mês.
 * Sem o limite, `new Date(2024, 1, 31)` viraria 2 de março.
 */
function criarDataNoMes(ano: number, mes: number, dia: number, horas = 0, minutos = 0): Date {
  return new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)), horas, minutos)
}

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

  // Em meses mais curtos que diaInicio (ex.: 31 em fevereiro), o ciclo
  // começa no último dia do mês.
  const diaInicioEfetivo = Math.min(diaInicio, ultimoDiaDoMes(ano, mes))

  if (dia >= diaInicioEfetivo) {
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

  const inicio = criarDataNoMes(anoCiclo, mesCiclo, diaInicio)

  // Fim: se fim < inicio, cruza para o mês seguinte.
  // Normaliza mês negativo/overflow via Date (ex.: mesCiclo = -1 → dezembro anterior).
  const mesFimRef = new Date(anoCiclo, diaFim < diaInicio ? mesCiclo + 1 : mesCiclo, 1)
  const fim = criarDataNoMes(
    mesFimRef.getFullYear(),
    mesFimRef.getMonth(),
    diaFim,
    23,
    59
  )

  return { inicio, fim, offset }
}

/**
 * Converte data para string ISO (YYYY-MM-DD) usando o fuso horário local.
 * Evita problemas de fuso quando a data tem hora próxima da meia-noite UTC.
 */
export function formatDateLocalISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
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

  const diaInicioEfetivo = Math.min(diaInicio, ultimoDiaDoMes(ano, mes))

  if (dia >= diaInicioEfetivo) {
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

  const mesRef = new Date(cicloAno, cicloMes, 1)
  const inicio = criarDataNoMes(mesRef.getFullYear(), mesRef.getMonth(), diaInicio)

  return formatDateLocalISO(inicio)
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
