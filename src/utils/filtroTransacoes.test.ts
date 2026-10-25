import { describe, it, expect } from 'vitest'
import { filtrarTransacoes } from '@/utils/filtroTransacoes'

const transacoes = [
  { id: '1', descricao: 'Supermercado', categoria: 'Alimentação', data: '2026-10-15', valor: 150.00, tipo: 'saida', dividido: false },
  { id: '2', descricao: 'Salário', categoria: 'Trabalho', data: '2026-10-10', valor: 5000.00, tipo: 'entrada', dividido: false },
  { id: '3', descricao: 'Internet', categoria: 'Casa', data: '2026-09-20', valor: 99.90, tipo: 'saida', dividido: false },
]

describe('filtrarTransacoes', () => {
  it('deve retornar todas as transações quando busca vazia', () => {
    expect(filtrarTransacoes(transacoes, '', false)).toHaveLength(3)
  })

  it('deve buscar por descrição', () => {
    const resultado = filtrarTransacoes(transacoes, 'supermercado', false)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].descricao).toBe('Supermercado')
  })

  it('deve buscar por categoria', () => {
    const resultado = filtrarTransacoes(transacoes, 'casa', false)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].categoria).toBe('Casa')
  })

  it('deve buscar por data no formato DD/MM/AAAA', () => {
    const resultado = filtrarTransacoes(transacoes, '15/10/2026', false)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].descricao).toBe('Supermercado')
  })

  it('deve buscar por valor formatado', () => {
    const resultado = filtrarTransacoes(transacoes, '150,00', false)
    expect(resultado).toHaveLength(1)
    expect(resultado[0].descricao).toBe('Supermercado')
  })

  it('deve filtrar parcelados quando showOnlyDividido true', () => {
    const parceladas = [{ ...transacoes[0], dividido: true }]
    const resultado = filtrarTransacoes(parceladas, '', true)
    expect(resultado).toHaveLength(1)

    const naoParceladas = [{ ...transacoes[0], dividido: false }]
    const resultado2 = filtrarTransacoes(naoParceladas, '', true)
    expect(resultado2).toHaveLength(0)
  })
})
