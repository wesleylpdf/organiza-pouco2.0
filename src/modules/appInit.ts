import { appStore } from '@/stores/AppState'
import { initAuth, onAuthChange, getAuthState } from '@/hooks/useAuth'
import { useCategorias } from '@/hooks/useCategorias'
import { criarAuthForm } from '@/components/AuthForm'
import { criarHeader } from '@/components/Header'
import { criarTransacaoForm } from '@/components/TransacaoForm'
import { criarGrafico } from '@/components/GraficoPizza'
import { criarTransacaoList, aplicarOrdemSalva } from '@/components/TransacaoList'
import {
  buscarConfiguracaoCiclo,
  salvarConfiguracaoCiclo as salvarConfiguracaoCicloSupabase,
  buscarFiltroOrdemPadrao,
  buscarMetaGastos,
  salvarMetaGastos,
} from '@/services/configuracoes'
import { setMetaGastosAtual, updateHeader } from '@/modules/ciclo'
import { debounce } from '@/utils/debounce'
import { sanitizarHTML } from '@/utils/format'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'
import type { OrdemTransacao } from '@/utils/ordenacao'
import { iniciarVerificacaoDeAtualizacoes } from '@/utils/atualizacao'

// Elementos DOM
let app: HTMLElement
let authContainer: HTMLElement
let mainContainer: HTMLElement

// Hooks
const categoriasHook = useCategorias()

// Referência aos handlers atuais e AbortController para evitar duplicação de listeners globais
let currentHandlers: AppInitHandlers | null = null
let windowListenersAbort: AbortController | null = null
let ultimoUserIdInicializado: string | null = null

// Debounce para atualização do dashboard ao alterar configuração de ciclo
const debouncedUpdateDashboard = debounce(() => {
  void currentHandlers?.updateDashboard()
}, 250)

// Controle da tela de carregamento com porcentagem
let carregamentoEl: HTMLElement | null = null
let carregamentoPercentual = 0

function criarTelaCarregamento(nomeUsuario: string): void {
  const existente = document.getElementById('tela-carregamento')
  if (existente) existente.remove()

  const nomeLimpo = sanitizarHTML((nomeUsuario || 'Usuário').split('@')[0])

  carregamentoEl = document.createElement('div')
  carregamentoEl.id = 'tela-carregamento'
  carregamentoEl.className = 'fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] p-4'
  carregamentoEl.innerHTML = `
    <div class="text-center">
      <img id="carregamento-logo" src="logo-organiza.jpeg" alt="Organiza Pouco" class="mx-auto mb-6 w-24 h-24 rounded-full object-cover border-2 border-emerald-500 dark:border-emerald-400">
      <h3 id="carregamento-titulo" class="text-xl font-bold text-white mb-1">Organiza Pouco</h3>
      <p id="carregamento-boas-vindas" class="text-base font-semibold text-slate-200 mb-3">Bem-vindo, ${nomeLimpo}!</p>
      <p id="carregamento-texto" class="text-emerald-400 mb-6">Iniciando aplicação...</p>
      <div class="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto mb-4">
        <div id="carregamento-barra" class="h-full bg-emerald-500 w-0 transition-all duration-200"></div>
      </div>
      <span id="carregamento-percentual" class="text-2xl font-black text-white">0%</span>
    </div>
  `
  mainContainer.appendChild(carregamentoEl)
}

function atualizarCarregamento(percentual: number, texto?: string): void {
  carregamentoPercentual = Math.min(100, Math.max(0, percentual))
  const barra = document.getElementById('carregamento-barra')
  const pct = document.getElementById('carregamento-percentual')
  const txt = document.getElementById('carregamento-texto')
  if (barra) barra.style.width = `${carregamentoPercentual}%`
  if (pct) pct.textContent = `${carregamentoPercentual}%`
  if (texto && txt) txt.textContent = texto
}

async function avancarCarregamento(percentual: number, texto?: string, pausaMs = 120): Promise<void> {
  atualizarCarregamento(percentual, texto)
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setTimeout(resolve, pausaMs))
    } else {
      setTimeout(resolve, pausaMs)
    }
  })
}

function removerTelaCarregamento(): void {
  const tela = document.getElementById('tela-carregamento')
  if (tela) tela.remove()
  carregamentoEl = null
}

// Controle do carregamento de navegação de ciclo (voltar/avançar) - texto dentro dos botoes
let btnCicloAnterior: HTMLButtonElement | null = null
let btnCicloProximo: HTMLButtonElement | null = null

