import { listarTransacoes } from './transacoes'
import type { Transacao } from '@/types'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabaseClient'

const mockUser = { id: 'user-1' }

const mockTransacao: Transacao = {
  id: 'tx-1',
  user_id: 'user-1',
  valor: 100,
  data: '2024-01-15',
  tipo: 'entrada',
  categoria: 'Salário',
  fixo: false,
  descricao: 'Pagamento mensal',
  ciclo_inicio: '2024-01-01',
  created_at: '2024-01-15T10:00:00Z',
}

function criarMockQuery(retorno: any = { data: [], error: null }) {
  const mockQuery: any = {
    data: retorno.data,
    error: retorno.error,
  }
  mockQuery.select = vi.fn(() => mockQuery)
  mockQuery.eq = vi.fn(() => mockQuery)
  mockQuery.gte = vi.fn(() => mockQuery)
  mockQuery.lte = vi.fn(() => mockQuery)
  mockQuery.order = vi.fn(() => mockQuery)
  return mockQuery
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listarTransacoes', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(listarTransacoes({})).rejects.toThrow('Usuário não autenticado')
  })

  it('deve listar transações por ciclo início', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: [mockTransacao], error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await listarTransacoes({ cicloInicio: '2024-01-01' })

    expect(supabase.from).toHaveBeenCalledWith('transacoes')
    expect(mockQuery.eq).toHaveBeenCalledWith('ciclo_inicio', '2024-01-01')
    expect(result).toEqual([mockTransacao])
  })

  it('deve listar transações por intervalo de datas', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: [], error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await listarTransacoes({ dataInicio: '2024-01-01', dataFim: '2024-01-31' })

    expect(mockQuery.gte).toHaveBeenCalledWith('data', '2024-01-01')
    expect(mockQuery.lte).toHaveBeenCalledWith('data', '2024-01-31')
  })

  it('deve lançar erro se Supabase retornar erro', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: null, error: { message: 'DB error' } })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await expect(listarTransacoes({ cicloInicio: '2024-01-01' })).rejects.toThrow(
      'DB error'
    )
  })
})
