import { describe, it, expect } from 'vitest'
import { formatarMoeda, formatarData, sanitizarHTML } from './format'

describe('formatarMoeda', () => {
  it('deve formatar valor monetário em BRL', () => {
    const resultado = formatarMoeda(1500.50)
    // Remove non-breaking spaces for comparison
    const normalized = resultado.replace(/\u00A0/g, ' ')
    expect(normalized).toBe('R$ 1.500,50')

    expect(formatarMoeda(0).replace(/\u00A0/g, ' ')).toBe('R$ 0,00')
    expect(formatarMoeda(99.9).replace(/\u00A0/g, ' ')).toBe('R$ 99,90')
  })

  it('deve lidar com valores negativos', () => {
    const resultado = formatarMoeda(-100)
    const normalized = resultado.replace(/\u00A0/g, ' ')
    expect(normalized).toBe('-R$ 100,00')
  })
})

describe('formatarData', () => {
  it('deve converter data ISO para formato pt-BR', () => {
    expect(formatarData('2026-03-15')).toBe('15/03/2026')
    expect(formatarData('2025-12-31')).toBe('31/12/2025')
  })
})

describe('sanitizarHTML', () => {
  it('deve escapar tags HTML', () => {
    expect(sanitizarHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    )
  })

  it('deve escapar caracteres especiais', () => {
    expect(sanitizarHTML('<div class="test">')).toBe(
      '&lt;div class="test"&gt;'
    )
  })

  it('deve preservar texto normal', () => {
    expect(sanitizarHTML('Descrição simples')).toBe('Descrição simples')
  })
})
