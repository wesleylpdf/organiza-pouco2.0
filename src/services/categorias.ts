import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'

export interface CategoriaPersonalizada {
  id: string
  user_id: string
  nome: string
  icone: string | null
  cor: string | null
  created_at: string
}

export interface CriarCategoriaParams {
  nome: string
  icone?: string
  cor?: string
}

/**
 * Lista todas as categorias do usuário
 */
export async function listarCategorias(): Promise<CategoriaPersonalizada[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('user_id', user.id)
    .order('nome')

  if (error) throw error
  return data || []
}

/**
 * Cria nova categoria
 */
export async function criarCategoria(params: CriarCategoriaParams): Promise<CategoriaPersonalizada> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('categorias')
    .insert({
      user_id: user.id,
      nome: params.nome,
      icone: params.icone || null,
      cor: params.cor || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe uma categoria com este nome')
    }
    throw new Error(error.message || 'Erro ao criar categoria')
  }

  // Fallback: se data for null (problema de RLS/timing), busca manualmente
  if (!data) {
    const { data: categoriaCriada } = await supabase
      .from('categorias')
      .select('*')
      .eq('user_id', user.id)
      .eq('nome', params.nome)
      .single()

    if (categoriaCriada) {
      return categoriaCriada
    }

    throw new Error('Categoria criada mas não foi possível recuperá-la')
  }

  return data
}

/**
 * Atualiza categoria existente
 */
export async function atualizarCategoria(
  id: string,
  params: Partial<CriarCategoriaParams>
): Promise<CategoriaPersonalizada> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Busca nome antigo para atualizar transações se necessário
  let nomeAntigo: string | null = null
  if (params.nome !== undefined) {
    const { data: categoriaAtual } = await supabase
      .from('categorias')
      .select('nome')
      .eq('id', id)
      .single()
    if (categoriaAtual) {
      nomeAntigo = categoriaAtual.nome
    }
  }

  // Remove campos undefined para evitar problemas no Supabase
  const updateParams: Record<string, string | null> = {}
  if (params.nome !== undefined) updateParams.nome = params.nome
  if (params.icone !== undefined) updateParams.icone = params.icone || null
  if (params.cor !== undefined) updateParams.cor = params.cor || null

  const { data, error } = await supabase
    .from('categorias')
    .update(updateParams)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe uma categoria com este nome')
    }
    throw error
  }

  // Se o nome mudou, atualiza todas as transações relacionadas
  if (nomeAntigo && params.nome && nomeAntigo !== params.nome) {
    const { error: errorUpdateTransacoes } = await supabase
      .from('transacoes')
      .update({ categoria: params.nome })
      .eq('user_id', user.id)
      .eq('categoria', nomeAntigo)

    if (errorUpdateTransacoes) {
      logger.error('Erro ao atualizar transações:', errorUpdateTransacoes)
      // Não lança erro para não falhar toda a operação
    }
  }

  if (!data) {
    // Fallback: busca manualmente se o select retornar null (problema de RLS/timing)
    const { data: categoriaAtualizada } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .single()

    if (categoriaAtualizada) return categoriaAtualizada
    throw new Error('Categoria atualizada mas não foi possível recuperá-la')
  }

  return data
}

/**
 * Exclui categoria (só funciona se não houver transações relacionadas)
 */
export async function excluirCategoria(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Busca o nome da categoria antes de excluir
  const { data: categoria, error: errorCategoria } = await supabase
    .from('categorias')
    .select('nome')
    .eq('id', id)
    .single()

  if (errorCategoria || !categoria) throw new Error('Categoria não encontrada')

  // Verifica se há transações usando esta categoria (por nome)
  const { data: transacoes, error: errorCheck } = await supabase
    .from('transacoes')
    .select('id')
    .eq('user_id', user.id)
    .eq('categoria', categoria.nome)
    .limit(1)

  if (errorCheck) throw errorCheck

  if (transacoes && transacoes.length > 0) {
    throw new Error('Não é possível excluir: existem transações usando esta categoria')
  }

  const { error } = await supabase
    .from('categorias')
    .delete()
    .eq('id', id)

  if (error) throw error
}
