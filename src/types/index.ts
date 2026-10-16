export type TipoTransacao = 'entrada' | 'saida'

export type Categoria =
  | 'Salário'
  | 'Alimentação'
  | 'Moradia'
  | 'Transporte'
  | 'Lazer'
  | 'Saúde'
  | 'Educação'
  | 'Investimentos'
  | 'Outros'

export interface Transacao {
  id: string
  user_id: string
  valor: number
  data: string // ISO date YYYY-MM-DD
  tipo: TipoTransacao
  categoria: Categoria
  fixo: boolean
  descricao: string | null
  ciclo_inicio: string // ISO date do início do ciclo (dia 9)
  created_at: string
}

export interface Ciclo {
  inicio: Date
  fim: Date
  offset: number
}

export interface TotaisCiclo {
  entradas: number
  saidas: number
  saldo: number
}
