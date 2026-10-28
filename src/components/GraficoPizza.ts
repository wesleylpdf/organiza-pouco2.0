import { Chart, registerables } from 'chart.js'
import type { Transacao } from '@/types'
import { agruparPorCategoria, gerarConfigGrafico } from '@/utils/chart'
import { appStore } from '@/stores/AppState'

Chart.register(...registerables)

let chartInstance: Chart | null = null

export function criarGrafico(container: HTMLElement): void {
  container.innerHTML = `
    <div class="relative max-w-2xl mx-auto p-6 rounded-3xl shadow-sm mb-8 border border-slate-200 flex flex-col items-center justify-center bg-white dark:bg-slate-800 dark:border-slate-700" style="height: 320px;">
      <h3 class="font-bold text-sm mb-2 text-slate-800 w-full text-left dark:text-white">Distribuição de Gastos</h3>
      <div class="relative w-full h-full flex items-center justify-center">
        <canvas id="categoryChart" style="max-height: 220px;"></canvas>
      </div>
      <p id="chart-empty" class="text-slate-400 text-xs text-sm hidden">Sem saídas neste ciclo</p>
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

// Atualiza gráfico quando o tema muda
window.addEventListener('themechange', () => {
  // Re-render será feito pelo main.ts ao chamar updateDashboard()
})
