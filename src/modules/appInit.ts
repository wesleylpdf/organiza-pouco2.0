import { appStore } from '@/stores/AppState'
import { initAuth, onAuthChange, getAuthState } from '@/hooks/useAuth'
import { useCategorias } from '@/hooks/useCategorias'
import { criarAuthForm } from '@/components/AuthForm'
import { criarHeader } from '@/components/Header'
import { criarTransacaoForm } from '@/components/TransacaoForm'
import { criarGrafico } from '@/components/GraficoPizza'
import { criarTransacaoList, aplicarOrdemSalva } from '@/components/TransacaoList'
import { buscarConfiguracaoCiclo, salvarConfiguracaoCiclo as salvarConfiguracaoCicloSupabase, buscarFiltroOrdemPadrao } from '@/services/configuracoes'
import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'
import type { OrdemTransacao } from '@/utils/ordenacao'
import { iniciarVerificacaoDeAtualizacoes } from '@/utils/atualizacao'

// Elementos DOM
let app: HTMLElement
let authContainer: HTMLElement
let mainContainer: HTMLElement

// Hooks
const categoriasHook = useCategorias()

// Debounce para navegação de ciclos
const debouncedUpdateDashboard = debounce(() => {
  // Sobrescrito por main.ts após a criação do módulo ciclo
}, 250)

// Controle da tela de carregamento com porcentagem
let carregamentoEl: HTMLElement | null = null
let carregamentoPercentual = 0

function criarTelaCarregamento(): void {
  carregamentoEl = document.createElement('div')
  carregamentoEl.id = 'tela-carregamento'
  carregamentoEl.className = 'fixed inset-0 bg-slate-900 flex items-center justify-center z-[9999] p-4'
  carregamentoEl.innerHTML = `
    <div class="text-center">
      <img id="carregamento-logo" src="logo-organiza.jpeg" alt="Organiza Pouco" class="mx-auto mb-6 w-24 h-24 rounded-full object-cover border-2 border-emerald-500 dark:border-emerald-400">
      <h3 id="carregamento-titulo" class="text-xl font-bold text-white mb-2">Organiza Pouco</h3>
      <p id="carregamento-texto" class="text-emerald-400 mb-6">Carregando seus dados...</p>
      <div class="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mx-auto mb-4">
        <div id="carregamento-barra" class="h-full bg-emerald-500 w-0 transition-width duration-300"></div>
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
    '#ciclo-anterior', '#ciclo-proximo', '#salvar-config-ciclo',
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
    btnCicloAnterior!.textContent = textoAnteriorOriginal
    btnCicloProximo!.textContent = textoProximoOriginal
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

interface AppInitHandlers {
  handleSalvar: (data: any) => Promise<void>
  handleCancelarEdicao: () => void
  handleGerenciarCategorias: () => void
  handleAbrirFixos: () => Promise<void>
  handleExportar: () => void
  updateDashboard: () => Promise<void>
  updateLista: () => Promise<void>
}

let limparFormEdicao: (() => void) | null = null

export function limparFormEdicaoAtual(): void {
  limparFormEdicao?.()
}

async function setupApp(
  _userEmail: string,
  handlers: AppInitHandlers
): Promise<void> {
  logger.debug('Configurando aplicação')

  // Inicializa offset do ciclo (sempre 0 — o getCicloAtual já ajusta internamente)
  appStore.setCycleOffset(0)

  // Carrega configuração de ciclo do usuário (localStorage ou Supabase)
  const userId = getAuthState().user?.id ?? null

  // Carrega configuração de ciclo e categorias em paralelo (independentes entre si)
  await Promise.all([
    carregarConfiguracaoCiclo(userId),
    categoriasHook.carregarCategorias(),
  ])

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

  // Tela de carregamento com porcentagem exibida imediatamente após o login,
  // para o usuário não ver tela branca enquanto os dados carregam.
  criarTelaCarregamento()
  atualizarCarregamento(10, 'Iniciando aplicação...')

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
  atualizarCarregamento(20, 'Criando interface...')
  criarHeader(headerContainer, handlers.handleAbrirFixos)
  ;({ limparFormEdicao } = criarTransacaoForm(
    formContainer,
    handlers.handleSalvar,
    handlers.handleCancelarEdicao,
    handlers.handleGerenciarCategorias
  ))
  criarGrafico(chartContainer)
  criarTransacaoList(listContainer)

  // Primeira carga (depois dos componentes existirem no DOM)
  atualizarCarregamento(40, 'Carregando dados...')

  // Restaura preferência de ordem do usuário (do localStorage ou Supabase)
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

  // Evento de alteração de configuração do ciclo (início/fim)
  window.addEventListener('cicloConfigChange', async (e: Event) => {
    const { diaInicio, diaFim } = (e as CustomEvent).detail
    appStore.setConfiguracaoCiclo(diaInicio, diaFim)
    const userId = getAuthState().user?.id
    if (userId) {
      await salvarConfiguracaoCiclo(diaInicio, diaFim, userId)
    }
    debouncedUpdateDashboard()
  })

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
  window.addEventListener('themechange', () => handlers.updateDashboard())

  // Subscribe to store changes
  appStore.subscribe(() => {
    // updateLoadingStates será movido para ciclo.ts
  })

  atualizarCarregamento(60, 'Processando transações...')

  // Primeira carga (depois dos componentes existirem no DOM)
  await handlers.updateDashboard()

  atualizarCarregamento(80, 'Atualizando interface...')

  atualizarCarregamento(100, 'Pronto!')
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
      logger.info('Usuário autenticado', { email: state.user.email })
      authContainer.innerHTML = ''
      authContainer.classList.add('hidden')
      mainContainer.classList.remove('hidden')
      appStore.reset()
      setupApp(state.user.email ?? '', handlers)
    } else {
      logger.info('Usuário desautenticado')
      appStore.reset()
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
