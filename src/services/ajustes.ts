import { supabase } from '@/lib/supabaseClient'
import type { AjusteSaldo } from '@/types'

/**
 * Mapeia uma linha do Supabase (snake_case) para o tipo AjusteSaldo (camelCase).
 */
function paraAjusteSaldo(row: any): AjusteSaldo {
  return {
    id: row.id,
    user_id: row.user_id,
    valor: row.valor,
    tipo: row.tipo,
    descricao: row.descricao,
    data: row.data,
    created_at: row.created_at,
  }
}

/**
 * Converte chaves camelCase (TypeScript) para snake_case (Supabase/DB).
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
 * Busca ajustes de saldo de um usuário em um intervalo de datas.
 */
export async function buscarAjustesSaldo(params: {
  userId: string
  dataInicio: string
  dataFim: string
}): Promise<AjusteSaldo[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('ajustes_saldo')
    .select('*')
    .eq('user_id', params.userId)
    .gte('data', params.dataInicio)
    .lte('data', params.dataFim)
    .order('data', { ascending: true })

  if (error) throw error
  return (data || []).map(paraAjusteSaldo)
}

/**
 * Soma os ajustes de saldo por tipo dentro de um intervalo de datas.
 */
export async function somarAjustesSaldo(params: {
  userId: string
  dataInicio: string
  dataFim: string
}): Promise<{ entradas: number; saidas: number }> {
  const ajustes = await buscarAjustesSaldo(params)

  const entradas = ajustes
    .filter((a) => a.tipo === 'entrada')
    .reduce((acc, a) => acc + Number(a.valor), 0)
  const saidas = ajustes
    .filter((a) => a.tipo === 'saida')
    .reduce((acc, a) => acc + Number(a.valor), 0)

  return { entradas, saidas }
}

/**
 * Insere um novo ajuste de saldo.
 */
export async function criarAjusteSaldo(params: {
  valor: number
  tipo: 'entrada' | 'saida'
  descricao?: string | null
  data: string
}): Promise<AjusteSaldo> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('ajustes_saldo')
    .insert(paraSnakeCase({
      user_id: user.id,
      valor: params.valor,
      tipo: params.tipo,
      descricao: params.descricao ?? null,
      data: params.data,
    }))
    .select()
    .single()

  if (error) throw error
  return paraAjusteSaldo(data)
}
