import { initAuth, onAuthChange, getAuthState } from '@/hooks/useAuth'
import { useTransacoes } from '@/hooks/useTransacoes'
import { useCategorias } from '@/hooks/useCategorias'
import { appStore } from '@/stores/AppState'
import { criarAuthForm } from '@/components/AuthForm'
import { criarHeader, atualizarHeader } from '@/components/Header'
import { criarTransacaoForm, preencherFormEdicao, atualizarSelectCategorias } from '@/components/TransacaoForm'
import { criarGrafico, atualizarGrafico } from '@/components/GraficoPizza'
import { criarTransacaoList, renderLista } from '@/components/TransacaoList'
import { criarModalCategorias } from '@/components/ModalCategorias'
import { formatarIntervaloCiclo, getOffsetInicial } from '@/utils/ciclo'
import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'
import { buscarConfiguracaoCiclo, salvarConfiguracaoCiclo as salvarConfiguracaoCicloSupabase } from '@/services/configuracoes'
import type { Transacao, TotaisCiclo } from '@/types'

// Elementos DOM
const app = document.getElementById('app')!
let authContainer: HTMLElement
let mainContainer: HTMLElement

// Hook de transações
const transacoesHook = useTransacoes()
const categoriasHook = useCategorias()

// Debounce para navegação de ciclos
const debouncedUpdateDashboard = debounce(() => updateDashboard(), 250)

// Inicialização
function init(): void {
  // Restaura tema
  const temaSalvo = localStorage.getItem('theme')
  if (temaSalvo === 'dark') {
    document.documentElement.classList.add('dark')
  }

  // Cria containers
  authContainer = document.createElement('div')
  mainContainer = document.createElement('div')
  mainContainer.id = 'main-app'
  mainContainer.className = 'hidden'

  app.appendChild(authContainer)
  app.appendChild(mainContainer)

  // Inicializa auth
  const unsubAuth = initAuth()

  onAuthChange((state) => {
    if (state.loading) return

    if (state.user) {
      logger.info('Usuário autenticado', { email: state.user.email })
      authContainer.innerHTML = ''
      authContainer.classList.add('hidden')
      mainContainer.classList.remove('hidden')
      setupApp(state.user.email || 'Usuario')
    } else {
      logger.info('Usuário desautenticado')
      mainContainer.classList.add('hidden')
      mainContainer.innerHTML = ''
      authContainer.classList.remove('hidden')
      criarAuthForm(authContainer)
    }
  })

  window.addEventListener('beforeunload', unsubAuth)
}

async function setupApp(_userEmail: string): Promise<void> {
  logger.debug('Configurando aplicação')

  // Inicializa offset do ciclo
  const offsetInicial = getOffsetInicial()
  appStore.setCycleOffset(offsetInicial)

  // Carrega configuração de ciclo do usuário (localStorage ou Supabase)
  await carregarConfiguracaoCiclo(_userEmail)

  // Carrega categorias do usuário (aguarda para popular o select antes do form)
  await categoriasHook.carregarCategorias()

  // Cria estrutura DOM
  const headerContainer = document.createElement('div')
  const formContainer = document.createElement('div')
  formContainer.id = 'form-container'
  const chartContainer = document.createElement('div')
  const listContainer = document.createElement('div')
  listContainer.id = 'list-container'
  const exportContainer = document.createElement('div')
  exportContainer.id = 'export-container'

  mainContainer.innerHTML = ''
  mainContainer.appendChild(headerContainer)
  mainContainer.appendChild(formContainer)
  mainContainer.appendChild(chartContainer)
  mainContainer.appendChild(listContainer)
  mainContainer.appendChild(exportContainer)

  // Botão de exportação
  exportContainer.innerHTML = `
    <select id="export-format" class="bg-white dark:bg-slate-800 dark:text-white border px-3 rounded-full text-xs font-bold w-1/3">
      <option value="csv">Exportar como CSV</option>
      <option value="pdf">Exportar como PDF</option>
      <option value="xlsx">Exportar como Excel</option>
    </select>
    <button id="export-btn" class="bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs hover:bg-blue-700 transition">Exportar</button>
  `

  // Inicializa componentes
  criarHeader(headerContainer)
  criarTransacaoForm(formContainer, handleSalvar, handleCancelarEdicao, handleGerenciarCategorias)
  criarGrafico(chartContainer)
  criarTransacaoList(listContainer)

  // Eventos de ciclo com debounce
  document.getElementById('ciclo-anterior')!.addEventListener('click', () => {
    const currentOffset = appStore.getState().cycleOffset
    appStore.setCycleOffset(currentOffset - 1)
    debouncedUpdateDashboard()
  })

  document.getElementById('ciclo-proximo')!.addEventListener('click', () => {
    const currentOffset = appStore.getState().cycleOffset
    appStore.setCycleOffset(currentOffset + 1)
    debouncedUpdateDashboard()
  })

  // Evento de alteração de configuração do ciclo (início/fim)
  window.addEventListener('cicloConfigChange', async (e: Event) => {
    const { diaInicio, diaFim } = (e as CustomEvent).detail
    appStore.setConfiguracaoCiclo(diaInicio, diaFim)
    await salvarConfiguracaoCiclo(diaInicio, diaFim, _userEmail)
    debouncedUpdateDashboard()
  })

  // Evento de exportação
  document.getElementById('export-btn')!.addEventListener('click', handleExportar)

  // Outros eventos
  document.getElementById('btn-aplicar-fixos')!.addEventListener('click', handleAplicarFixos)
  document.getElementById('filter-fixed')!.addEventListener('change', () => updateLista())
  window.addEventListener('themechange', () => updateDashboard())

  // Subscribe to store changes
  appStore.subscribe(() => {
    updateLoadingStates()
  })

  // Primeira carga (depois dos componentes existirem no DOM)
  updateDashboard()
}

