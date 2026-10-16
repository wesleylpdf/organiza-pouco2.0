/**
 * Validações e utilitários de erro
 */

import type { TipoTransacao, Categoria } from '@/types'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export const CATEGORIAS_VALIDAS: Categoria[] = [
  'Salário',
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Investimentos',
  'Outros',
]

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
  if (!CATEGORIAS_VALIDAS.includes(data.categoria as Categoria)) {
    throw new ValidationError('Categoria inválida')
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
 */
export function extrairMensagemErro(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message
  }
  if (error instanceof Error) {
    // Mapeia erros comuns do Supabase
    if (error.message.includes('Invalid login credentials')) {
      return 'Email ou senha incorretos'
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Email não confirmado. Verifique sua caixa de entrada'
    }
    if (error.message.includes('User already registered')) {
      return 'Este email já está cadastrado'
    }
    if (error.message.includes('Password should be at least')) {
      return 'Senha deve ter pelo menos 6 caracteres'
    }
    if (error.message.includes('rate limit')) {
      return 'Muitas tentativas. Aguarde alguns minutos'
    }
    return error.message
  }
  return 'Erro desconhecido'
}
