import { logout } from '@/hooks/useAuth'
import { formatarMoeda } from '@/utils/format'
import type { TotaisCiclo } from '@/types'

export interface HeaderProps {
  cicloDatas: string
  totais: TotaisCiclo
  onCicloAnterior: () => void
  onCicloProximo: () => void
  user: string
}

export function criarHeader(container: HTMLElement): void {
  container.innerHTML = `
    <header class="max-w-4xl mx-auto mb-4">
      <div class="flex justify-between items-center">
        <h1 class="font-black text-lg text-slate-800 dark:text-white">Organiza Pouco</h1>
        <div class="flex items-center gap-2">
          <span id="header-user" class="text-xs text-slate-500 dark:text-slate-400"></span>
          <button id="theme-toggle" class="bg-white p-2 rounded-full shadow border dark:bg-slate-800 dark:border-slate-700">
            <span id="theme-icon">☀️</span>
          </button>
          <button id="logout-btn" class="bg-rose-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-rose-600 transition">Sair</button>
        </div>
      </div>
    </header>

    <div id="resumo-ciclo" class="max-w-4xl mx-auto bg-white border border-slate-200 p-6 rounded-3xl shadow-sm mb-8 dark:bg-slate-800 dark:border-slate-700">
      <div class="flex justify-between items-center mb-4">
        <button id="ciclo-anterior" class="bg-slate-100 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 text-sm dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">← Anterior</button>
        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest" id="cycle-dates">Resumo do Ciclo</span>
        <button id="ciclo-proximo" class="bg-slate-100 px-4 py-2 rounded-lg font-bold hover:bg-slate-200 text-sm dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">Próximo →</button>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span class="text-[10px] text-emerald-600 uppercase font-bold">Entradas</span>
          <h2 id="total-entradas" class="text-xl font-bold text-emerald-600">R$ 0,00</h2>
        </div>
        <div>
          <span class="text-[10px] text-rose-600 uppercase font-bold">Saídas</span>
          <h2 id="total-saidas" class="text-xl font-bold text-rose-600">R$ 0,00</h2>
        </div>
      </div>
      <div class="border-t border-slate-200 pt-3 flex justify-between items-end dark:border-slate-700">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Saldo Final</span>
          <h2 id="cycle-total" class="text-3xl font-black text-slate-900 dark:text-white">R$ 0,00</h2>
        </div>
        <div class="text-[9px] text-slate-500 font-bold uppercase">Versão: 2.0.0</div>
      </div>
    </div>
  `

  // Eventos
  container.querySelector('#logout-btn')!.addEventListener('click', () => logout())
  container.querySelector('#theme-toggle')!.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark')
    const isDark = document.documentElement.classList.contains('dark')
    container.querySelector('#theme-icon')!.textContent = isDark ? '☀️' : '🌙'
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    // Dispara evento para atualizar gráfico
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark } }))
  })
}

export function atualizarHeader(props: HeaderProps): void {
  const root = document.querySelector('#resumo-ciclo')
  if (!root) return

  root.querySelector('#cycle-dates')!.textContent = props.cicloDatas
  root.querySelector('#total-entradas')!.textContent = formatarMoeda(props.totais.entradas)
  root.querySelector('#total-saidas')!.textContent = formatarMoeda(props.totais.saidas)
  root.querySelector('#cycle-total')!.textContent = formatarMoeda(props.totais.saldo)

  document.querySelector('#header-user')!.textContent = props.user
  document.querySelector('#ciclo-anterior')!.addEventListener('click', props.onCicloAnterior)
  document.querySelector('#ciclo-proximo')!.addEventListener('click', props.onCicloProximo)
}
