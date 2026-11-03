import { Chart, PieController, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
import type { Transacao } from '@/types'
import { agruparPorCategoria, gerarConfigGrafico } from '@/utils/chart'
import { appStore } from '@/stores/AppState'
import { sanitizarHTML } from '@/utils/format'

Chart.register(PieController, DoughnutController, ArcElement, Tooltip, Legend)

let chartInstance: Chart | null = null
const CHAVE_GRAFICO_RECOLHIDO = 'grafico_gastos_recolhido'

function aplicarEstadoAcordeaoGrafico(container: HTMLElement, recolhido: boolean): void {
  const card = container.querySelector('#chart-card') as HTMLElement | null
  const headerRow = container.querySelector('#chart-header-row') as HTMLElement | null
  const bodyWrapper = container.querySelector('#chart-body-wrapper') as HTMLElement | null
  const indicator = container.querySelector('#chart-toggle-indicator') as HTMLElement | null
  const hint = container.querySelector('#chart-filter-hint') as HTMLElement | null
  if (!card || !headerRow || !bodyWrapper || !indicator) return

  bodyWrapper.classList.toggle('hidden', recolhido)
  headerRow.classList.toggle('mb-2', !recolhido)
  headerRow.classList.toggle('pb-2', !recolhido)
  headerRow.classList.toggle('border-b', !recolhido)
  card.style.height = recolhido ? 'auto' : '306px'
  indicator.textContent = recolhido ? '▼ Expandir' : '▲ Recolher'
  if (hint && recolhido) {
    hint.classList.add('hidden')
  } else if (hint && !recolhido) {
    const badgeBtn = container.querySelector('#chart-filter-badge')
    if (badgeBtn?.classList.contains('hidden')) {
      hint.classList.remove('hidden')
    }
  }
  if (!recolhido && chartInstance) {
    chartInstance.resize()
  }
}

export function criarGrafico(container: HTMLElement): void {
  container.innerHTML = `
    <div id="chart-card" class="relative max-w-3xl mx-auto p-5 sm:p-6 rounded-3xl shadow-md mb-6 border border-slate-200/90 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 dark:border-slate-800" style="height: 306px;">
      <div id="chart-header-row" class="flex items-center justify-between gap-2 w-full mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <button type="button" id="btn-toggle-chart" class="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none min-w-0">
          <span class="w-2.5 h-5 rounded-full bg-teal-500 shrink-0"></span>
          <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">Distribuição de Gastos</h3>
          <span id="chart-toggle-indicator" class="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-bold group-hover:bg-teal-500/20 transition shrink-0">▲ Recolher</span>
        </button>
        <div class="flex items-center gap-2 shrink-0">
          <span id="chart-filter-hint" class="hidden sm:inline text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-semibold">Toque na fatia para filtrar</span>
          <button type="button" id="chart-filter-badge" class="hidden inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-extrabold hover:bg-teal-500/25 transition">
            <span id="chart-filter-label"></span>
            <span>✕</span>
          </button>
        </div>
      </div>
      <div id="chart-body-wrapper" class="relative w-full h-full flex flex-col items-center justify-center">
        <div class="relative w-full h-full flex items-center justify-center">
          <canvas id="categoryChart" class="cursor-pointer" style="max-height: 207px;"></canvas>
        </div>
        <p id="chart-empty" class="text-slate-400 text-sm hidden">Sem saídas neste ciclo</p>
      </div>
    </div>
  `

  const btnToggle = container.querySelector('#btn-toggle-chart') as HTMLButtonElement | null
  const bodyWrapper = container.querySelector('#chart-body-wrapper') as HTMLElement | null

  try {
    if (localStorage.getItem(CHAVE_GRAFICO_RECOLHIDO) === '1') {
      aplicarEstadoAcordeaoGrafico(container, true)
    }
  } catch {
    // Ignora erro de localStorage
  }

  btnToggle?.addEventListener('click', () => {
    const estaRecolhido = bodyWrapper?.classList.contains('hidden') ?? false
    const novoRecolhido = !estaRecolhido
    aplicarEstadoAcordeaoGrafico(container, novoRecolhido)
    try {
      localStorage.setItem(CHAVE_GRAFICO_RECOLHIDO, novoRecolhido ? '1' : '0')
    } catch {
      // Ignora erro de localStorage
    }
  })

  const badgeBtn = container.querySelector('#chart-filter-badge') as HTMLButtonElement | null
  badgeBtn?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('categoriaGraficoClick', { detail: { categoria: '' } }))
  })
}

export function atualizarBadgeFiltroGrafico(categoriaAtiva: string): void {
  const badgeBtn = document.getElementById('chart-filter-badge')
  const badgeLabel = document.getElementById('chart-filter-label')
  const hint = document.getElementById('chart-filter-hint')
  const bodyWrapper = document.getElementById('chart-body-wrapper')
  if (!badgeBtn || !badgeLabel || !hint) return

  const estaRecolhido = bodyWrapper?.classList.contains('hidden') ?? false

  if (categoriaAtiva) {
    badgeLabel.innerHTML = sanitizarHTML(categoriaAtiva)
    badgeBtn.classList.remove('hidden')
    hint.classList.add('hidden')
  } else {
    badgeLabel.textContent = ''
    badgeBtn.classList.add('hidden')
    if (!estaRecolhido) {
      hint.classList.remove('hidden')
    }
  }
}

export function atualizarGrafico(saidas: Transacao[]): void {
  const canvas = document.getElementById('categoryChart') as HTMLCanvasElement
  const emptyMsg = document.getElementById('chart-empty')

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const grupos = agruparPorCategoria(saidas)
  const temDados = Object.keys(grupos).length > 0

  if (!temDados) {
    if (canvas) canvas.style.display = 'none'
    emptyMsg?.classList.remove('hidden')
    return
  }

  if (canvas) canvas.style.display = ''
  emptyMsg?.classList.add('hidden')

  const isDark = document.documentElement.classList.contains('dark')
  const categorias = appStore.getCategorias()
  const config = gerarConfigGrafico(grupos, isDark, categorias) as any

  config.options = config.options || {}
  config.options.onClick = (_event: any, elements: any[]) => {
    if (elements && elements.length > 0) {
      const idx = elements[0].index
      const label = config.data?.labels?.[idx]
      if (label) {
        window.dispatchEvent(new CustomEvent('categoriaGraficoClick', { detail: { categoria: String(label) } }))
      }
    }
  }

  chartInstance = new Chart(canvas.getContext('2d')!, config)
}
