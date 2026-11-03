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
  onFixosClick: () => void
  user: string
  diaInicioCiclo?: number
  diaFimCiclo?: number
  cycleOffset?: number
  metaGastos?: number | null
}

let metaAtual: number | null = null

export function criarHeader(container: HTMLElement, onFixosClick: () => void): void {
  container.innerHTML = `
    <header class="max-w-3xl mx-auto mb-5">
      <div class="flex items-center justify-between gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 px-4 py-3 rounded-2xl shadow-sm">
        <div class="flex items-center gap-3 min-w-0">
          <img src="logo-organiza.jpeg" alt="Logo" class="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/80 shrink-0 shadow-sm">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white shrink-0">Organiza Pouco</h1>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">Versão: ${__BUILD_VERSION__}</span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span id="header-user" class="font-semibold truncate"></span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="theme-toggle" title="Alternar tema" class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition">
            <span id="theme-icon" class="text-sm">☀️</span>
          </button>
          <button id="logout-btn" class="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition">Sair</button>
        </div>
      </div>
    </header>

    <div id="resumo-ciclo" class="relative max-w-3xl mx-auto overflow-hidden bg-white/95 text-slate-900 border border-slate-200/90 shadow-md dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950 dark:text-white dark:border-slate-800 p-4 sm:p-5 rounded-3xl dark:shadow-xl mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-200/80 dark:border-white/10">
        <div class="flex items-center justify-between sm:justify-start gap-2 flex-1">
          <button id="ciclo-anterior" class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white px-3.5 py-2 rounded-xl font-bold text-xs transition dark:border-white/10">←</button>
          <div class="text-center flex-1 sm:flex-initial px-2">
            <span class="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Período do Ciclo</span>
            <span class="text-xs sm:text-sm text-slate-900 dark:text-white font-extrabold tracking-wide" id="cycle-dates">Resumo do Ciclo</span>
          </div>
          <button id="ciclo-proximo" class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white px-3.5 py-2 rounded-xl font-bold text-xs transition dark:border-white/10">→</button>
          <button id="ciclo-hoje" title="Voltar para o ciclo atual" class="hidden bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-2 rounded-xl font-extrabold text-xs transition shrink-0">Hoje</button>
        </div>

        <div class="flex items-center justify-center gap-2 bg-slate-100/80 border border-slate-200 dark:bg-white/5 px-3 py-1.5 rounded-2xl dark:border-white/10">
          <label class="text-[10px] text-slate-600 dark:text-slate-300 uppercase font-bold tracking-wider">Início</label>
          <select id="dia-inicio-ciclo" class="bg-white border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold dark:text-white focus:outline-none focus:border-emerald-400">
            ${Array.from({ length: 31 }, (_, i) => i + 1)
              .map(d => `<option value="${d}">${d}</option>`)
              .join('')}
          </select>
          <span class="text-slate-500 text-xs">•</span>
          <label class="text-[10px] text-slate-600 dark:text-slate-300 uppercase font-bold tracking-wider">Fim</label>
          <select id="dia-fim-ciclo" title="Fim do ciclo (dia do mês)"
            class="bg-white border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-600 rounded-lg px-2 py-1 text-xs font-bold dark:text-white focus:outline-none focus:border-emerald-400">
            ${Array.from({ length: 31 }, (_, i) => i + 1)
              .map(d => `<option value="${d}">${d}</option>`)
              .join('')}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-3">
        <div class="bg-emerald-50/80 border border-emerald-200 dark:bg-white/5 dark:border-emerald-500/20 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-1.5 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 uppercase font-extrabold tracking-wide shrink-0">Entradas:</span>
            <h2 id="total-entradas" class="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">R$ 0,00</h2>
          </div>
          <span class="hidden sm:inline-block text-[10px] bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold shrink-0">↑</span>
        </div>

        <div class="bg-rose-50/80 border border-rose-200 dark:bg-white/5 dark:border-rose-500/20 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-1.5 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 uppercase font-extrabold tracking-wide shrink-0">Saídas:</span>
            <h2 id="total-saidas" class="text-xs sm:text-base font-black text-rose-600 dark:text-rose-400 truncate">R$ 0,00</h2>
          </div>
          <span class="hidden sm:inline-block text-[10px] bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-1.5 py-0.5 rounded-full font-bold shrink-0">↓</span>
        </div>

        <div class="col-span-2 sm:col-span-1 bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/15 dark:border-emerald-400/30 rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-200 uppercase font-extrabold tracking-wide shrink-0">Saldo Final:</span>
            <h2 id="cycle-total" class="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">R$ 0,00</h2>
          </div>
          <button id="fixos-btn" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide transition shadow shrink-0">📌 FIXOS</button>
        </div>
      </div>

      <div id="meta-gastos-section" class="pt-3 border-t border-slate-200/80 dark:border-white/10">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-600 dark:text-slate-300">🎯 Meta de Gastos:</span>
            <button type="button" id="definir-meta-btn" class="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-emerald-300 border border-slate-200 dark:border-white/10 transition">
              + Definir meta
            </button>
          </div>
          <span id="meta-status-text" class="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 hidden"></span>
        </div>

        <div id="meta-editor" class="hidden mt-2.5 flex items-center gap-2 flex-nowrap">
          <input type="number" id="input-meta-gastos" step="0.01" min="0" placeholder="Limite mensal (R$)" inputmode="decimal"
            class="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white text-xs font-bold focus:outline-none focus:border-emerald-400">
          <button type="button" id="salvar-meta-btn" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shrink-0">Salvar</button>
          <button type="button" id="limpar-meta-btn" class="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/20 text-xs font-bold transition shrink-0">Limpar</button>
          <button type="button" id="cancelar-meta-btn" class="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-xs font-bold transition shrink-0">✕</button>
        </div>

        <div id="meta-progress-wrapper" class="hidden w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mt-2">
          <div id="meta-progress-bar" class="h-full rounded-full transition-all duration-300 bg-emerald-500" style="width: 0%"></div>
        </div>
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

  // Botão FIXOS
  container.querySelector('#fixos-btn')!.addEventListener('click', onFixosClick)

  // Eventos da Meta de Gastos
  const definirMetaBtn = container.querySelector('#definir-meta-btn') as HTMLButtonElement
  const metaEditor = container.querySelector('#meta-editor') as HTMLElement
  const inputMeta = container.querySelector('#input-meta-gastos') as HTMLInputElement
  const salvarMetaBtn = container.querySelector('#salvar-meta-btn') as HTMLButtonElement
  const limparMetaBtn = container.querySelector('#limpar-meta-btn') as HTMLButtonElement
  const cancelarMetaBtn = container.querySelector('#cancelar-meta-btn') as HTMLButtonElement

  definirMetaBtn.addEventListener('click', () => {
    const estaAberto = !metaEditor.classList.contains('hidden')
    if (estaAberto) {
      metaEditor.classList.add('hidden')
    } else {
      inputMeta.value = metaAtual && metaAtual > 0 ? String(metaAtual) : ''
      metaEditor.classList.remove('hidden')
      inputMeta.focus()
    }
  })

  cancelarMetaBtn.addEventListener('click', () => {
    metaEditor.classList.add('hidden')
  })

  salvarMetaBtn.addEventListener('click', () => {
    const valorNum = Number(inputMeta.value.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.warning('Informe um valor maior que zero para a meta')
      return
    }
    metaEditor.classList.add('hidden')
    window.dispatchEvent(new CustomEvent('metaGastosChange', { detail: { meta: valorNum } }))
  })

  limparMetaBtn.addEventListener('click', () => {
    metaEditor.classList.add('hidden')
    window.dispatchEvent(new CustomEvent('metaGastosChange', { detail: { meta: null } }))
  })

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

  document.querySelector('#header-user')!.textContent = props.user.split('@')[0]

  // Mantém os selects com a configuração atual do ciclo.
  const inicioSelect = document.querySelector('#dia-inicio-ciclo') as HTMLSelectElement | null
  const fimSelect = document.querySelector('#dia-fim-ciclo') as HTMLSelectElement | null
  const diaInicio = props.diaInicioCiclo ?? 9
  const diaFim = props.diaFimCiclo ?? DIA_FIM_PADRAO
  if (inicioSelect) inicioSelect.value = String(diaInicio)
  if (fimSelect) fimSelect.value = String(diaFim)

  const btnHoje = root.querySelector('#ciclo-hoje') as HTMLButtonElement | null
  if (btnHoje) {
    btnHoje.classList.toggle('hidden', (props.cycleOffset ?? 0) === 0)
  }

  // Atualiza Meta de Gastos e barra de progresso
  metaAtual = props.metaGastos ?? null
  const definirMetaBtn = root.querySelector('#definir-meta-btn') as HTMLButtonElement | null
  const metaStatusText = root.querySelector('#meta-status-text') as HTMLElement | null
  const metaProgressWrapper = root.querySelector('#meta-progress-wrapper') as HTMLElement | null
  const metaProgressBar = root.querySelector('#meta-progress-bar') as HTMLElement | null

  if (definirMetaBtn && metaStatusText && metaProgressWrapper && metaProgressBar) {
    if (metaAtual && metaAtual > 0) {
      definirMetaBtn.textContent = `${formatarMoeda(metaAtual)} ✏️`
      const saidas = props.totais.saidas
      const percentual = (saidas / metaAtual) * 100
      const percentualBarra = Math.min(percentual, 100)
      const diferenca = metaAtual - saidas

      metaStatusText.classList.remove('hidden')
      metaProgressWrapper.classList.remove('hidden')
      metaProgressBar.style.width = `${percentualBarra.toFixed(1)}%`

      metaProgressBar.classList.remove('bg-emerald-500', 'bg-amber-500', 'bg-rose-500')
      metaStatusText.classList.remove(
        'text-emerald-600', 'dark:text-emerald-300',
        'text-amber-600', 'dark:text-amber-300',
        'text-rose-600', 'dark:text-rose-300'
      )

      if (percentual < 70) {
        metaProgressBar.classList.add('bg-emerald-500')
        metaStatusText.classList.add('text-emerald-600', 'dark:text-emerald-300')
      } else if (percentual <= 90) {
        metaProgressBar.classList.add('bg-amber-500')
        metaStatusText.classList.add('text-amber-600', 'dark:text-amber-300')
      } else {
        metaProgressBar.classList.add('bg-rose-500')
        metaStatusText.classList.add('text-rose-600', 'dark:text-rose-300')
      }

      if (diferenca >= 0) {
        metaStatusText.textContent = `${percentual.toFixed(0)}% usado • Disponível: ${formatarMoeda(diferenca)}`
      } else {
        metaStatusText.textContent = `${percentual.toFixed(0)}% usado • Acima em ${formatarMoeda(Math.abs(diferenca))}`
      }
    } else {
      definirMetaBtn.textContent = '+ Definir meta'
      metaStatusText.textContent = ''
      metaStatusText.classList.add('hidden')
      metaProgressWrapper.classList.add('hidden')
      metaProgressBar.style.width = '0%'
    }
  }
}
