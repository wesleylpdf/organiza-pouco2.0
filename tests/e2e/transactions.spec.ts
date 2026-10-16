import { test, expect } from '@playwright/test'

test.describe('Formulário de Transação', () => {
  test.beforeEach(async ({ page }) => {
    // Mock autenticação
    await page.goto('/')

    // Simula login (ajuste conforme necessário)
    await page.evaluate(() => {
      localStorage.setItem('sb-test-auth-token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { id: 'test-user', email: 'test@example.com' }
      }))
    })

    await page.reload()
  })

  test('deve exibir formulário com campos obrigatórios', async ({ page }) => {
    await expect(page.locator('#input-value')).toBeVisible()
    await expect(page.locator('#input-date')).toBeVisible()
    await expect(page.locator('#input-type')).toBeVisible()
    await expect(page.locator('#input-category')).toBeVisible()
    await expect(page.locator('#input-description')).toBeVisible()
    await expect(page.locator('#input-fixed')).toBeVisible()
  })

  test('deve ter data atual como valor padrão', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0]
    await expect(page.locator('#input-date')).toHaveValue(today)
  })

  test('deve permitir selecionar tipo de transação', async ({ page }) => {
    await page.selectOption('#input-type', 'entrada')
    await expect(page.locator('#input-type')).toHaveValue('entrada')

    await page.selectOption('#input-type', 'saida')
    await expect(page.locator('#input-type')).toHaveValue('saida')
  })

  test('deve permitir selecionar categoria', async ({ page }) => {
    await page.selectOption('#input-category', 'Alimentação')
    await expect(page.locator('#input-category')).toHaveValue('Alimentação')
  })

  test('deve marcar transação como fixa', async ({ page }) => {
    await page.check('#input-fixed')
    await expect(page.locator('#input-fixed')).toBeChecked()
  })

  test('deve submeter formulário com dados válidos', async ({ page }) => {
    await page.fill('#input-value', '150.50')
    await page.selectOption('#input-category', 'Alimentação')
    await page.fill('#input-description', 'Supermercado')

    // Intercepta request
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/rest/v1/transacoes') && req.method() === 'POST'
    )

    await page.click('#transaction-form button[type="submit"]')

    const request = await requestPromise
    const body = request.postDataJSON()

    expect(body.valor).toBe(150.50)
    expect(body.categoria).toBe('Alimentação')
    expect(body.descricao).toBe('Supermercado')
  })

  test('deve mostrar erro ao submeter com valor inválido', async ({ page }) => {
    await page.fill('#input-value', '0')
    await page.fill('#input-description', 'Teste')

    // Validação HTML5 deve impedir submissão
    const isInvalid = await page.locator('#input-value').evaluate(
      (el) => (el as HTMLInputElement).validity.valid
    )

    expect(isInvalid).toBe(false)
  })
})

test.describe('Lista de Transações', () => {
  test('deve exibir lista vazia quando não há transações', async ({ page }) => {
    await page.goto('/')

    // Mock resposta vazia
    await page.route('**/rest/v1/transacoes*', route =>
      route.fulfill({ status: 200, body: '[]' })
    )

    await expect(page.locator('#list-empty')).toBeVisible()
  })

  test('deve exibir transações quando existem', async ({ page }) => {
    await page.goto('/')

    // Mock transações
    const mockTransacoes = [
      {
        id: '1',
        user_id: 'test',
        valor: 100,
        data: '2026-03-15',
        tipo: 'saida',
        categoria: 'Alimentação',
        fixo: false,
        descricao: 'Supermercado',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-15T10:00:00Z',
      },
    ]

    await page.route('**/rest/v1/transacoes*', route =>
      route.fulfill({ status: 200, body: JSON.stringify(mockTransacoes) })
    )

    await page.reload()

    await expect(page.locator('text=Supermercado')).toBeVisible()
    await expect(page.locator('text=R$ 100,00')).toBeVisible()
  })

  test('deve filtrar apenas transações fixas', async ({ page }) => {
    await page.goto('/')

    const mockTransacoes = [
      {
        id: '1',
        user_id: 'test',
        valor: 100,
        data: '2026-03-15',
        tipo: 'saida',
        categoria: 'Alimentação',
        fixo: false,
        descricao: 'Variável',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'test',
        valor: 200,
        data: '2026-03-16',
        tipo: 'saida',
        categoria: 'Moradia',
        fixo: true,
        descricao: 'Aluguel',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-16T10:00:00Z',
      },
    ]

    await page.route('**/rest/v1/transacoes*', route =>
      route.fulfill({ status: 200, body: JSON.stringify(mockTransacoes) })
    )

    await page.reload()

    // Ativa filtro
    await page.check('#filter-fixed')

    // Apenas fixa deve estar visível
    await expect(page.locator('text=Aluguel')).toBeVisible()
    await expect(page.locator('text=Variável')).not.toBeVisible()
  })
})

test.describe('Resumo do Ciclo', () => {
  test('deve exibir totais corretos', async ({ page }) => {
    await page.goto('/')

    const mockTransacoes = [
      {
        id: '1',
        user_id: 'test',
        valor: 1000,
        data: '2026-03-15',
        tipo: 'entrada',
        categoria: 'Salário',
        fixo: false,
        descricao: 'Salário',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-15T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'test',
        valor: 500,
        data: '2026-03-16',
        tipo: 'saida',
        categoria: 'Alimentação',
        fixo: false,
        descricao: 'Supermercado',
        ciclo_inicio: '2026-03-09',
        created_at: '2026-03-16T10:00:00Z',
      },
    ]

    await page.route('**/rest/v1/transacoes*', route =>
      route.fulfill({ status: 200, body: JSON.stringify(mockTransacoes) })
    )

    await page.reload()

    await expect(page.locator('#total-entradas')).toHaveText('R$ 1.000,00')
    await expect(page.locator('#total-saidas')).toHaveText('R$ 500,00')
    await expect(page.locator('#cycle-total')).toHaveText('R$ 500,00')
  })

  test('deve navegar entre ciclos', async ({ page }) => {
    await page.goto('/')

    // Mock resposta vazia
    await page.route('**/rest/v1/transacoes*', route =>
      route.fulfill({ status: 200, body: '[]' })
    )

    await page.reload()

    const initialDates = await page.locator('#cycle-dates').textContent()

    // Clica em anterior
    await page.click('#ciclo-anterior')

    const previousDates = await page.locator('#cycle-dates').textContent()
    expect(previousDates).not.toBe(initialDates)

    // Clica em próximo duas vezes
    await page.click('#ciclo-proximo')
    await page.click('#ciclo-proximo')

    const futureDates = await page.locator('#cycle-dates').textContent()
    expect(futureDates).not.toBe(initialDates)
  })
})
