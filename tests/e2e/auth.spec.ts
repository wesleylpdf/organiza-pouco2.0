import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('deve exibir formulário de login ao acessar a página', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('#auth-screen')).toBeVisible()
    await expect(page.locator('#auth-email')).toBeVisible()
    await expect(page.locator('#auth-pass')).toBeVisible()
    await expect(page.locator('#auth-submit')).toHaveText('Entrar')
  })

  test('deve alternar para cadastro ao clicar no link', async ({ page }) => {
    await page.goto('/')

    await page.click('#auth-toggle')

    await expect(page.locator('#auth-subtitle')).toHaveText('Crie sua conta')
    await expect(page.locator('#auth-submit')).toHaveText('Cadastrar')
    await expect(page.locator('#auth-toggle')).toHaveText('Já tem conta? Entre')
  })

  test('deve mostrar erro ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/')

    await page.fill('#auth-email', 'invalid@example.com')
    await page.fill('#auth-pass', 'wrongpassword')
    await page.click('#auth-submit')

    await expect(page.locator('#auth-error')).toBeVisible()
  })

  test('deve alternar para recuperação de senha ao clicar no link', async ({ page }) => {
    await page.goto('/')

    await page.click('#auth-reset')

    await expect(page.locator('#auth-subtitle')).toHaveText('Recupere sua senha')
    await expect(page.locator('#auth-submit')).toHaveText('Enviar email')
  })
})

test.describe('Tema', () => {
  test('deve alternar entre tema claro e escuro', async ({ page }) => {
    await page.goto('/')

    // Inicialmente escuro (padrão no HTML)
    await expect(page.locator('html')).toHaveClass(/dark/)

    // Clica no botão de tema
    await page.click('#theme-toggle')

    // Agora está claro
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // Clica novamente
    await page.click('#theme-toggle')

    // Volta para escuro
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('deve persistir preferência de tema', async ({ page }) => {
    await page.goto('/')

    // Muda para claro
    await page.click('#theme-toggle')
    await page.reload()

    // Ainda está claro
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
