import { Chart, PieController, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
import type { Transacao } from '@/types'
import { agruparPorCategoria, gerarConfigGrafico } from '@/utils/chart'
import { appStore } from '@/stores/AppState'

Chart.register(PieController, DoughnutController, ArcElement, Tooltip, Legend)

let chartInstance: Chart | null = null

export function criarGrafico(container: HTMLElement): void {
  container.innerHTML = `
    <div class="relative max-w-3xl mx-auto p-5 sm:p-6 rounded-3xl shadow-md mb-6 border border-slate-200/90 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 dark:border-slate-800" style="height: 340px;">
      <div class="flex items-center gap-2.5 w-full mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <span class="w-2.5 h-5 rounded-full bg-teal-500"></span>
        <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">Distribuição de Gastos</h3>
      </div>
      <div class="relative w-full h-full flex items-center justify-center">
        <canvas id="categoryChart" style="max-height: 230px;"></canvas>
      </div>
      <p id="chart-empty" class="text-slate-400 text-sm hidden">Sem saídas neste ciclo</p>
    </div>
  `
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
  const config = gerarConfigGrafico(grupos, isDark, categorias)

  chartInstance = new Chart(canvas.getContext('2d')!, config as any)
}
