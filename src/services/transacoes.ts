import { supabase } from '@/lib/supabaseClient'
import { appStore } from '@/stores/AppState'
import type { Transacao, TipoTransacao } from '@/types'
import { getCicloInicioParaData } from '@/utils/ciclo'
import { comRetry } from '@/utils/retry'

/**
 * Converte chaves camelCase (TypeScript) para snake_case (Supabase/DB).
 * Ignora apenas chaves undefined; null é enviado para limpar a coluna.
 */
function paraSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

/**
 * Mapeia uma linha do Supabase (snake_case) para o tipo Transacao (camelCase).
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
    valorOriginal: row.valor_original,
    ...(row.grupo_parcela_id !== undefined ? { grupoParcelaId: row.grupo_parcela_id } : {}),
    ...(row.pago !== undefined ? { pago: row.pago } : {}),
  }
}

/**
 * Lista transações de um ciclo específico.
 * Aceita cicloInicio (filtra por ciclo_inicio) ou dataInicio + dataFim.
 */
export async function listarTransacoes(params: {
  cicloInicio?: string
  dataInicio?: string
  dataFim?: string
  fixo?: boolean
}): Promise<Transacao[]> {
  const { data: { user } } = await comRetry(() => supabase.auth.getUser())
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

  if (params.fixo !== undefined) {
    query = query.eq('fixo', params.fixo)
  }

  const { data, error } = await comRetry(() => query)

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
  valorOriginal?: number | null
  grupoParcelaId?: string | null
  fixo?: boolean
}): Promise<Transacao> {
  const { data: { user } } = await comRetry(() => supabase.auth.getUser())
  if (!user) throw new Error('Usuário não autenticado')

  const cicloInicio = getCicloInicioParaData(
    new Date(params.data + 'T00:00:00'),
    appStore.getDiaInicioCiclo()
  )

  // Remove sufixo de parcelamento ( N/M) da descrição antes de salvar
  const descricaoLimpa = (params.descricao || '').replace(/\s+\d+\/\d+$/, '')

  const payload = paraSnakeCase({
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
    valorOriginal: params.valorOriginal ?? null,
    grupoParcelaId: params.grupoParcelaId,
    fixo: params.fixo ?? false,
  })

  const { data, error } = await comRetry(() => supabase
    .from('transacoes')
    .insert(payload)
    .select()
    .single())

  if (error) throw error
  return paraTransacao(data)
}

/**
 * Cria múltiplas transações em lote em uma única requisição ao Supabase
 */
export async function criarTransacoesEmLote(
  itens: Array<Parameters<typeof criarTransacao>[0]>
): Promise<Transacao[]> {
  if (itens.length === 0) return []

  const { data: { user } } = await comRetry(() => supabase.auth.getUser())
  if (!user) throw new Error('Usuário não autenticado')

  const diaInicioCiclo = appStore.getDiaInicioCiclo()

  const rows = itens.map((params) => {
    const cicloInicio = getCicloInicioParaData(
      new Date(params.data + 'T00:00:00'),
      diaInicioCiclo
    )
    const descricaoLimpa = (params.descricao || '').replace(/\s+\d+\/\d+$/, '')

    return paraSnakeCase({
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
      valorOriginal: params.valorOriginal ?? null,
      grupoParcelaId: params.grupoParcelaId,
      fixo: params.fixo ?? false,
    })
  })

  const { data, error } = await comRetry(() => supabase
    .from('transacoes')
    .insert(rows)
    .select())

  if (error) throw error
  return (data || []).map(paraTransacao)
}

/**
 * Atualiza transação existente
 */
export async function atualizarTransacao(
  id: string,
  params: Partial<Omit<Transacao, 'id' | 'user_id' | 'created_at'>>
): Promise<Transacao> {
  if (params.data) {
    params.ciclo_inicio = getCicloInicioParaData(
      new Date(params.data + 'T00:00:00'),
      appStore.getDiaInicioCiclo()
    )
  }

  const { data, error } = await comRetry(() => supabase
    .from('transacoes')
    .update(paraSnakeCase(params))
    .eq('id', id)
    .select()
    .single())

  if (error) throw error
  return paraTransacao(data)
}

/**
 * Exclui transação
 */
export async function excluirTransacao(id: string): Promise<void> {
  const { error } = await comRetry(() => supabase
    .from('transacoes')
    .delete()
    .eq('id', id))

  if (error) throw error
}

/**
 * Lista parcelas relacionadas de uma transação dividida.
 * Usa `grupo_parcela_id` quando disponível, mantendo fallback por descrição e total_parcelas
 * para parcelas antigas criadas antes da coluna existir.
 */
export async function listarParcelasRelacionadas(params: {
  userId: string
  totalParcelas: number
  descricaoBase: string
  grupoParcelaId?: string | null
}): Promise<Transacao[]> {
  const { data: { user } } = await comRetry(() => supabase.auth.getUser())
  if (!user) throw new Error('Usuário não autenticado')

  if (params.grupoParcelaId) {
    const { data, error } = await comRetry(() => supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', params.userId)
      .eq('grupo_parcela_id', params.grupoParcelaId!)
      .order('data', { ascending: true }))

    if (!error && data && data.length > 0) {
      return data.map(paraTransacao)
    }
  }

  const { data, error } = await comRetry(() => supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', params.userId)
    .eq('dividido', true)
    .eq('total_parcelas', params.totalParcelas)
    .order('data', { ascending: true }))

  if (error) throw error

  const prefixo = params.descricaoBase.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${prefixo}(\\s+\\d+/\\d+)?$`)
  return (data || []).map(paraTransacao).filter(tx => regex.test(tx.descricao || ''))
}

/**
 * Atualiza parcelas relacionadas em lote (sem recalcular ciclo_inicio).
 */
export async function atualizarParcelasRelacionadas(
  ids: string[],
  params: Partial<Omit<Transacao, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  if (ids.length === 0) return

  const { error } = await comRetry(() => supabase
    .from('transacoes')
    .update(paraSnakeCase(params))
    .in('id', ids))

  if (error) throw error
}

/**
 * Exclui parcelas relacionadas em lote.
 */
export async function excluirParcelasRelacionadas(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const { error } = await comRetry(() => supabase
    .from('transacoes')
    .delete()
    .in('id', ids))

  if (error) throw error
}


/**
 * Atualiza o status de pago/pendente de uma transação
 */
export async function atualizarStatusPago(id: string, pago: boolean): Promise<void> {
  const { data: { user } } = await comRetry(() => supabase.auth.getUser())
  if (!user) throw new Error('Usuário não autenticado')

  const { error } = await comRetry(() =>
    supabase
      .from('transacoes')
      .update({ pago })
      .eq('id', id)
      .eq('user_id', user.id)
  )

  if (error && !String(error.message || '').includes('pago')) {
    throw error
  }
}
