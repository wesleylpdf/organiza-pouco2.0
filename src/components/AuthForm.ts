import { login, cadastro, resetSenha } from '@/hooks/useAuth'

type Modo = 'login' | 'cadastro' | 'reset'

export function criarAuthForm(container: HTMLElement): void {
  container.innerHTML = `
    <div id="auth-screen" class="fixed inset-0 bg-slate-900 flex items-center justify-center z-[999] p-4">
      <div class="relative bg-white p-4 p-6 p-8 rounded-2xl rounded-3xl text-center w-full max-w-sm mx-auto shadow-2xl dark:bg-slate-800">
        <img id="auth-logo" src="logo-organiza.jpeg" alt="Organiza Pouco" class="mx-auto mb-3 mb-4 w-20 w-24 h-auto rounded-full object-cover border-2 border-emerald-500 dark:border-emerald-400">
        <h2 class="font-black text-lg text-xl mb-2 text-slate-800 dark:text-white">Organiza Pouco</h2>
        <p id="auth-subtitle" class="text-xs text-sm text-slate-500 mb-4 mb-6 dark:text-slate-400">Entre na sua conta</p>
        <div class="absolute bottom-2 right-2 text-[10px] text-slate-400 font-bold">Versão: ${__BUILD_VERSION__}</div>

        <div id="auth-fields" class="space-y-2 space-y-3 mb-3 mb-4">
          <input type="email" id="auth-email" class="border p-3 rounded-xl w-full bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm text-base" placeholder="Email" autocomplete="email">
          <input type="password" id="auth-pass" class="border p-3 rounded-xl w-full bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm text-base" placeholder="Senha" autocomplete="current-password">
        </div>

        <p id="auth-error" class="text-rose-500 text-xs mb-3 hidden"></p>

        <button id="auth-submit" class="bg-slate-900 text-white px-6 px-8 py-3 rounded-xl font-bold w-full hover:bg-slate-800 transition dark:bg-slate-700 text-sm text-base">Entrar</button>

        <div class="mt-3 mt-4 space-y-2 text-xs text-sm">
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
      passInput.placeholder = 'Senha'
    } else if (modo === 'cadastro') {
      subtitle.textContent = 'Crie sua conta'
      submitBtn.textContent = 'Cadastrar'
      toggleLink.textContent = 'Já tem conta? Entre'
      resetLink.classList.add('hidden')
      passInput.placeholder = 'Senha'
    } else {
      subtitle.textContent = 'Recupere sua senha'
      submitBtn.textContent = 'Enviar email'
      toggleLink.textContent = 'Voltar para login'
      resetLink.classList.add('hidden')
      passInput.placeholder = 'Digitar nova senha'
    }
  }

  submitBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    const pass = passInput.value

    if (modo !== 'reset' && (!email || !pass)) {
      errorEl.textContent = 'Preencha todos os campos'
      errorEl.classList.remove('hidden')
      errorEl.classList.replace('text-emerald-500', 'text-rose-500')
      return
    }

    if (modo === 'reset' && !email) {
      errorEl.textContent = 'Preencha o email'
      errorEl.classList.remove('hidden')
      errorEl.classList.replace('text-emerald-500', 'text-rose-500')
      return
    }

    submitBtn.setAttribute('disabled', 'true')
    submitBtn.textContent = 'Carregando...'
    errorEl.classList.add('hidden')

    try {
      if (modo === 'login') await login(email, pass)
      else if (modo === 'cadastro') await cadastro(email, pass)
      else await resetSenha(email)

      if (modo === 'cadastro') {
        errorEl.textContent = 'Conta criada! Confirmar no e-mail cadastrado!'
        errorEl.classList.remove('hidden')
        errorEl.classList.replace('text-rose-500', 'text-emerald-500')
        modo = 'login'
        setTimeout(() => atualizarUI(), 2000)
      } else if (modo === 'reset') {
        passInput.value = ''
        errorEl.textContent = 'Email de recuperação enviado, Confirmar no e-mail cadastrado!'
        errorEl.classList.remove('hidden')
        errorEl.classList.replace('text-rose-500', 'text-emerald-500')
        modo = 'login'
        atualizarUI()
      }
    } catch (e: any) {
      errorEl.classList.remove('hidden')
      errorEl.classList.replace('text-emerald-500', 'text-rose-500')

      if (modo === 'login') passInput.value = ''

      if (e.message?.includes('Invalid login credentials') || e.message?.includes('Invalid email or password')) {
        errorEl.textContent = 'Email ou senha incorretos'
      } else if (e.message?.includes('User already registered')) {
        errorEl.textContent = 'Este email já está cadastrado'
      } else if (e.message?.includes('Password should be at least')) {
        errorEl.textContent = 'A senha deve ter pelo menos 6 caracteres'
      } else if (e.message?.includes('Invalid email')) {
        errorEl.textContent = 'Email inválido'
      } else {
        errorEl.textContent = e.message || 'Erro na autenticação'
      }
    } finally {
      submitBtn.removeAttribute('disabled')
      submitBtn.textContent = modo === 'login' ? 'Entrar' : modo === 'cadastro' ? 'Cadastrar' : 'Enviar email'
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
    passInput.value = ''
    atualizarUI()
  })

  atualizarUI()
}
