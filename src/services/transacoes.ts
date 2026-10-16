import { supabase } from '@/lib/supabaseClient'
import type { Transacao, TipoTransacao, Categoria } from '@/types'
import { getCicloInicioParaData, formatCicloISO } from '@/utils/ciclo'

/**
 * Lista transações de um ciclo específico
 */
export async function listarTransacoes(cicloInicio: string): Promise<Transacao[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('user_id', user.id)
    .eq('ciclo_inicio', cicloInicio)
    .order('data', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Cria nova transação
 */
export async function criarTransacao(params: {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: Categoria
  fixo: boolean
  descricao: string | null
}): Promise<Transacao> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const cicloInicio = getCicloInicioParaData(new Date(params.data + 'T00:00:00'))

  const { data, error } = await supabase
    .from('transacoes')
    .insert({
      user_id: user.id,
      valor: params.valor,
      data: params.data,
      tipo: params.tipo,
      categoria: params.categoria,
      fixo: params.fixo,
      descricao: params.descricao,
      ciclo_inicio: cicloInicio,
    })
    .select()
    .single()

  if (error) throw error
  return data
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
    params.ciclo_inicio = getCicloInicioParaData(new Date(params.data + 'T00:00:00'))
  }

  const { data, error } = await supabase
    .from('transacoes')
    .update(params)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
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
