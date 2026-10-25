import { somarAjustesSaldo, buscarAjustesSaldo } from './ajustes'
import type { AjusteSaldo } from '@/types'

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

const mockAjuste: AjusteSaldo = {
  id: 'aj-1',
  user_id: 'user-1',
  valor: 100,
  tipo: 'entrada',
  descricao: 'Ajuste teste',
  data: '2024-01-15',
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

describe('buscarAjustesSaldo', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(
      buscarAjustesSaldo({ userId: 'user-1', dataInicio: '2024-01-01', dataFim: '2024-01-31' })
    ).rejects.toThrow('Usuário não autenticado')
  })

  it('deve buscar ajustes com filtros corretos', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: [mockAjuste], error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await buscarAjustesSaldo({
      userId: 'user-1',
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })

    expect(supabase.from).toHaveBeenCalledWith('ajustes_saldo')
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockQuery.gte).toHaveBeenCalledWith('data', '2024-01-01')
    expect(mockQuery.lte).toHaveBeenCalledWith('data', '2024-01-31')
    expect(result).toEqual([mockAjuste])
  })

  it('deve lançar erro se Supabase retornar erro', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: null, error: { message: 'DB error' } })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await expect(
      buscarAjustesSaldo({ userId: 'user-1', dataInicio: '2024-01-01', dataFim: '2024-01-31' })
    ).rejects.toThrow('DB error')
  })
})

describe('somarAjustesSaldo', () => {
  it('deve somar entradas e saidas separadamente', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({
      data: [
        { ...mockAjuste, tipo: 'entrada', valor: '100' },
        { ...mockAjuste, id: 'aj-2', tipo: 'saida', valor: '30' },
      ],
      error: null,
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await somarAjustesSaldo({
      userId: 'user-1',
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })

    expect(result.entradas).toBe(100)
    expect(result.saidas).toBe(30)
  })

  it('deve retornar zeros quando não há ajustes', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: [], error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await somarAjustesSaldo({
      userId: 'user-1',
      dataInicio: '2024-01-01',
      dataFim: '2024-01-31',
    })

    expect(result.entradas).toBe(0)
    expect(result.saidas).toBe(0)
  })
})
