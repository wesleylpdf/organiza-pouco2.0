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
  categoria: string
  fixo: boolean
  descricao: string | null
  ciclo_inicio: string // ISO date do início do ciclo (dia 9)
  created_at: string
  dividido?: boolean | null
  totalParcelas?: number | null
  parcelaAtual?: number | null
  valorOriginal?: number | null
}

export interface Ciclo {
  inicio: Date
  fim: Date
  offset: number
}

export interface ConfiguracaoCiclo {
  diaInicio: number
  diaFim: number
}

export interface TotaisCiclo {
  entradas: number
  saidas: number
  saldo: number
}

export interface AjusteSaldo {
  id: string
  user_id: string
  valor: number
  tipo: 'entrada' | 'saida'
  descricao: string | null
  data: string // ISO date YYYY-MM-DD
  created_at: string
}
