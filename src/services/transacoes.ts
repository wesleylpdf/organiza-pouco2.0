import { supabase } from '@/lib/supabaseClient'
import { appStore } from '@/stores/AppState'
import type { Transacao, TipoTransacao } from '@/types'
import { getCicloInicioParaData, formatCicloISO } from '@/utils/ciclo'

/**
 * Converte chaves camelCase (TypeScript) para snake_case (Supabase/DB).
 * Ignora chaves já em snake_case ou com valores undefined/null.
 */
function paraSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

/**
 * Mapeia uma linha do Supabase (snake_case) para o tipo Transacao (camelCase).
 * Os campos total_parcelas / parcela_atual do DB viram totalParcelas / parcelaAtual.
 */
function paraTransacao(row: any): Transacao {
  return {
    id: row.id,
    user_id: row.user_id,
    valor: row.valor,
    data: row.data,
    tipo: row.tipo,
    categoria: row.categoria,
    fixo: row.fixo,
    descricao: row.descricao,
    ciclo_inicio: row.ciclo_inicio,
    created_at: row.created_at,
    dividido: row.dividido,
    totalParcelas: row.total_parcelas,
    parcelaAtual: row.parcela_atual,
  }
}

/**
 * Lista transações de um ciclo específico.
 * Aceita cicloInicio (comportamento antigo, filtra por ciclo_inicio)
 * ou dataInicio + dataFim (filtra por período de datas).
 */
export async function listarTransacoes(params: {
  cicloInicio?: string
  dataInicio?: string
  dataFim?: string
}): Promise<Transacao[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  let query = supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data', { ascending: false })

  if (params.dataInicio && params.dataFim) {
    query = query.gte('data', params.dataInicio).lte('data', params.dataFim)
  } else if (params.cicloInicio) {
    query = query.eq('ciclo_inicio', params.cicloInicio)
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(paraTransacao)
}

/**
 * Cria nova transação
 */
export async function criarTransacao(params: {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: string
  descricao: string | null
  dividido?: boolean
  totalParcelas?: number
  parcelaAtual?: number
}): Promise<Transacao> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const cicloInicio = getCicloInicioParaData(
    new Date(params.data + 'T00:00:00'),
    appStore.getDiaInicioCiclo()
  )

  // Remove sufixo de parcelamento ( N/M) da descrição antes de salvar
  const descricaoLimpa = (params.descricao || '').replace(/\s+\d+\/\d+$/, '')

  const { data, error } = await supabase
    .from('transacoes')
    .insert(paraSnakeCase({
      user_id: user.id,
      valor: params.valor,
      data: params.data,
      tipo: params.tipo,
      categoria: params.categoria,
      descricao: descricaoLimpa,
      ciclo_inicio: cicloInicio,
      dividido: params.dividido ?? false,
      totalParcelas: params.totalParcelas ?? null,
      parcelaAtual: params.parcelaAtual ?? null,
    }))
    .select()
    .single()

  if (error) throw error
  return paraTransacao(data)
}

/**
 * Atualiza transação existente
 */
export async function atualizarTransacao(
  id: string,
  params: Partial<Omit<Transacao, 'id' | 'user_id' | 'created_at'>>
): Promise<Transacao> {
  // Se mudou a data, recalcula ciclo_inicio
  if (params.data) {
    params.ciclo_inicio = getCicloInicioParaData(
      new Date(params.data + 'T00:00:00'),
      appStore.getDiaInicioCiclo()
    )
  }

  const { data, error } = await supabase
    .from('transacoes')
    .update(paraSnakeCase(params))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return paraTransacao(data)
}

/**
 * Exclui transação
 */
export async function excluirTransacao(id: string): Promise<void> {
  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Lista parcelas relacionadas de uma transação dividida.
 * Busca transações divididas do mesmo usuário com total_parcelas igual
 * e filtra por descrição base (antes do sufixo " N/M").
 */
export async function listarParcelasRelacionadas(params: {
  userId: string
  totalParcelas: number
  descricaoBase: string
}): Promise<Transacao[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', params.userId)
    .eq('dividido', true)
    .eq('total_parcelas', params.totalParcelas)
    .order('data', { ascending: true })

  if (error) throw error

  const prefixo = params.descricaoBase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Aceita tanto a descrição pura (sem sufixo) quanto o formato antigo com " N/M"
  const regex = new RegExp(`^${prefixo}(\\s+\\d+/\\d+)?$`)
  return (data || []).map(paraTransacao).filter(tx => regex.test(tx.descricao || ''))
}

/**
 * Atualiza parcelas relacionadas de uma transação dividida (update em lote).
 * Não recalcula ciclo_inicio por data (parcelas estão em meses diferentes).
 */
export async function atualizarParcelasRelacionadas(
  ids: string[],
  params: Partial<Omit<Transacao, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('transacoes')
    .update(paraSnakeCase(params))
    .in('id', ids)

  if (error) throw error
}

/**
 * Exclui parcelas relacionadas de uma transação dividida (delete em lote).
 */
export async function excluirParcelasRelacionadas(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const { error } = await supabase
    .from('transacoes')
    .delete()
    .in('id', ids)

  if (error) throw error
}

/**
 * Duplica transações fixas do ciclo anterior para o ciclo atual
 */
export async function duplicarFixosCicloAnterior(cicloAtualInicio: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Calcula ciclo anterior
  const [ano, mes, dia] = cicloAtualInicio.split('-').map(Number)
  const inicioAtual = new Date(ano, mes - 1, dia)
  const inicioAnterior = new Date(inicioAtual)
  inicioAnterior.setMonth(inicioAnterior.getMonth() - 1)
  const cicloAnterior = formatCicloISO(inicioAnterior)

  // Busca fixos do ciclo anterior
  const { data: fixos, error: errorFetch } = await supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', user.id)
    .eq('ciclo_inicio', cicloAnterior)
    .eq('fixo', true)

  if (errorFetch) throw errorFetch
  if (!fixos || fixos.length === 0) return 0

  // Duplica para ciclo atual com novas datas (+1 mês)
  const novasTransacoes = fixos.map(f => {
    const dataOriginal = new Date(f.data + 'T00:00:00')
    const novaData = new Date(dataOriginal)
    novaData.setMonth(novaData.getMonth() + 1)

    return {
      user_id: user.id,
      valor: f.valor,
      data: formatCicloISO(novaData),
      tipo: f.tipo,
      categoria: f.categoria,
      fixo: true,
      descricao: f.descricao,
      ciclo_inicio: cicloAtualInicio,
    }
  })

  const { error: errorInsert } = await supabase
    .from('transacoes')
    .insert(novasTransacoes)

  if (errorInsert) throw errorInsert
  return novasTransacoes.length
}
