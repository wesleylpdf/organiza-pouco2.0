import { buscarConfiguracaoCiclo, salvarConfiguracaoCiclo } from './configuracoes'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabaseClient'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buscarConfiguracaoCiclo', () => {
  it('deve retornar configuração encontrada', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { dia_inicio_ciclo: 5, dia_fim_ciclo: 20 },
        error: null,
      }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await buscarConfiguracaoCiclo('user-1')

    expect(supabase.from).toHaveBeenCalledWith('configuracoes_usuario')
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(result).toEqual({ dia_inicio_ciclo: 5, dia_fim_ciclo: 20 })
  })

  it('deve retornar null quando não há configuração', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await buscarConfiguracaoCiclo('user-1')
    expect(result).toBeNull()
  })

  it('deve lançar erro se Supabase retornar erro', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await expect(buscarConfiguracaoCiclo('user-1')).rejects.toThrow('DB error')
  })
})

describe('salvarConfiguracaoCiclo', () => {
  it('deve salvar configuração com sucesso', async () => {
    const mockQuery = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await salvarConfiguracaoCiclo(5, 20, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('configuracoes_usuario')
    expect(mockQuery.upsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      dia_inicio_ciclo: 5,
      dia_fim_ciclo: 20,
    })
  })

  it('deve lançar erro se Supabase retornar erro', async () => {
    const mockQuery = {
      upsert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    }
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await expect(salvarConfiguracaoCiclo(5, 20, 'user-1')).rejects.toThrow('DB error')
  })
})
