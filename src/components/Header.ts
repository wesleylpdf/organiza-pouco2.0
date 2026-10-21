import { logout } from '@/hooks/useAuth'
import { formatarMoeda } from '@/utils/format'
import { diasForaDoCiclo, DIA_FIM_PADRAO } from '@/utils/ciclo'
import { toast } from '@/utils/toast'
import type { TotaisCiclo } from '@/types'

export interface HeaderProps {
  cicloDatas: string
  totais: TotaisCiclo
  onCicloAnterior: () => void
  onCicloProximo: () => void
  onAlterarDiaCiclo: (diaInicio: number, diaFim: number) => void
  user: string
  diaInicioCiclo?: number
  diaFimCiclo?: number
}

export function criarHeader(container: HTMLElement): void {
  container.innerHTML = `
    <header class="max-w-4xl mx-auto mb-3 sm:mb-4">
      <div class="flex items-center justify-between gap-2">
        <div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 min-w-0">
          <h1 class="font-black text-base sm:text-lg text-slate-800 dark:text-white shrink-0">Organiza Pouco</h1>
          <span id="header-user" class="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate"></span>
        </div>
        <div class="flex items-center gap-1 sm:gap-2">
          <button id="theme-toggle" class="bg-white p-2 rounded-full shadow border dark:bg-slate-800 dark:border-slate-700">
            <span id="theme-icon">☀️</span>
          </button>
          <button id="logout-btn" class="bg-rose-500 text-white px-2 sm:px-3 py-2 rounded-lg text-xs font-bold hover:bg-rose-600 transition">Sair</button>
        </div>
      </div>
    </header>

    <div id="resumo-ciclo" class="max-w-4xl mx-auto bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm mb-4 sm:mb-8 dark:bg-slate-800 dark:border-slate-700">
      <div class="flex justify-between items-center mb-3 sm:mb-4 gap-2">
        <button id="ciclo-anterior" class="bg-slate-100 px-2 sm:px-4 py-2 rounded-lg font-bold hover:bg-slate-200 text-xs sm:text-sm dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">←</button>
        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center flex-1" id="cycle-dates">Resumo do Ciclo</span>
        <button id="ciclo-proximo" class="bg-slate-100 px-2 sm:px-4 py-2 rounded-lg font-bold hover:bg-slate-200 text-xs sm:text-sm dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">→</button>
      </div>
      <div class="flex justify-center items-center gap-4 sm:gap-6 mb-3 sm:mb-4">
        <label class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Início:</label>
        <select id="dia-inicio-ciclo" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500">
          ${Array.from({ length: 31 }, (_, i) => i + 1)
            .map(d => `<option value="${d}">${d}</option>`)
            .join('')}
        </select>
        <label class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fim:</label>
        <select id="dia-fim-ciclo" title="Fim do ciclo (dia do mês)"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500">
          ${Array.from({ length: 31 }, (_, i) => i + 1)
            .map(d => `<option value="${d}">${d}</option>`)
            .join('')}
        </select>
        <button id="salvar-config-ciclo" class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-emerald-700 transition dark:bg-emerald-700">Salvar</button>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <span class="text-[10px] text-emerald-600 uppercase font-bold">Entradas</span>
          <h2 id="total-entradas" class="text-base sm:text-xl font-bold text-emerald-600 truncate">R$ 0,00</h2>
        </div>
        <div>
          <span class="text-[10px] text-rose-600 uppercase font-bold">Saídas</span>
          <h2 id="total-saidas" class="text-base sm:text-xl font-bold text-rose-600 truncate">R$ 0,00</h2>
        </div>
      </div>
      <div class="border-t border-slate-200 pt-2 sm:pt-3 flex justify-between items-end dark:border-slate-700">
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-bold">Saldo Final</span>
          <h2 id="cycle-total" class="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">R$ 0,00</h2>
        </div>
        <div class="text-[10px] text-slate-500 font-bold uppercase shrink-0">Versão: 2.2.0</div>
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

  // Selectores de ciclo
  const inicioSelect = container.querySelector('#dia-inicio-ciclo') as HTMLSelectElement
  const fimSelect = container.querySelector('#dia-fim-ciclo') as HTMLSelectElement

  // Sugere o fim padrão (dia anterior ao início) ao trocar o início,
  // mas o usuário pode escolher outro dia no campo "Fim".
  inicioSelect.addEventListener('change', () => {
    const diaInicio = parseInt(inicioSelect.value, 10)
    fimSelect.value = String(diaInicio === 1 ? 31 : diaInicio - 1)
    emitirConfigCiclo()
  })

  fimSelect.addEventListener('change', () => emitirConfigCiclo())

  // Botão salvar configuração de ciclo
  const btnSalvarConfig = container.querySelector('#salvar-config-ciclo') as HTMLButtonElement
  btnSalvarConfig.addEventListener('click', () => emitirConfigCiclo())

  function emitirConfigCiclo(): void {
    const diaInicio = parseInt(inicioSelect.value, 10)
    const diaFim = parseInt(fimSelect.value, 10)

    const dias = diasForaDoCiclo(diaInicio, diaFim)
    if (dias > 0) {
      toast.warning(
        `Atenção: ${dias} dia(s) entre o fim e o próximo início ficarão fora do ciclo. ` +
        'Para ciclos contíguos, use o fim no dia anterior ao início.'
      )
    }

    window.dispatchEvent(new CustomEvent('cicloConfigChange', { detail: { diaInicio, diaFim } }))
  }
}

export function atualizarHeader(props: HeaderProps): void {
  const root = document.querySelector('#resumo-ciclo')
  if (!root) return

  root.querySelector('#cycle-dates')!.textContent = props.cicloDatas
  root.querySelector('#total-entradas')!.textContent = formatarMoeda(props.totais.entradas)
  root.querySelector('#total-saidas')!.textContent = formatarMoeda(props.totais.saidas)
  root.querySelector('#cycle-total')!.textContent = formatarMoeda(props.totais.saldo)

  document.querySelector('#header-user')!.textContent = props.user

  // Mantém os selects com a configuração atual do ciclo.
  const inicioSelect = document.querySelector('#dia-inicio-ciclo') as HTMLSelectElement | null
  const fimSelect = document.querySelector('#dia-fim-ciclo') as HTMLSelectElement | null
  const diaInicio = props.diaInicioCiclo ?? 9
  const diaFim = props.diaFimCiclo ?? DIA_FIM_PADRAO
  if (inicioSelect) inicioSelect.value = String(diaInicio)
  if (fimSelect) fimSelect.value = String(diaFim)
}