// Carrega configuração de ciclo do usuário (Supabase com fallback localStorage)
async function carregarConfiguracaoCiclo(userEmail: string): Promise<void> {
  try {
    const salva = await buscarConfiguracaoCiclo()
    if (salva) {
      appStore.setConfiguracaoCiclo(salva.dia_inicio_ciclo, salva.dia_fim_ciclo)
      return
    }
  } catch {
    // Ignora erro do Supabase, tenta localStorage
  }

  const salvoLocal = localStorage.getItem(`configuracao_ciclo_${userEmail}`)
  if (salvoLocal) {
    try {
      const { diaInicio, diaFim } = JSON.parse(salvoLocal)
      appStore.setConfiguracaoCiclo(diaInicio, diaFim)
    } catch {
      // Ignora erro de parse, usa padrão
    }
  }
}

// Salva configuração de ciclo (Supabase + localStorage como fallback)
async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number,
  userEmail: string
): Promise<void> {
  const userId = getAuthState().user?.id
  try {
    await salvarConfiguracaoCicloSupabase(diaInicio, diaFim, userId!)
  } catch {
    // Se falhar no Supabase, salva no localStorage como fallback
    localStorage.setItem(`configuracao_ciclo_${userEmail}`, JSON.stringify({ diaInicio, diaFim }))
  }
}

async function updateDashboard(): Promise<void> {
  logger.debug('Atualizando dashboard')

  // Mostra loading
  updateLoadingStates()

  // Carrega transações via hook
  await transacoesHook.carregarTransacoes()

  updateLista()
  updateHeader()
}

function updateLista(): void {
  const filterEl = document.getElementById('filter-fixed') as HTMLInputElement | null
  const showOnlyFixed = filterEl?.checked || false
  const transacoes = appStore.getTransacoes()
  const filtradas = showOnlyFixed ? transacoes.filter(t => t.fixo) : transacoes

  renderLista(
    filtradas,
    (id) => handleEditar(id),
    (id) => handleExcluir(id)
  )

  updateGrafico(filtradas)
}

function updateGrafico(transacoes?: Transacao[]): void {
  const txs = transacoes ?? appStore.getTransacoes()
  const filterEl = document.getElementById('filter-fixed') as HTMLInputElement | null
  const showOnlyFixed = filterEl?.checked || false
  const filtradas = showOnlyFixed ? txs.filter(t => t.fixo) : txs
  const saidas = filtradas.filter(t => t.tipo === 'saida')
  atualizarGrafico(saidas)
}

