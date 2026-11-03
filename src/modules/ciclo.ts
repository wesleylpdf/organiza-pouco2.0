import { appStore } from '@/stores/AppState'
import type { OrdemTransacao } from '@/utils/ordenacao'
import { getAuthState } from '@/hooks/useAuth'
import { useTransacoes } from '@/hooks/useTransacoes'
import { atualizarHeader } from '@/components/Header'
import { atualizarGrafico, atualizarBadgeFiltroGrafico } from '@/components/GraficoPizza'
import { renderLista, setOrdem, getFiltroStatus, setFiltroStatus } from '@/components/TransacaoList'
import { listarTransacoes } from '@/services/transacoes'
import { somarAjustesSaldo } from '@/services/ajustes'
import { formatarIntervaloCiclo, formatDateLocalISO } from '@/utils/ciclo'
import { debounce } from '@/utils/debounce'
import { filtrarTransacoes } from '@/utils/filtroTransacoes'
import { logger } from '@/utils/logger'
import { salvarConfiguracaoCiclo } from '@/modules/appInit'
import type { Transacao, TotaisCiclo } from '@/types'

// Hook de transações
const transacoesHook = useTransacoes()

// Cache de transações fixas de todos os meses por usuário (evita buscas duplicadas no gráfico e no header)
let fixosTodosCache: Transacao[] | null = null
let fixosTodosUserId: string | null = null

// Cache da meta de gastos do ciclo por usuário
let metaGastosCache: number | null = null
let metaGastosUserId: string | null = null

// Cache dos ajustes de saldo do ciclo atual
let ajustesCicloCache: { entradas: number; saidas: number } | null = null
let ajustesCicloKey: string | null = null

export function setMetaGastosAtual(meta: number | null, userId: string | null): void {
  metaGastosCache = meta
  metaGastosUserId = userId
}

export function getMetaGastosAtual(userId: string | null): number | null {
  return metaGastosUserId === userId ? metaGastosCache : null
}

export function limparCacheFixos(): void {
  fixosTodosCache = null
  fixosTodosUserId = null
  metaGastosCache = null
  metaGastosUserId = null
  ajustesCicloCache = null
  ajustesCicloKey = null
}

// Callbacks injetados pelo main.ts (evita dependência circular entre módulos)
interface CicloHandlers {
  handleEditar: (id: string) => void
  handleExcluir: (id: string) => Promise<boolean>
}

let cicloHandlers: CicloHandlers | null = null

export function initCiclo(handlers: CicloHandlers): void {
  cicloHandlers = handlers

  // Re-renderiza a lista quando a ordenação muda no select
  window.addEventListener('ordemChange', async () => {
    await updateLista()
  })
}

function limparCampoBusca(): void {
  const searchEl = document.getElementById('filter-descricao') as HTMLInputElement | null
  if (searchEl) searchEl.value = ''
  atualizarBadgeFiltroGrafico('')
  setFiltroStatus('todos')
}

async function carregarFixosTodos(): Promise<Transacao[]> {
  const currentUserId = getAuthState().user?.id ?? null
  if (fixosTodosCache && fixosTodosUserId === currentUserId) return fixosTodosCache
  const todasTransacoes = await listarTransacoes({ fixo: true })
  fixosTodosCache = todasTransacoes.filter(t => t.fixo)
  fixosTodosUserId = currentUserId
  return fixosTodosCache
}

async function carregarAjustesCiclo(forcarRecarregar = false): Promise<{ entradas: number; saidas: number }> {
  const userId = getAuthState().user?.id
  if (!userId) return { entradas: 0, saidas: 0 }
  const ciclo = appStore.getCicloAtual()
  const dataInicio = formatDateLocalISO(ciclo.inicio)
  const dataFim = formatDateLocalISO(ciclo.fim)
  const key = `${userId}_${dataInicio}_${dataFim}`
  if (!forcarRecarregar && ajustesCicloCache && ajustesCicloKey === key) {
    return ajustesCicloCache
  }
  try {
    const somas = await somarAjustesSaldo({ userId, dataInicio, dataFim })
    ajustesCicloCache = somas
    ajustesCicloKey = key
    return somas
  } catch (err) {
    logger.error('Erro ao buscar ajustes de saldo', err as Error)
    return { entradas: 0, saidas: 0 }
  }
}

export async function updateDashboard(): Promise<void> {
  try {
    logger.debug('Atualizando dashboard')

    // Mostra loading
    updateLoadingStates()

    // Carrega transações via hook
    await transacoesHook.carregarTransacoes()
    ajustesCicloCache = null

    await updateLista()

    await updateHeader()
  } catch (err) {
    logger.error('Erro ao atualizar dashboard', err as Error)
  }
}

export async function updateLista(): Promise<void> {
  const filterEl = document.getElementById('filter-dividido') as HTMLInputElement | null
  const showOnlyDividido = filterEl?.checked || false
  const searchEl = document.getElementById('filter-descricao') as HTMLInputElement | null
  const searchTextoOriginal = searchEl?.value.trim() || ''
  const search = searchTextoOriginal.toLowerCase()
  const transacoes = appStore.getTransacoes()
  const userId = getAuthState().user?.id ?? null
  const filtradas = filtrarTransacoes(transacoes, search, showOnlyDividido, getFiltroStatus(), userId)

  atualizarBadgeFiltroGrafico(searchTextoOriginal)

  const ordemEl = document.getElementById('filter-ordem') as HTMLSelectElement | null
  if (ordemEl) setOrdem(ordemEl.value as OrdemTransacao)

  const temTransacoesNoCiclo = transacoes.length > 0

  const chartContainer = document.getElementById('chart-container')
  const listContainer = document.getElementById('list-container')
  const exportContainer = document.getElementById('export-container')

  if (chartContainer) chartContainer.classList.toggle('hidden', !temTransacoesNoCiclo)
  if (listContainer) listContainer.classList.toggle('hidden', !temTransacoesNoCiclo)
  if (exportContainer) exportContainer.classList.toggle('hidden', !temTransacoesNoCiclo)

  const ajustes = await carregarAjustesCiclo()

  renderLista(
    filtradas,
    (id) => cicloHandlers!.handleEditar(id),
    (id) => cicloHandlers!.handleExcluir(id),
    ajustes
  )

  if (temTransacoesNoCiclo) {
    await updateGrafico(transacoes)
  }
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
  const currentUserId = state.user?.id ?? null

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


        const somas = await carregarAjustesCiclo()
        ajustesEntradas = somas.entradas
        ajustesSaidas = somas.saidas
      }
    } catch (err) {
      logger.error('Erro ao buscar ajustes de saldo', err as Error)
    }

    totais = {
      entradas: totais.entradas + entradasExtras + ajustesEntradas,
      saidas: totais.saidas + saidasExtras + ajustesSaidas,
      saldo: (totais.entradas + entradasExtras + ajustesEntradas) - (totais.saidas + saidasExtras + ajustesSaidas),
    }
  } catch (err) {
    logger.error('Erro ao buscar todas as transações para saldo final', err as Error)
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
    user: (state.user?.email || 'Usuario').split('@')[0],
    diaInicioCiclo: config.diaInicioCiclo,
    diaFimCiclo: config.diaFimCiclo,
    cycleOffset: config.cycleOffset,
    metaGastos: getMetaGastosAtual(currentUserId),
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
