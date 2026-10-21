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
 * Início do ciclo no mês informado, limitando o dia ao último dia do mês.
 */
function inicioNoMes(ano: number, mes: number, diaInicio: number): Date {
  return criarDataNoMes(ano, mes, diaInicio)
}

/**
 * Início do ciclo que contém a data informada.
 * Em meses mais curtos que `diaInicio`, o início efetivo é o último dia do mês.
 */
function inicioDoCicloDaData(data: Date, diaInicio: number): Date {
  const mesRef = new Date(data.getFullYear(), data.getMonth(), 1)
  const inicioMes = inicioNoMes(mesRef.getFullYear(), mesRef.getMonth(), diaInicio)

  if (data.getTime() >= inicioMes.getTime()) return inicioMes

  const anterior = new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1)
  return inicioNoMes(anterior.getFullYear(), anterior.getMonth(), diaInicio)
}

/**
 * Calcula o ciclo financeiro baseado em um offset.
 *
 * O ciclo começa no dia `diaInicio` e termina no dia `diaFim`, respeitando a
 * escolha do usuário. Com o fim padrão (dia anterior ao próximo início) os
 * ciclos ficam contíguos, sem lacunas.
 */
export function getCicloAtual(
  offset = 0,
  diaInicio = DIA_INICIO_PADRAO,
  diaFim = DIA_FIM_PADRAO
): Ciclo {
  const base = inicioDoCicloDaData(new Date(), diaInicio)

  // Normaliza mês/ano via Date (ex.: janeiro - 1 → dezembro do ano anterior)
  const ref = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const inicio = inicioNoMes(ref.getFullYear(), ref.getMonth(), diaInicio)

  const proxRef = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1)
  const proximoInicio = inicioNoMes(proxRef.getFullYear(), proxRef.getMonth(), diaInicio)

  return { inicio, fim: fimDoCiclo(inicio, diaInicio, diaFim, proximoInicio), offset }
}

/**
 * Fim do ciclo: no dia `diaFim` do mês do início quando ele vem depois do
 * início (ex.: 1 → 31) ou do mês seguinte quando vem antes (ex.: 9 → 8).
 * Nunca passa do dia anterior ao próximo início, para não sobrepor ciclos.
 */
function fimDoCiclo(
  inicio: Date,
  diaInicio: number,
  diaFim: number,
  proximoInicio: Date
): Date {
  const mesFim = inicio.getMonth() + (diaFim < diaInicio ? 1 : 0)
  const fim = criarDataNoMes(inicio.getFullYear(), mesFim, diaFim, 23, 59)

  const limite = new Date(proximoInicio)
  limite.setDate(limite.getDate() - 1)
  limite.setHours(23, 59, 0, 0)

  return fim.getTime() > limite.getTime() ? limite : fim
}

/**
 * Quantos dias ficam fora de qualquer ciclo com a configuração informada.
 * Zero quando o fim é o dia anterior ao próximo início.
 */
export function diasForaDoCiclo(diaInicio: number, diaFim: number): number {
  const ciclo = getCicloAtual(0, diaInicio, diaFim)
  const proximo = getCicloAtual(1, diaInicio, diaFim)
  const MS_POR_DIA = 24 * 60 * 60 * 1000
  const dias = Math.round((proximo.inicio.getTime() - ciclo.fim.getTime()) / MS_POR_DIA) - 1
  return Math.max(0, dias)
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
 * Converte data para string ISO (YYYY-MM-DD) no fuso local.
 */
export function formatCicloISO(data: Date): string {
  return formatDateLocalISO(data)
}

/**
 * Calcula o ciclo_inicio para uma determinada data.
 * Baseado no dia de início configurado.
 */
export function getCicloInicioParaData(
  data: Date,
  diaInicio = DIA_INICIO_PADRAO
): string {
  return formatDateLocalISO(inicioDoCicloDaData(data, diaInicio))
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
