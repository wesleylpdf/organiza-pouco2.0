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

  it('não deve voltar um ano a mais em janeiro', () => {
    vi.setSystemTime(new Date('2026-01-05T12:00:00'))

    const ciclo = getCicloAtual(0, 9, 8)

    expect(ciclo.inicio.getFullYear()).toBe(2025)
    expect(ciclo.inicio.getMonth()).toBe(11) // Dezembro de 2025
    expect(ciclo.inicio.getDate()).toBe(9)
    expect(ciclo.fim.getFullYear()).toBe(2026)
    expect(ciclo.fim.getMonth()).toBe(0) // Janeiro de 2026
    expect(ciclo.fim.getDate()).toBe(8)
  })

  it('deve navegar corretamente de dezembro para janeiro', () => {
    vi.setSystemTime(new Date('2025-12-20T12:00:00'))

    const ciclo = getCicloAtual(1, 9, 8)

    expect(ciclo.inicio.getFullYear()).toBe(2026)
    expect(ciclo.inicio.getMonth()).toBe(0)
    expect(ciclo.inicio.getDate()).toBe(9)
  })

  it('deve retornar ciclo 09/10 a 08/11 quando hoje é 20/10', () => {
    vi.setSystemTime(new Date('2026-10-20T12:00:00'))

    const ciclo = getCicloAtual(0, 9, 8)

    expect(ciclo.inicio.getDate()).toBe(9)
    expect(ciclo.inicio.getMonth()).toBe(9) // Outubro
    expect(ciclo.inicio.getFullYear()).toBe(2026)
    expect(ciclo.fim.getDate()).toBe(8)
    expect(ciclo.fim.getMonth()).toBe(10) // Novembro
    expect(ciclo.fim.getFullYear()).toBe(2026)
  })

  it('deve usar o mês seguinte como fim quando diaFim < diaInicio', () => {
    vi.setSystemTime(new Date('2026-10-05T12:00:00'))

    const ciclo = getCicloAtual(0, 9, 8)

    // 05/10 ainda pertence ao ciclo iniciado em 09/09
    expect(ciclo.inicio.getMonth()).toBe(8) // Setembro
    expect(ciclo.inicio.getDate()).toBe(9)
    expect(ciclo.fim.getMonth()).toBe(9) // Outubro
    expect(ciclo.fim.getDate()).toBe(8)
  })

  it('não deve deixar lacuna entre ciclos com início 9 e fim 31', () => {
    vi.setSystemTime(new Date('2026-03-05T12:00:00'))

    const atual = getCicloAtual(0, 9, 31)
    const proximo = getCicloAtual(1, 9, 31)

    // 05/03 pertence ao ciclo iniciado em 09/02
    expect(atual.inicio.getMonth()).toBe(1)
    expect(atual.inicio.getDate()).toBe(9)

    // O ciclo seguinte começa no dia imediatamente posterior ao fim
    const diaSeguinte = new Date(atual.fim)
    diaSeguinte.setDate(diaSeguinte.getDate() + 1)
    expect(diaSeguinte.toDateString()).toBe(proximo.inicio.toDateString())
  })

  it('não deve sobrepor ciclos em fevereiro com início 31', () => {
    vi.setSystemTime(new Date('2026-03-01T12:00:00'))

    const atual = getCicloAtual(0, 31, 30)
    const anterior = getCicloAtual(-1, 31, 30)

    // 28/02 é o último dia do ciclo iniciado em 31/01
    expect(anterior.inicio.getDate()).toBe(31)
    expect(anterior.inicio.getMonth()).toBe(0)
    expect(anterior.fim.getDate()).toBe(27)
    expect(anterior.fim.getMonth()).toBe(1)

    // e o dia seguinte já é o início do ciclo atual (28/02)
    const diaSeguinte = new Date(anterior.fim)
    diaSeguinte.setDate(diaSeguinte.getDate() + 1)
    expect(diaSeguinte.toDateString()).toBe(atual.inicio.toDateString())
    expect(atual.inicio.getMonth()).toBe(1)
    expect(atual.inicio.getDate()).toBe(28)
  })

  it('deve limitar o início ao último dia de fevereiro', () => {
    vi.setSystemTime(new Date('2026-02-15T12:00:00'))

    const ciclo = getCicloAtual(0, 31, 30)

    expect(ciclo.inicio.getMonth()).toBe(0) // Janeiro
    expect(ciclo.inicio.getDate()).toBe(31)
    expect(ciclo.fim.getMonth()).toBe(1) // Fevereiro
    expect(ciclo.fim.getDate()).toBe(27)
  })

  it('deve manter ciclos contíguos para todos os dias de início', () => {
    vi.setSystemTime(new Date('2026-02-15T12:00:00'))

    for (let diaInicio = 1; diaInicio <= 31; diaInicio++) {
      for (let offset = -3; offset <= 3; offset++) {
        const ciclo = getCicloAtual(offset, diaInicio, 8)
        const proximo = getCicloAtual(offset + 1, diaInicio, 8)

        const diaSeguinte = new Date(ciclo.fim)
        diaSeguinte.setDate(diaSeguinte.getDate() + 1)

        expect(
          diaSeguinte.toDateString(),
          `diaInicio=${diaInicio} offset=${offset}`
        ).toBe(proximo.inicio.toDateString())
      }
    }
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

  it('deve limitar o início ao último dia do mês (dia 31 em fevereiro)', () => {
    // 01/03/2026 com início 31: o ciclo de fevereiro começou em 28/02
    expect(getCicloInicioParaData(new Date('2026-03-01T00:00:00'), 31)).toBe('2026-02-28')
    expect(getCicloInicioParaData(new Date('2026-02-28T00:00:00'), 31)).toBe('2026-02-28')
    expect(getCicloInicioParaData(new Date('2026-02-27T00:00:00'), 31)).toBe('2026-01-31')
    expect(getCicloInicioParaData(new Date('2026-03-30T00:00:00'), 31)).toBe('2026-02-28')
    expect(getCicloInicioParaData(new Date('2026-03-31T00:00:00'), 31)).toBe('2026-03-31')
  })

  it('deve limitar o início em janeiro sem perder o ano', () => {
    expect(getCicloInicioParaData(new Date('2026-01-15T00:00:00'), 31)).toBe('2025-12-31')
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