function atualizarCarregamentoCicloBtns(percentual: number): void {
  if (btnCicloAnterior) btnCicloAnterior.textContent = `← ${percentual}%`
  if (btnCicloProximo) btnCicloProximo.textContent = `→ ${percentual}%`
}

/**
 * Desabilita (ou reabilita) todos os botões da aplicação durante o carregamento de ciclo:
 * Guardar, Editar, Excluir, FIXOS, Voltar/Avançar ciclo e Salvar configuração.
 */
function setBotoesDesabilitados(desabilitado: boolean): void {
  const seletores = [
    '#ciclo-anterior', '#ciclo-proximo', '#ciclo-hoje', '#salvar-config-ciclo',
    '#transaction-form button[type="submit"]', '#fixos-btn',
    'button[data-action="edit"]', 'button[data-action="delete"]',
  ]
  seletores.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const btn = el as HTMLButtonElement
      btn.disabled = desabilitado
    })
  })
}

async function carregarCicloComFeedback(updateDashboard: () => Promise<void>): Promise<void> {
  btnCicloAnterior = document.getElementById('ciclo-anterior') as HTMLButtonElement | null
  btnCicloProximo = document.getElementById('ciclo-proximo') as HTMLButtonElement | null
  const textoAnteriorOriginal = btnCicloAnterior?.textContent ?? '←'
  const textoProximoOriginal = btnCicloProximo?.textContent ?? '→'
  setBotoesDesabilitados(true)
  try {
    atualizarCarregamentoCicloBtns(0)
    await new Promise((r) => setTimeout(r, 150))
    await updateDashboard()
    atualizarCarregamentoCicloBtns(100)
    await new Promise((r) => setTimeout(r, 150))
  } catch (err) {
    logger.error('Erro ao carregar ciclo', err as Error)
  } finally {
    if (btnCicloAnterior) btnCicloAnterior.textContent = textoAnteriorOriginal
    if (btnCicloProximo) btnCicloProximo.textContent = textoProximoOriginal
    setBotoesDesabilitados(false)
  }
}

// Carrega configuração de ciclo do usuário (Supabase com fallback localStorage)
async function carregarConfiguracaoCiclo(userId: string | null): Promise<void> {
  if (userId) {
    try {
      const salva = await buscarConfiguracaoCiclo(userId)
      if (salva) {
        appStore.setConfiguracaoCiclo(salva.dia_inicio_ciclo, salva.dia_fim_ciclo)
        return
      }
    } catch (err) {
      logger.error('Erro ao buscar configuração de ciclo no Supabase', err as Error)
    }
  }

  const salvoLocal = localStorage.getItem(`configuracao_ciclo_${userId ?? 'anonimo'}`)
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
  userId: string | null
): Promise<void> {
  if (!userId) {
    localStorage.setItem(`configuracao_ciclo_anonimo`, JSON.stringify({ diaInicio, diaFim }))
    return
  }
  try {
    await salvarConfiguracaoCicloSupabase(diaInicio, diaFim, userId)
  } catch (err) {
    logger.error('Erro ao salvar configuração de ciclo no Supabase', err as Error)
    localStorage.setItem(`configuracao_ciclo_${userId}`, JSON.stringify({ diaInicio, diaFim }))
  }
}

async function carregarMetaGastos(userId: string | null): Promise<void> {
  const chaveLocal = `meta_gastos_${userId ?? 'anonimo'}`
  const localVal = localStorage.getItem(chaveLocal)
  if (localVal != null && localVal !== '') {
    const num = Number(localVal)
    if (!isNaN(num) && num > 0) {
      setMetaGastosAtual(num, userId)
    }
  }

  if (userId) {
    try {
      const metaSupabase = await buscarMetaGastos(userId)
      if (metaSupabase != null && metaSupabase > 0) {
        setMetaGastosAtual(metaSupabase, userId)
        localStorage.setItem(chaveLocal, String(metaSupabase))
      } else if (metaSupabase === null && localVal == null) {
        setMetaGastosAtual(null, userId)
      }
    } catch {
      // Caso a coluna meta_gastos ainda não exista no Supabase, mantém o valor do localStorage
    }
  }
}

async function salvarMetaGastosUsuario(meta: number | null, userId: string | null): Promise<void> {
  const chaveLocal = `meta_gastos_${userId ?? 'anonimo'}`
  if (meta != null && meta > 0) {
    localStorage.setItem(chaveLocal, String(meta))
  } else {
    localStorage.removeItem(chaveLocal)
  }
  setMetaGastosAtual(meta, userId)

  if (userId) {
    try {
      await salvarMetaGastos(meta, userId)
    } catch {
      // Mantém salvo no localStorage caso a coluna ainda não exista no Supabase
    }
  }
}

