import type { Transacao } from '@/types'
import type { CategoriaPersonalizada } from '@/services/categorias'

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
  isDark: boolean,
  categorias: CategoriaPersonalizada[] = []
): object {
  const labels = Object.keys(grupos)
  const data = Object.values(grupos)

  // Cria mapa de cores personalizadas
  const mapaCores = new Map<string, string>()
  categorias.forEach(c => {
    if (c.cor) {
      mapaCores.set(c.nome, c.cor)
    }
  })

  // Usa cores personalizadas ou gera cores automáticas
  const colors = labels.map((label, index) => {
    if (mapaCores.has(label)) {
      return mapaCores.get(label)!
    }
    // Gera cor baseada no índice se não tiver cor personalizada
    const hue = (index * 137.508) % 360 // ângulo dourado para boa distribuição
    return `hsl(${hue}, 70%, 60%)`
  })

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
