import { appStore } from './AppState'
import type { Transacao } from '@/types'

describe('AppState', () => {
  let transacao: Transacao

  beforeEach(() => {
    appStore.reset()
    transacao = {
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
  })

  describe('Transações', () => {
    it('deve retornar transações vazias inicialmente', () => {
      expect(appStore.getTransacoes()).toEqual([])
    })

    it('deve setar e obter transações', () => {
      appStore.setTransacoes([transacao])
      expect(appStore.getTransacoes()).toEqual([transacao])
    })

    it('deve substituir transações existentes', () => {
      appStore.setTransacoes([transacao])
      const outra: Transacao = { ...transacao, id: 'tx-2', valor: 200 }
      appStore.setTransacoes([outra])
      expect(appStore.getTransacoes()).toEqual([outra])
    })
  })

  describe('Cache de transações por ciclo', () => {
    it('deve retornar null para chave inexistente', () => {
      expect(appStore.getTransacoesPorCiclo('ciclo-2024-01')).toBeNull()
    })

    it('deve setar e obter transações por ciclo', () => {
      appStore.setTransacoesPorCiclo('ciclo-2024-01', [transacao])
      expect(appStore.getTransacoesPorCiclo('ciclo-2024-01')).toEqual([transacao])
    })

    it('deve limpar cache de uma chave específica', () => {
      appStore.setTransacoesPorCiclo('ciclo-a', [transacao])
      appStore.setTransacoesPorCiclo('ciclo-b', [transacao])
      appStore.limparCacheCiclo('ciclo-a')
      expect(appStore.getTransacoesPorCiclo('ciclo-a')).toBeNull()
      expect(appStore.getTransacoesPorCiclo('ciclo-b')).toEqual([transacao])
    })

    it('deve limpar todo o cache quando chamada sem chave', () => {
      appStore.setTransacoesPorCiclo('ciclo-a', [transacao])
      appStore.limparCacheCiclo()
      expect(appStore.getTransacoesPorCiclo('ciclo-a')).toBeNull()
    })

    it('deve limpar todo o cache quando chave não existe', () => {
      appStore.setTransacoesPorCiclo('ciclo-a', [transacao])
      appStore.limparCacheCiclo('ciclo-inexistente')
      expect(appStore.getTransacoesPorCiclo('ciclo-a')).toBeNull()
    })
  })

  describe('Categorias', () => {
    const categoria = {
      id: 'cat-1',
      user_id: 'user-1',
      nome: 'Alimentação',
      icone: '🍔',
      cor: '#ff0000',
      created_at: '2024-01-01T00:00:00Z',
    }

    it('deve retornar categorias vazias inicialmente', () => {
      expect(appStore.getCategorias()).toEqual([])
    })

    it('deve setar e obter categorias', () => {
      appStore.setCategorias([categoria])
      expect(appStore.getCategorias()).toEqual([categoria])
    })
  })

  describe('Ciclo', () => {
    it('deve ter valores padrão de ciclo', () => {
      expect(appStore.getDiaInicioCiclo()).toBe(9)
      expect(appStore.getDiaFimCiclo()).toBe(8)
    })

    it('deve setar e obter configuração de ciclo', () => {
      appStore.setConfiguracaoCiclo(5, 20)
      expect(appStore.getDiaInicioCiclo()).toBe(5)
      expect(appStore.getDiaFimCiclo()).toBe(20)
    })

    it('deve setar e obter cycleOffset', () => {
      appStore.setCycleOffset(0)
      expect(appStore.getState().cycleOffset).toBe(0)
      appStore.setCycleOffset(2)
      expect(appStore.getState().cycleOffset).toBe(2)
    })

    it('deve obter ciclo atual com offset padrão', () => {
      const ciclo = appStore.getCicloAtual()
      expect(ciclo).toHaveProperty('inicio')
      expect(ciclo).toHaveProperty('fim')
    })

    it('deve obter ciclo início em ISO', () => {
      const iso = appStore.getCicloInicioISO()
      expect(typeof iso).toBe('string')
    })
  })

  describe('Edição', () => {
    it('deve ter editandoId nulo inicialmente', () => {
      expect(appStore.getEditandoId()).toBeNull()
    })

    it('deve setar e obter editandoId', () => {
      appStore.setEditandoId('tx-1')
      expect(appStore.getEditandoId()).toBe('tx-1')
      appStore.setEditandoId(null)
      expect(appStore.getEditandoId()).toBeNull()
    })
  })

  describe('Loading', () => {
    it('deve não estar carregando inicialmente', () => {
      expect(appStore.isLoading()).toBe(false)
    })

    it('deve setar e obter loading por chave', () => {
      appStore.setLoading('transacoes', true)
      expect(appStore.isLoading('transacoes')).toBe(true)
      expect(appStore.isLoading()).toBe(true)
      appStore.setLoading('transacoes', false)
      expect(appStore.isLoading('transacoes')).toBe(false)
      expect(appStore.isLoading()).toBe(false)
    })

    it('deve retornar true se qualquer loading estiver ativo', () => {
      appStore.setLoading('salvando', true)
      expect(appStore.isLoading()).toBe(true)
      appStore.setLoading('salvando', false)
      expect(appStore.isLoading()).toBe(false)
    })
  })

  describe('Error', () => {
    it('deve ter error nulo inicialmente', () => {
      expect(appStore.getError()).toBeNull()
    })

    it('deve setar e obter error', () => {
      appStore.setError('Erro de teste')
      expect(appStore.getError()).toBe('Erro de teste')
    })

    it('deve limpar error com clearError', () => {
      appStore.setError('Erro de teste')
      appStore.clearError()
      expect(appStore.getError()).toBeNull()
    })
  })

  describe('Reset', () => {
    it('deve restaurar estado inicial', () => {
      appStore.setTransacoes([transacao])
      appStore.setConfiguracaoCiclo(5, 20)
      appStore.setCycleOffset(3)
      appStore.setError('Erro')
      appStore.setLoading('transacoes', true)
      appStore.reset()

      expect(appStore.getTransacoes()).toEqual([])
      expect(appStore.getDiaInicioCiclo()).toBe(9)
      expect(appStore.getDiaFimCiclo()).toBe(8)
      expect(appStore.getState().cycleOffset).toBe(0)
      expect(appStore.getError()).toBeNull()
      expect(appStore.isLoading()).toBe(false)
      expect(appStore.getEditandoId()).toBeNull()
      expect(appStore.getState().transacoesPorCiclo).toEqual({})
    })
  })

  describe('Subscribe', () => {
    it('deve notificar listeners ao mudar estado', () => {
      const listener = vi.fn()
      const unsubscribe = appStore.subscribe(listener)
      appStore.setTransacoes([transacao])
      expect(listener).toHaveBeenCalled()

      unsubscribe()
      appStore.setTransacoes([transacao])
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
