import { appStore } from '@/stores/AppState'
import { getAuthState } from '@/hooks/useAuth'
import { useTransacoes } from '@/hooks/useTransacoes'
import { atualizarHeader } from '@/components/Header'
import { atualizarGrafico } from '@/components/GraficoPizza'
import { renderLista, setOrdem } from '@/components/TransacaoList'
import { listarTransacoes } from '@/services/transacoes'
import { somarAjustesSaldo } from '@/services/ajustes'
import { formatarIntervaloCiclo, formatDateLocalISO } from '@/utils/ciclo'
import { debounce } from '@/utils/debounce'
import { filtrarTransacoes } from '@/utils/filtroTransacoes'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'
import { salvarConfiguracaoCiclo } from '@/modules/appInit'
import type { Transacao, TotaisCiclo } from '@/types'

// Hook de transações
const transacoesHook = useTransacoes()

// Cache de transações fixas de todos os meses (evita buscas duplicadas no gráfico e no header)
let fixosTodosCache: Transacao[] | null = null

export function limparCacheFixos(): void {
  fixosTodosCache = null
}

// Callbacks injetados pelo main.ts (evita dependência circular entre módulos)
interface CicloHandlers {
  handleEditar: (id: string) => void
  handleExcluir: (id: string) => Promise<boolean>
  handleQuickEdit: (id: string, campo: string, valor: string | number) => Promise<void>
}

let cicloHandlers: CicloHandlers | null = null

export function initCiclo(handlers: CicloHandlers): void {
  cicloHandlers = handlers
}

function limparCampoBusca(): void {
  const searchEl = document.getElementById('filter-descricao') as HTMLInputElement | null
  if (searchEl) searchEl.value = ''
}

async function carregarFixosTodos(): Promise<Transacao[]> {
  if (fixosTodosCache) return fixosTodosCache
  const todasTransacoes = await listarTransacoes({})
  fixosTodosCache = todasTransacoes.filter(t => t.fixo)
  return fixosTodosCache
}

export async function updateDashboard(): Promise<void> {
  try {
    logger.debug('Atualizando dashboard')

    // Mostra loading
    updateLoadingStates()

    // Carrega transações via hook
    await transacoesHook.carregarTransacoes()

    await updateLista()

    await updateHeader()

    // Remove tela de carregamento assim que todos os dados estão visíveis
    const tela = document.getElementById('tela-carregamento')
    if (tela) tela.remove()
  } catch (err) {
    logger.error('Erro ao atualizar dashboard', err as any)
    appStore.setError('Erro ao atualizar o dashboard')
    toast.error('Erro ao atualizar o dashboard')
    const tela = document.getElementById('tela-carregamento')
    if (tela) tela.remove()
  }
}

export async function updateLista(): Promise<void> {
  const filterEl = document.getElementById('filter-dividido') as HTMLInputElement | null
  const showOnlyDividido = filterEl?.checked || false
  const searchEl = document.getElementById('filter-descricao') as HTMLInputElement | null
  const search = searchEl?.value.trim().toLowerCase() || ''
  const transacoes = appStore.getTransacoes()
  const filtradas = filtrarTransacoes(transacoes, search, showOnlyDividido)

  const ordemEl = document.getElementById('filter-ordem') as HTMLSelectElement | null
  if (ordemEl) setOrdem(ordemEl.value)

  renderLista(
    filtradas,
    (id) => cicloHandlers!.handleEditar(id),
    (id) => cicloHandlers!.handleExcluir(id),
    (id, campo, valor) => cicloHandlers!.handleQuickEdit(id, campo, valor)
  )

  await updateGrafico(filtradas)
}

export async function updateGrafico(transacoes?: Transacao[]): Promise<void> {
  const txs = transacoes ?? appStore.getTransacoes()
  const filterEl = document.getElementById('filter-dividido') as HTMLInputElement | null
  const showOnlyDividido = filterEl?.checked || false
  const filtradas = showOnlyDividido ? txs.filter(t => t.dividido) : txs

  // Busca transações fixas de TODOS os meses para aparecerem no gráfico pizza
  const fixosTodos = await carregarFixosTodos()

  // Combina transações do ciclo com fixas de todos os meses, evitando duplicatas
  const idsDoCiclo = new Set(filtradas.map(t => t.id))
  const fixosForaDoCiclo = fixosTodos.filter(t => !idsDoCiclo.has(t.id))
  const todasParaGrafico = [...filtradas, ...fixosForaDoCiclo]

  // Transações fixas aparecem na distribuição de gastos do gráfico
  const saidas = todasParaGrafico.filter(t => t.tipo === 'saida')
  atualizarGrafico(saidas)
}