interface AppInitHandlers {
  handleSalvar: (data: any) => Promise<void>
  handleCancelarEdicao: () => void
  handleGerenciarCategorias: () => void
  handleAbrirFixos: () => Promise<void>
  handleExportar: () => void
  updateDashboard: () => Promise<void>
  updateLista: () => Promise<void>
  limparCacheFixos?: () => void
}

let limparFormEdicao: (() => void) | null = null

export function limparFormEdicaoAtual(): void {
  limparFormEdicao?.()
}

async function setupApp(
  userEmail: string,
  handlers: AppInitHandlers
): Promise<void> {
  logger.debug('Configurando aplicação')
  currentHandlers = handlers

  // Cancela listeners globais anteriores caso setupApp seja chamado novamente
  windowListenersAbort?.abort()
  windowListenersAbort = new AbortController()
  const { signal } = windowListenersAbort

  // Inicializa offset do ciclo (sempre 0 — o getCicloAtual já ajusta internamente)
  appStore.setCycleOffset(0)

  // Cria estrutura DOM imediatamente para exibir a tela de carregamento desde o 0%
  const headerContainer = document.createElement('div')
  const formContainer = document.createElement('div')
  formContainer.id = 'form-container'
  const chartContainer = document.createElement('div')
  chartContainer.id = 'chart-container'
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

  const nomeExibicao = userEmail || getAuthState().user?.email || 'Usuário'
  criarTelaCarregamento(nomeExibicao)

  try {
    await avancarCarregamento(0, 'Iniciando aplicação...', 80)

    // Carrega configuração de ciclo, meta de gastos e categorias em paralelo
    await avancarCarregamento(20, 'Carregando configurações e categorias...', 100)
    const userId = getAuthState().user?.id ?? null
    await Promise.all([
      carregarConfiguracaoCiclo(userId),
      carregarMetaGastos(userId),
      categoriasHook.carregarCategorias(),
    ])

    // Botão de exportação e componentes da interface
    await avancarCarregamento(40, 'Criando interface...', 100)
    exportContainer.className = 'max-w-3xl mx-auto pb-8 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 p-4 rounded-3xl shadow-md'
    exportContainer.innerHTML = `
      <select id="export-format" class="flex-1 bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
        <option value="csv">Exportar como CSV</option>
        <option value="pdf">Exportar como PDF</option>
        <option value="xlsx">Exportar como Excel</option>
      </select>
      <button id="export-btn" class="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm hover:bg-blue-700 transition shadow-sm">Exportar</button>
    `

    criarHeader(headerContainer, handlers.handleAbrirFixos)
    ;({ limparFormEdicao } = criarTransacaoForm(
      formContainer,
      handlers.handleSalvar,
      handlers.handleCancelarEdicao,
      handlers.handleGerenciarCategorias
    ))
    criarGrafico(chartContainer)
    criarTransacaoList(listContainer)

    // Restaura preferência de ordem do usuário (do localStorage ou Supabase)
    await avancarCarregamento(60, 'Carregando preferências...', 100)
    const userIdOrdem = getAuthState().user?.id ?? null
    if (userIdOrdem) {
      try {
        const ordemSalva = await buscarFiltroOrdemPadrao(userIdOrdem)
        if (ordemSalva) {
          aplicarOrdemSalva(ordemSalva as OrdemTransacao)
        }
      } catch {
        // Ignora erro de busca, mantém ordem padrão
      }
    }

    // Eventos de ciclo com feedback de carregamento
    document.getElementById('ciclo-anterior')!.addEventListener('click', () => {
      const currentOffset = appStore.getState().cycleOffset
      appStore.setCycleOffset(currentOffset - 1)
      carregarCicloComFeedback(handlers.updateDashboard)
    })

    document.getElementById('ciclo-proximo')!.addEventListener('click', () => {
      const currentOffset = appStore.getState().cycleOffset
      appStore.setCycleOffset(currentOffset + 1)
      carregarCicloComFeedback(handlers.updateDashboard)
    })

    document.getElementById('ciclo-hoje')?.addEventListener('click', () => {
      if (appStore.getState().cycleOffset === 0) return
      appStore.setCycleOffset(0)
      carregarCicloComFeedback(handlers.updateDashboard)
    })

    // Evento de alteração de configuração do ciclo (início/fim)
    window.addEventListener('cicloConfigChange', async (e: Event) => {
      const { diaInicio, diaFim } = (e as CustomEvent).detail
      appStore.setConfiguracaoCiclo(diaInicio, diaFim)
      appStore.limparCacheCiclo()
      const userId = getAuthState().user?.id ?? null
      await salvarConfiguracaoCiclo(diaInicio, diaFim, userId)
      debouncedUpdateDashboard()
    }, { signal })

    // Evento de alteração da Meta de Gastos do ciclo
    window.addEventListener('metaGastosChange', async (e: Event) => {
      const { meta } = (e as CustomEvent).detail
      const currentUserId = getAuthState().user?.id ?? null
      await salvarMetaGastosUsuario(meta, currentUserId)
      await updateHeader()
      toast.success(meta ? 'Meta de gastos atualizada!' : 'Meta de gastos removida!')
    }, { signal })

    // Evento de clique numa fatia do Gráfico de Pizza para filtrar por categoria
    window.addEventListener('categoriaGraficoClick', async (e: Event) => {
      const { categoria } = (e as CustomEvent).detail
      const searchEl = document.getElementById('filter-descricao') as HTMLInputElement | null
      if (!searchEl) return
      const valorAtual = searchEl.value.trim().toLowerCase()
      const novaCat = String(categoria || '').trim()
      if (!novaCat || valorAtual === novaCat.toLowerCase()) {
        searchEl.value = ''
      } else {
        searchEl.value = novaCat
      }
      await handlers.updateLista()
    }, { signal })

    // Evento de alteração do filtro rápido por status (Todos | Pendentes | Pagos)
    window.addEventListener('filtroStatusChange', async () => {
      await handlers.updateLista()
    }, { signal })

    // Evento de alteração do status Pago/Pendente a partir do modal de Fixos
    window.addEventListener('statusPagoChange', async () => {
      await handlers.updateLista()
    }, { signal })

    // Evento de exportação
    document.getElementById('export-btn')!.addEventListener('click', async () => {
      const btn = document.getElementById('export-btn') as HTMLButtonElement
      btn.disabled = true
      btn.textContent = 'Exportando...'
      btn.classList.remove('bg-blue-600', 'hover:bg-blue-700')
      btn.classList.add('bg-rose-500', 'hover:bg-rose-600')
      try {
        await handlers.handleExportar()
      } finally {
        btn.disabled = false
        btn.textContent = 'Exportar'
        btn.classList.remove('bg-rose-500', 'hover:bg-rose-600')
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700')
      }
    })

    // Outros eventos
    document.getElementById('filter-dividido')!.addEventListener('change', async () => await handlers.updateLista())
    const debouncedUpdateLista = debounce(async () => await handlers.updateLista(), 300)
    document.getElementById('filter-descricao')!.addEventListener('input', () => debouncedUpdateLista())
    window.addEventListener('themechange', () => handlers.updateDashboard(), { signal })

    // Primeira carga das transações e atualização do dashboard
    await avancarCarregamento(80, 'Processando transações...', 100)
    await handlers.updateDashboard()

    await avancarCarregamento(100, 'Pronto!', 250)
  } finally {
    removerTelaCarregamento()
  }
}

