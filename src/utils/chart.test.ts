import { describe, it, expect } from 'vitest'
import { agruparPorCategoria, gerarConfigGrafico } from './chart'
import type { Transacao } from '@/types'

describe('agruparPorCategoria', () => {
  it('deve agrupar transações por categoria e somar valores', () => {
    const transacoes: Transacao[] = [
      {
        id: '1',
        user_id: 'user1',
        valor: 100,
        data: '2026-03-15',
        tipo: 'saida',
        categoria: 'Alimentação',
        fixo: false,
        descricao: 'Supermercado',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        valor: 50,
        data: '2026-03-16',
        tipo: 'saida',
        categoria: 'Alimentação',
        fixo: false,
        descricao: 'Restaurante',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-16T10:00:00Z',
      },
      {
        id: '3',
        user_id: 'user1',
        valor: 200,
        data: '2026-03-17',
        tipo: 'saida',
        categoria: 'Transporte',
        fixo: false,
        descricao: 'Combustível',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-17T10:00:00Z',
      },
    ]

    const grupos = agruparPorCategoria(transacoes)

    expect(grupos['Alimentação']).toBe(150)
    expect(grupos['Transporte']).toBe(200)
  })

  it('deve retornar objeto vazio para lista vazia', () => {
    const grupos = agruparPorCategoria([])
    expect(Object.keys(grupos)).toHaveLength(0)
  })
})

describe('gerarConfigGrafico', () => {
  it('deve gerar configuração válida do Chart.js', () => {
    const grupos = {
      'Alimentação': 150,
      'Transporte': 200,
    }

    const config = gerarConfigGrafico(grupos, false) as any

    expect(config.type).toBe('pie')
    expect(config.data.labels).toEqual(['Alimentação', 'Transporte'])
    expect(config.data.datasets[0].data).toEqual([150, 200])
    expect(config.options.responsive).toBe(true)
  })

  it('deve ajustar cores para modo escuro', () => {
    const grupos = { 'Teste': 100 }
    const config = gerarConfigGrafico(grupos, true) as any

    expect(config.data.datasets[0].borderColor).toBe('#1e293b')
  })
})
