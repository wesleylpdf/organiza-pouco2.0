import type { Transacao } from '@/types'

/**
 * Cores padrão para categorias
 */
export const CORES_CATEGORIAS: Record<string, string> = {
  'Salário': '#10b981',
  'Alimentação': '#f59e0b',
  'Moradia': '#3b82f6',
  'Transporte': '#8b5cf6',
  'Lazer': '#ec4899',
  'Saúde': '#f43f5e',
  'Educação': '#0ea5e9',
  'Investimentos': '#14b8a6',
  'Outros': '#64748b',
}

/**
 * Agrupa transações por categoria e soma valores
 */
export function agruparPorCategoria(transacoes: Transacao[]): Record<string, number> {
  return transacoes.reduce((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + parseFloat(String(t.valor))
    return acc
  }, {} as Record<string, number>)
}

/**
 * Gera config do Chart.js para gráfico de pizza
 */
export function gerarConfigGrafico(
  grupos: Record<string, number>,
  isDark: boolean
): object {
  const labels = Object.keys(grupos)
  const data = Object.values(grupos)
  const colors = labels.map(l => CORES_CATEGORIAS[l] || '#64748b')

  return {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: isDark ? '#1e293b' : '#ffffff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 15 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#f1f5f9' : '#0f172a',
            padding: 12,
            font: { size: 11, weight: 'bold' },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const pct = ((value / total) * 100).toFixed(1)
              return `${label}: R$ ${value.toFixed(2)} (${pct}%)`
            },
          },
        },
      },
    },
  }
}
