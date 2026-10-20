/**
 * Validações e utilitários de erro
 */

import type { TipoTransacao } from '@/types'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const TIPOS_VALIDOS: TipoTransacao[] = ['entrada', 'saida']

/**
 * Valida dados de transação
 */
export function validarTransacao(data: {
  valor: number
  data: string
  tipo: string
  categoria: string
  descricao: string
}): void {
  // Valor
  if (typeof data.valor !== 'number' || isNaN(data.valor)) {
    throw new ValidationError('Valor deve ser um número válido')
  }
  if (data.valor <= 0) {
    throw new ValidationError('Valor deve ser maior que zero')
  }
  if (data.valor > 999999999999.99) {
    throw new ValidationError('Valor muito alto')
  }

  // Data
  if (!data.data || typeof data.data !== 'string') {
    throw new ValidationError('Data é obrigatória')
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(data.data)) {
    throw new ValidationError('Data deve estar no formato YYYY-MM-DD')
  }
  const dateObj = new Date(data.data + 'T00:00:00')
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError('Data inválida')
  }

  // Tipo
  if (!TIPOS_VALIDOS.includes(data.tipo as TipoTransacao)) {
    throw new ValidationError('Tipo deve ser "entrada" ou "saida"')
  }

  // Categoria
  if (!data.categoria || typeof data.categoria !== 'string') {
    throw new ValidationError('Categoria é obrigatória')
  }
  if (data.categoria.length > 50) {
    throw new ValidationError('Categoria deve ter no máximo 50 caracteres')
  }

  // Descrição
  if (typeof data.descricao !== 'string') {
    throw new ValidationError('Descrição deve ser texto')
  }
  if (data.descricao.length > 100) {
    throw new ValidationError('Descrição deve ter no máximo 100 caracteres')
  }
}

/**
 * Extrai mensagem de erro amigável
 * Suporta instâncias de Error e objetos plain (ex.: erros do Supabase)
 */
export function extrairMensagemErro(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }

  // Obtém a mensagem de instâncias de Error ou objetos plain
  const mensagem =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : null

  if (mensagem) {
    // Mapeia erros comuns do Supabase
    if (mensagem.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos'
    }
    if (mensagem.includes('Email not confirmed')) {
      return 'Email não confirmado. Verifique sua caixa de entrada'
    }
    if (mensagem.includes('User already registered')) {
      return 'Este email já está cadastrado'
    }
    if (mensagem.includes('Password should be at least')) {
      return 'Senha deve ter pelo menos 6 caracteres'
    }
    if (mensagem.includes('rate limit')) {
      return 'Muitas tentativas. Aguarde alguns minutos'
    }
    return mensagem
  }

  // Tenta extrair de outros campos comuns do Supabase (details, hint, error)
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>
    for (const campo of ['details', 'hint', 'error', 'message']) {
      const valor = obj[campo]
      if (typeof valor === 'string' && valor.trim()) {
        return valor
      }
    }
  }

  return 'Erro desconhecido'
}
