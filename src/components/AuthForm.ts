import { login, cadastro, resetSenha } from '@/hooks/useAuth'

type Modo = 'login' | 'cadastro' | 'reset'

export function criarAuthForm(container: HTMLElement): void {
  container.innerHTML = `
    <div id="auth-screen" class="fixed inset-0 bg-slate-900 flex items-center justify-center z-[999]">
      <div class="bg-white p-8 rounded-3xl text-center w-full max-w-sm mx-4 shadow-2xl dark:bg-slate-800">
        <h2 class="font-black text-xl mb-2 text-slate-800 dark:text-white">Organiza Pouco</h2>
        <p id="auth-subtitle" class="text-sm text-slate-500 mb-6 dark:text-slate-400">Entre na sua conta</p>

        <div id="auth-fields" class="space-y-3 mb-4">
          <input type="email" id="auth-email" class="border p-3 rounded-xl w-full bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Email">
          <input type="password" id="auth-pass" class="border p-3 rounded-xl w-full bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Senha">
        </div>

        <p id="auth-error" class="text-rose-500 text-xs mb-3 hidden"></p>

        <button id="auth-submit" class="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-slate-800 transition dark:bg-slate-700">Entrar</button>

        <div class="mt-4 space-y-2 text-xs">
          <a id="auth-toggle" href="#" class="text-blue-500 hover:underline block">Não tem conta? Cadastre-se</a>
          <a id="auth-reset" href="#" class="text-slate-400 hover:underline block">Esqueci minha senha</a>
        </div>
      </div>
    </div>
  `

  let modo: Modo = 'login'
  const submitBtn = container.querySelector('#auth-submit')!
  const toggleLink = container.querySelector('#auth-toggle')!
  const resetLink = container.querySelector('#auth-reset')!
  const subtitle = container.querySelector('#auth-subtitle')!
  const errorEl = container.querySelector('#auth-error')!
  const emailInput = container.querySelector('#auth-email') as HTMLInputElement
  const passInput = container.querySelector('#auth-pass') as HTMLInputElement

  function atualizarUI(): void {
    errorEl.classList.add('hidden')
    if (modo === 'login') {
      subtitle.textContent = 'Entre na sua conta'
      submitBtn.textContent = 'Entrar'
      toggleLink.textContent = 'Não tem conta? Cadastre-se'
      resetLink.classList.remove('hidden')
    } else if (modo === 'cadastro') {
      subtitle.textContent = 'Crie sua conta'
      submitBtn.textContent = 'Cadastrar'
      toggleLink.textContent = 'Já tem conta? Entre'
      resetLink.classList.add('hidden')
    } else {
      subtitle.textContent = 'Recupere sua senha'
      submitBtn.textContent = 'Enviar email'
      toggleLink.textContent = 'Voltar para login'
      resetLink.classList.add('hidden')
    }
  }

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const pass = passInput.value

    if (!email || !pass && modo !== 'reset') {
      errorEl.textContent = 'Preencha todos os campos'
      errorEl.classList.remove('hidden')
      return
    }

    submitBtn.setAttribute('disabled', 'true')
    submitBtn.textContent = 'Carregando...'

    try {
      if (modo === 'login') await login(email, pass)
      else if (modo === 'cadastro') await cadastro(email, pass)
      else await resetSenha(email)

      if (modo === 'reset') {
        errorEl.textContent = 'Email de recuperação enviado!'
        errorEl.classList.remove('hidden')
        errorEl.classList.replace('text-rose-500', 'text-emerald-500')
        modo = 'login'
        atualizarUI()
      }
    } catch (e: any) {
      errorEl.textContent = e.message || 'Erro na autenticação'
      errorEl.classList.remove('hidden')
    } finally {
      submitBtn.removeAttribute('disabled')
      atualizarUI()
    }
  })

  toggleLink.addEventListener('click', (e) => {
    e.preventDefault()
    modo = modo === 'login' ? 'cadastro' : 'login'
    atualizarUI()
  })

  resetLink.addEventListener('click', (e) => {
    e.preventDefault()
    modo = 'reset'
    atualizarUI()
  })

  atualizarUI()
}