function init(handlers: AppInitHandlers): void {
  // Restaura tema
  const temaSalvo = localStorage.getItem('theme')
  if (temaSalvo === 'dark') {
    document.documentElement.classList.add('dark')
  }

  // Cria containers
  app = document.getElementById('app')!
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
      // Evita recriar a interface e resetar o ciclo durante refresh de token do mesmo usuário
      if (ultimoUserIdInicializado === state.user.id) return
      ultimoUserIdInicializado = state.user.id

      logger.info('Usuário autenticado', { email: state.user.email })
      authContainer.innerHTML = ''
      authContainer.classList.add('hidden')
      mainContainer.classList.remove('hidden')
      appStore.reset()
      handlers.limparCacheFixos?.()
      setupApp(state.user.email ?? '', handlers)
    } else {
      ultimoUserIdInicializado = null
      windowListenersAbort?.abort()
      windowListenersAbort = null

      logger.info('Usuário desautenticado')
      appStore.reset()
      handlers.limparCacheFixos?.()
      mainContainer.classList.add('hidden')
      mainContainer.innerHTML = ''
      authContainer.classList.remove('hidden')
      criarAuthForm(authContainer)
    }
  })

  window.addEventListener('beforeunload', unsubAuth)

  // Detecta e aplica novas versões sem precisar de Ctrl+Shift+R
  iniciarVerificacaoDeAtualizacoes()
}

export { init, setupApp, carregarConfiguracaoCiclo, salvarConfiguracaoCiclo }