function updateHeader(): void {
  const ciclo = appStore.getCicloAtual()
  const transacoes = appStore.getTransacoes()
  const state = getAuthState()
  const config = appStore.getState()

  atualizarHeader({
    cicloDatas: formatarIntervaloCiclo(ciclo.inicio, ciclo.fim),
    totais: calcularTotais(transacoes),
    onCicloAnterior: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset - 1)
      debouncedUpdateDashboard()
    },
    onCicloProximo: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset + 1)
      debouncedUpdateDashboard()
    },
    onAlterarDiaCiclo: async (diaInicio, diaFim) => {
      const state = getAuthState()
      appStore.setConfiguracaoCiclo(diaInicio, diaFim)
      await salvarConfiguracaoCiclo(diaInicio, diaFim, state.user?.email || 'Usuario')
      debouncedUpdateDashboard()
    },
    user: state.user?.email || 'Usuario',
    diaInicioCiclo: config.diaInicioCiclo,
    diaFimCiclo: config.diaFimCiclo,
  })
}

function updateLoadingStates(): void {
  // Atualiza botão de aplicar fixos
  const btnFixos = document.getElementById('btn-aplicar-fixos') as HTMLButtonElement
  if (btnFixos) {
    const loading = appStore.isLoading('aplicandoFixos')
    btnFixos.disabled = loading
    btnFixos.textContent = loading ? 'Aplicando...' : '📋 Aplicar fixos do ciclo anterior'
  }

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

async function handleSalvar(data: Parameters<typeof transacoesHook.salvarTransacao>[0]): Promise<void> {
  logger.debug('Salvando transação', { data })
  const success = await transacoesHook.salvarTransacao(data)

  if (success) {
    updateLista()
    updateHeader()
  }
}

function handleCancelarEdicao(): void {
  logger.debug('Cancelando edição')
  transacoesHook.cancelarEdicao()
}

function handleEditar(id: string): void {
  const transacoes = appStore.getTransacoes()
  const t = transacoes.find(tx => tx.id === id)
  if (!t) return

  logger.debug('Editando transação', { id })
  transacoesHook.iniciarEdicao(t)

  const formContainer = document.getElementById('form-container')!
  preencherFormEdicao(formContainer, t)
}

async function handleExcluir(id: string): Promise<void> {
  logger.debug('Excluindo transação', { id })
  const success = await transacoesHook.excluir(id)

  if (success) {
    updateLista()
    updateHeader()
  }
}

async function handleAplicarFixos(): Promise<void> {
  logger.debug('Aplicando transações fixas')
  const success = await transacoesHook.aplicarFixos()

  if (success) {
    updateLista()
    updateHeader()
  }
}

function handleExportar(): void {
  const formatEl = document.getElementById('export-format') as HTMLSelectElement | null
  const format = formatEl?.value || 'csv'
  const transacoes = appStore.getTransacoes()

  if (transacoes.length === 0) {
    toast.warning('Nenhuma transação para exportar')
    return
  }

  if (format === 'csv') {
    const headers = ['id', 'data', 'tipo', 'categoria', 'valor', 'fixo', 'descricao']
    const rows = transacoes.map((t) => [
      t.id,
      t.data,
      t.tipo,
      t.categoria,
      Number(t.valor),
      t.fixo ? 'Sim' : 'Não',
      t.descricao || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `transacoes-${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`${transacoes.length} transação(ões) exportada(s) para CSV`)
  } else {
    toast.warning(`Exportação para ${format.toUpperCase()} não disponível. Use CSV.`)
  }
}

function handleGerenciarCategorias(): void {
  logger.debug('Abrindo modal de categorias')
  criarModalCategorias(
    async (nome, icone, cor) => {
      const success = await categoriasHook.criarCategoria(nome, icone, cor)
      if (success) {
        atualizarSelectCategorias()
        updateGrafico()
      }
      return success
    },
    async (id, nome, icone, cor) => {
      const success = await categoriasHook.atualizarCategoria(id, nome, icone, cor)
      if (success) {
        atualizarSelectCategorias()
        updateGrafico()
      }
      return success
    },
    async (id) => {
      const success = await categoriasHook.excluirCategoria(id)
      if (success) {
        atualizarSelectCategorias()
        updateGrafico()
      }
      return success
    }
  )
}

init()
