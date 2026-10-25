import { listarCategorias, criarCategoria, atualizarCategoria, excluirCategoria } from './categorias'
import type { CategoriaPersonalizada } from './categorias'

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

const mockCategoria: CategoriaPersonalizada = {
  id: 'cat-1',
  user_id: 'user-1',
  nome: 'Alimentação',
  icone: '🍔',
  cor: '#ff0000',
  created_at: '2024-01-01T00:00:00Z',
}

function criarMockQuery(retorno: any = { data: [], error: null }) {
  const mockQuery: any = {
    data: retorno.data,
    error: retorno.error,
  }
  mockQuery.select = vi.fn(() => mockQuery)
  mockQuery.eq = vi.fn(() => mockQuery)
  mockQuery.order = vi.fn(() => mockQuery)
  mockQuery.insert = vi.fn(() => mockQuery)
  mockQuery.single = vi.fn().mockResolvedValue(retorno)
  mockQuery.update = vi.fn(() => mockQuery)
  mockQuery.delete = vi.fn(() => mockQuery)
  mockQuery.limit = vi.fn(() => mockQuery)
  mockQuery.maybeSingle = vi.fn().mockResolvedValue(retorno)
  mockQuery.upsert = vi.fn().mockResolvedValue({ error: null })
  return mockQuery
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listarCategorias', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(listarCategorias()).rejects.toThrow('Usuário não autenticado')
  })

  it('deve listar categorias ordenadas por nome', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: [mockCategoria], error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await listarCategorias()

    expect(supabase.from).toHaveBeenCalledWith('categorias')
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mockQuery.order).toHaveBeenCalledWith('nome')
    expect(result).toEqual([mockCategoria])
  })
})

describe('criarCategoria', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(
      criarCategoria({ nome: 'Transporte' })
    ).rejects.toThrow('Usuário não autenticado')
  })

  it('deve criar categoria com sucesso', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({ data: mockCategoria, error: null })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await criarCategoria({
      nome: 'Alimentação',
      icone: '🍔',
      cor: '#ff0000',
    })

    expect(supabase.from).toHaveBeenCalledWith('categorias')
    expect(mockQuery.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      nome: 'Alimentação',
      icone: '🍔',
      cor: '#ff0000',
    })
    expect(result).toEqual(mockCategoria)
  })

  it('deve lançar erro de duplicata (23505)', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    await expect(criarCategoria({ nome: 'Alimentação' })).rejects.toThrow(
      'Já existe uma categoria com este nome'
    )
  })
})

describe('atualizarCategoria', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(
      atualizarCategoria('cat-1', { nome: 'Novo Nome' })
    ).rejects.toThrow('Usuário não autenticado')
  })

  it('deve atualizar categoria com sucesso', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({
      data: { ...mockCategoria, nome: 'Novo Nome' },
      error: null,
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await atualizarCategoria('cat-1', { nome: 'Novo Nome' })

    expect(supabase.from).toHaveBeenCalledWith('categorias')
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'cat-1')
    expect(result.nome).toBe('Novo Nome')
  })
})

describe('excluirCategoria', () => {
  it('deve lançar erro se usuário não autenticado', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(excluirCategoria('cat-1')).rejects.toThrow('Usuário não autenticado')
  })

  it('deve excluir categoria com sucesso', async () => {
    ;(supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    const mockQuery = criarMockQuery({
      data: { nome: 'Alimentação' },
      error: null,
    })
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(mockQuery)

    const result = await excluirCategoria('cat-1')

    expect(result).toBeUndefined()
    expect(mockQuery.select).toHaveBeenCalledWith('nome')
    expect(mockQuery.eq).toHaveBeenCalledWith('id', 'cat-1')
  })
})