export async function updateHeader(): Promise<void> {
  const ciclo = appStore.getCicloAtual()
  const transacoes = appStore.getTransacoes()
  const state = getAuthState()
  const config = appStore.getState()

  // Saldo Final inclui transações do ciclo atual + transações fixas de TODOS os meses
  let totais = calcularTotais(transacoes)
  try {
    // Reusa transações fixas já carregadas pelo gráfico (evita busca duplicada)
    const fixosTodos = await carregarFixosTodos()

    // Fixas que já estão no ciclo não precisam ser somadas novamente
    const idsCiclo = new Set(transacoes.map(t => t.id))
    const fixosForaDoCiclo = fixosTodos.filter(t => !idsCiclo.has(t.id))

    const entradasExtras = fixosForaDoCiclo.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0)
    const saidasExtras = fixosForaDoCiclo.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0)

    // Ajustes manuais de saldo final (invisíveis na UI): apenas os ajustes cuja
    // data cai dentro do ciclo selecionado afetam o saldo final.
    let ajustesEntradas = 0
    let ajustesSaidas = 0
    try {
      const state = getAuthState()
      const userId = state.user?.id
      if (userId) {
        const dataInicio = formatDateLocalISO(ciclo.inicio)
        const dataFim = formatDateLocalISO(ciclo.fim)
        const somas = await somarAjustesSaldo({ userId, dataInicio, dataFim })
        ajustesEntradas = somas.entradas
        ajustesSaidas = somas.saidas
      }
    } catch (err) {
      logger.error('Erro ao buscar ajustes de saldo', err as any)
    }

    totais = {
      entradas: totais.entradas + entradasExtras + ajustesEntradas,
      saidas: totais.saidas + saidasExtras + ajustesSaidas,
      saldo: (totais.entradas + entradasExtras + ajustesEntradas) - (totais.saidas + saidasExtras + ajustesSaidas),
    }
  } catch (err) {
    logger.error('Erro ao buscar todas as transações para saldo final', err as any)
  }

  atualizarHeader({
    cicloDatas: formatarIntervaloCiclo(ciclo.inicio, ciclo.fim),
    totais,
    onCicloAnterior: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset - 1)
      // carregarCicloComFeedback será injetado pelo main.ts
    },
    onCicloProximo: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset + 1)
      // carregarCicloComFeedback será injetado pelo main.ts
    },
    onAlterarDiaCiclo: async (diaInicio, diaFim) => {
      const state = getAuthState()
      const userId = state.user?.id ?? null
      appStore.setConfiguracaoCiclo(diaInicio, diaFim)
      await salvarConfiguracaoCiclo(diaInicio, diaFim, userId)
      debouncedUpdateDashboard()
    },
    onFixosClick: () => {
      // handleAbrirFixos será injetado pelo main.ts
    },
    user: state.user?.email || 'Usuario',
    diaInicioCiclo: config.diaInicioCiclo,
    diaFimCiclo: config.diaFimCiclo,
  })
}

function updateLoadingStates(): void {
  // Atualiza botão de salvar do formulário
  const btnSalvar = document.querySelector('#transaction-form button[type="submit"]') as HTMLButtonElement
  if (btnSalvar) {
    const loading = appStore.isLoading('salvando')
    btnSalvar.disabled = loading
    btnSalvar.textContent = loading ? 'Salvando...' : 'Guardar'
  }
}

function calcularTotais(txs: Transacao[]): TotaisCiclo {
  const entradas = txs.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0)
  const saidas = txs.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0)
  return { entradas, saidas, saldo: entradas - saidas }
}

const debouncedUpdateDashboard = debounce(() => updateDashboard(), 250)

export { limparCampoBusca, carregarFixosTodos }
