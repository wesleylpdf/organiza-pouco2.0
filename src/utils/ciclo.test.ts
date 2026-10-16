import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCicloAtual, getCicloInicioParaData, formatarIntervaloCiclo } from './ciclo'

describe('getCicloAtual', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deve retornar ciclo atual quando dia >= 9', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))

    const ciclo = getCicloAtual(0)

    expect(ciclo.inicio.getDate()).toBe(9)
    expect(ciclo.inicio.getMonth()).toBe(2) // Março
    expect(ciclo.fim.getDate()).toBe(8)
    expect(ciclo.fim.getMonth()).toBe(3) // Abril
  })

  it('deve retornar ciclo anterior quando dia < 9', () => {
    vi.setSystemTime(new Date('2026-03-05T12:00:00'))

    const ciclo = getCicloAtual(0)

    expect(ciclo.inicio.getDate()).toBe(9)
    expect(ciclo.inicio.getMonth()).toBe(1) // Fevereiro
  })

  it('deve avançar ciclo com offset positivo', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))

    const ciclo = getCicloAtual(1)

    expect(ciclo.inicio.getMonth()).toBe(3) // Abril
  })

  it('deve retroceder ciclo com offset negativo', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))

    const ciclo = getCicloAtual(-1)

    expect(ciclo.inicio.getMonth()).toBe(1) // Fevereiro
  })
})

describe('getCicloInicioParaData', () => {
  it('deve retornar dia 9 do próprio mês se dia >= 9', () => {
    const data = new Date('2026-03-15T00:00:00')
    const cicloInicio = getCicloInicioParaData(data)

    expect(cicloInicio).toBe('2026-03-09')
  })

  it('deve retornar dia 9 do mês anterior se dia < 9', () => {
    const data = new Date('2026-03-05T00:00:00')
    const cicloInicio = getCicloInicioParaData(data)

    expect(cicloInicio).toBe('2026-02-09')
  })

  it('deve funcionar na virada do ano', () => {
    const data = new Date('2026-01-05T00:00:00')
    const cicloInicio = getCicloInicioParaData(data)

    expect(cicloInicio).toBe('2025-12-09')
  })
})

describe('formatarIntervaloCiclo', () => {
  it('deve formatar intervalo corretamente', () => {
    const inicio = new Date('2026-03-09T00:00:00')
    const fim = new Date('2026-04-08T23:59:59')

    const resultado = formatarIntervaloCiclo(inicio, fim)

    expect(resultado).toContain('09/03/2026')
    expect(resultado).toContain('08/04/2026')
  })
})
