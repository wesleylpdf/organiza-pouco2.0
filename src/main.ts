/**
 * Entry point da aplicação. Orquestra os módulos e inicializa a UI.
 */

import { initAuth, onAuthChange } from '@/hooks/useAuth'
import { appStore } from '@/stores/AppState'
import { debounce } from '@/utils/debounce'
import { buscarConfiguracaoCiclo } from '@/services/configuracoes'
import { formatDateLocalISO } from '@/utils/ciclo'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'

import {
  preencherFormEdicao as preencherFormEdicaoForm,
  atualizarSelectCategorias as atualizarSelectCategoriasForm,
} from '@/components/TransacaoForm'

import { renderLista } from '@/components/TransacaoList'
import { atualizarHeader } from '@/components/Header'
import { atualizarGrafico } from '@/components/GraficoPizza'
import { criarModalCategorias } from '@/components/ModalCategorias'
import { criarModalFixos } from '@/components/ModalFixos'

import { useTransacoes } from '@/hooks/useTransacoes'
import { useCategorias } from '@/hooks/useCategorias'
import { listarTransacoes } from '@/services/transacoes'
import { somarAjustesSaldo } from '@/services/ajustes'

import { formatarIntervaloCiclo } from '@/utils/ciclo'
import { filtrarTransacoes } from '@/utils/filtroTransacoes'

import type { Transacao, TotaisCiclo } from '@/types'

const transacoesHook = useTransacoes()
const categoriasHook = useCategorias()

// Elementos DOM
const app = document.getElementById('app')!
let authContainer: HTMLElement
let mainContainer: HTMLElement

// Debounce para navegação de ciclos
const debouncedUpdateDashboard = debounce(() => updateDashboard(), 250)

// Cache de transações fixas de todos os meses (evita buscas duplicadas)
let fixosTodosCache: Transacao[] | null = null

function carregarFixosTodos(): Promise<Transacao[]> {
  return (async () => {
    if (fixosTodosCache) return fixosTodosCache
    const todasTransacoes = await listarTransacoes({})
    fixosTodosCache = todasTransacoes.filter((t) => t.fixo)
    return fixosTodosCache
  })()
}

function limparCacheFixos(): void {
  fixosTodosCache = null
}

// Controle da tela de carregamento com porcentagem
let carregamentoEl: HTMLElement | null = null

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

function removerTelaCarregamento(): void {
  if (carregamentoEl) {
    carregamentoEl.remove()
    carregamentoEl = null
  }
}

// Controle do carregamento de navegação de ciclo
let btnCicloAnterior: HTMLButtonElement | null = null
let btnCicloProximo: HTMLButtonElement | null = null

function atualizarCarregamentoCicloBtns(percentual: number): void {
  if (btnCicloAnterior) btnCicloAnterior.textContent = `← ${percentual}%`
  if (btnCicloProximo) btnCicloProximo.textContent = `→ ${percentual}%`
}

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

async function carregarCicloComFeedback(): Promise<void> {
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
    logger.error('Erro ao carregar ciclo', err as any)
    appStore.setError('Erro ao carregar ciclo')
    toast.error('Erro ao carregar ciclo')
  } finally {
    btnCicloAnterior!.textContent = textoAnteriorOriginal
    btnCicloProximo!.textContent = textoProximoOriginal
    setBotoesDesabilitados(false)
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
    const { salvarConfiguracaoCiclo: salvarSupabase } = await import('@/services/configuracoes')
    await salvarSupabase(diaInicio, diaFim, userId)
    toast.success('Configuração de ciclo salva!')
  } catch (err) {
    logger.error('Erro ao salvar configuração de ciclo no Supabase', err as any)
    localStorage.setItem(`configuracao_ciclo_${userId}`, JSON.stringify({ diaInicio, diaFim }))
    toast.error('Erro ao salvar configuração de ciclo')
  }
}

function calcularTotais(txs: Transacao[]): TotaisCiclo {
  const entradas = txs
    .filter((t) => t.tipo === 'entrada')
    .reduce((acc, t) => acc + Number(t.valor), 0)
  const saidas = txs
    .filter((t) => t.tipo === 'saida')
    .reduce((acc, t) => acc + Number(t.valor), 0)
  return { entradas, saidas, saldo: entradas - saidas }
}

async function updateGrafico(transacoes?: Transacao[]): Promise<void> {
  const txs = transacoes ?? appStore.getTransacoes()
  const filterEl = document.getElementById(
    'filter-dividido'
  ) as HTMLInputElement | null
  const showOnlyDividido = filterEl?.checked || false
  const filtradas = showOnlyDividido ? txs.filter((t) => t.dividido) : txs

  const fixosTodos = await carregarFixosTodos()

  const idsDoCiclo = new Set(filtradas.map((t) => t.id))
  const fixosForaDoCiclo = fixosTodos.filter((t) => !idsDoCiclo.has(t.id))
  const todasParaGrafico = [...filtradas, ...fixosForaDoCiclo]

  const saidas = todasParaGrafico.filter((t) => t.tipo === 'saida')
  atualizarGrafico(saidas)
}

async function updateLista(): Promise<void> {
  const filterEl = document.getElementById(
    'filter-dividido'
  ) as HTMLInputElement | null
  const showOnlyDividido = filterEl?.checked || false
  const searchEl = document.getElementById(
    'filter-descricao'
  ) as HTMLInputElement | null
  const search = searchEl?.value.trim().toLowerCase() || ''
  const transacoes = appStore.getTransacoes()
  const filtradas = filtrarTransacoes(transacoes, search, showOnlyDividido)

  renderLista(
    filtradas,
    (id) => handleEditar(id),
    (id) => handleExcluir(id)
  )

  await updateGrafico(filtradas)
}

async function updateHeader(): Promise<void> {
  const ciclo = appStore.getCicloAtual()
  const transacoes = appStore.getTransacoes()
  const config = appStore.getState()

  let totais = calcularTotais(transacoes)
  const { getAuthState } = await import('@/hooks/useAuth')
  const state = getAuthState()
  try {
    const fixosTodos = await carregarFixosTodos()

    const idsCiclo = new Set(transacoes.map((t) => t.id))
    const fixosForaDoCiclo = fixosTodos.filter((t) => !idsCiclo.has(t.id))

    const entradasExtras = fixosForaDoCiclo
      .filter((t) => t.tipo === 'entrada')
      .reduce((acc, t) => acc + Number(t.valor), 0)
    const saidasExtras = fixosForaDoCiclo
      .filter((t) => t.tipo === 'saida')
      .reduce((acc, t) => acc + Number(t.valor), 0)

    let ajustesEntradas = 0
    let ajustesSaidas = 0
    try {
      const userId = state.user?.id
      if (userId) {
        const dataInicio = formatDateLocalISO(ciclo.inicio)
        const dataFim = formatDateLocalISO(ciclo.fim)
        const somas = await somarAjustesSaldo({
          userId,
          dataInicio,
          dataFim,
        })
        ajustesEntradas = somas.entradas
        ajustesSaidas = somas.saidas
      }
    } catch (err) {
      logger.error('Erro ao buscar ajustes de saldo', err as any)
    }

    totais = {
      entradas: totais.entradas + entradasExtras + ajustesEntradas,
      saidas: totais.saidas + saidasExtras + ajustesSaidas,
      saldo:
        (totais.entradas + entradasExtras + ajustesEntradas) -
        (totais.saidas + saidasExtras + ajustesSaidas),
    }
  } catch (err) {
    logger.error(
      'Erro ao buscar todas as transações para saldo final',
      err as any
    )
  }

  atualizarHeader({
    cicloDatas: formatarIntervaloCiclo(ciclo.inicio, ciclo.fim),
    totais,
    onCicloAnterior: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset - 1)
      carregarCicloComFeedback()
    },
    onCicloProximo: () => {
      appStore.setCycleOffset(appStore.getState().cycleOffset + 1)
      carregarCicloComFeedback()
    },
    onAlterarDiaCiclo: async (diaInicio, diaFim) => {
      const state = getAuthState()
      const userId = state.user?.id ?? null
      appStore.setConfiguracaoCiclo(diaInicio, diaFim)
      await salvarConfiguracaoCiclo(diaInicio, diaFim, userId)
      debouncedUpdateDashboard()
    },
    onFixosClick: handleAbrirFixos,
    user: state?.user?.email || 'Usuario',
    diaInicioCiclo: config.diaInicioCiclo,
    diaFimCiclo: config.diaFimCiclo,
  })
}

async function updateDashboard(): Promise<void> {
  try {
    logger.debug('Atualizando dashboard')

    await transacoesHook.carregarTransacoes()

    await updateLista()

    await updateHeader()
  } catch (err) {
    logger.error('Erro ao atualizar dashboard', err as any)
    appStore.setError('Erro ao atualizar o dashboard')
    toast.error('Erro ao atualizar o dashboard')
    // Mesmo com erro, renderiza algo para não ficar tela branca
    try {
      await updateLista()
      await updateHeader()
    } catch {
      // Ignora erros na renderização de fallback
    }
  }
}

export async function handleSalvar(
  data: Parameters<typeof transacoesHook.salvarTransacao>[0]
): Promise<void> {
  logger.debug('Salvando transação', { data })
  const success = await transacoesHook.salvarTransacao(data)

  if (success) {
    toast.success('Transação salva com sucesso!')
    limparCacheFixos()
    await updateLista()
    await updateHeader()
  } else {
    const error = appStore.getError()
    if (error) {
      toast.error(error)
    }
  }
}

export function handleCancelarEdicao(): void {
  logger.debug('Cancelando edição')
  transacoesHook.cancelarEdicao()
}

function handleEditar(id: string): void {
  const transacoes = appStore.getTransacoes()
  const t = transacoes.find((tx) => tx.id === id)
  if (!t) return

  logger.debug('Editando transação', { id })
  transacoesHook.iniciarEdicao(t)

  const formContainer = document.getElementById('form-container')!
  preencherFormEdicaoForm(formContainer, t)
}

async function handleExcluir(id: string): Promise<boolean> {
  logger.debug('Excluindo transação', { id })
  const success = await transacoesHook.excluir(id)

  if (success) {
    const inputId = document.getElementById('input-id') as HTMLInputElement | null
    if (inputId && inputId.value === id) {
      const formContainer = document.getElementById('form-container')!
      formContainer.innerHTML = ''
      transacoesHook.cancelarEdicao()
    }

    toast.success('Transação excluída!')
    limparCacheFixos()
    await updateLista()
    await updateHeader()
  }
  return success
}

async function handleAbrirFixos(): Promise<void> {
  const btnFixos = document.getElementById(
    'fixos-btn'
  ) as HTMLButtonElement | null
  const textoOriginal = btnFixos?.textContent ?? 'FIXOS'
  if (btnFixos) {
    btnFixos.disabled = true
    btnFixos.textContent = 'Carregando...'
  }
  try {
    const transacoes = await listarTransacoes({})
    criarModalFixos(transacoes, async (id) => {
      const sucesso = await handleExcluir(id)
      return sucesso
    })
  } finally {
    if (btnFixos) {
      btnFixos.disabled = false
      btnFixos.textContent = textoOriginal
    }
  }
}

export async function handleExportar(): Promise<void> {
  const formatEl = document.getElementById(
    'export-format'
  ) as HTMLSelectElement | null
  const format = formatEl?.value || 'csv'
  const transacoes = appStore.getTransacoes()

  if (transacoes.length === 0) {
    toast.warning('Nenhuma transação para exportar')
    return
  }

  const headers = [
    'id',
    'data',
    'tipo',
    'categoria',
    'valor',
    'fixo',
    'descricao',
  ]
  const rows = transacoes.map((t) => [
    t.id,
    t.data,
    t.tipo,
    t.categoria,
    Number(t.valor),
    t.fixo ? 'Sim' : 'Não',
    t.descricao || '',
  ])
  const nomeArquivo = `transacoes-${formatDateLocalISO(new Date())}`

  if (format === 'csv') {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(
      `${transacoes.length} transação(ões) exportada(s) para CSV`
    )
  } else if (format === 'pdf') {
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Relatório de Transações', 14, 14)
    doc.setFontSize(10)
    let y = 28
    transacoes.forEach((t) => {
      doc.text(
        `${t.data} | ${t.tipo} | ${t.categoria} | R$ ${t.valor.toFixed(2)} | ${t.fixo ? 'Sim' : 'Não'} | ${t.descricao || ''}`,
        14,
        y
      )
      y += 7
    })
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.pdf`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(
      `${transacoes.length} transação(ões) exportada(s) para PDF`
    )
  } else if (format === 'xlsx') {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(
      `${transacoes.length} transação(ões) exportada(s) para Excel`
    )
  } else {
    toast.warning(
      `Exportação para ${format.toUpperCase()} não disponível. Use CSV.`
    )
  }
}

export function handleGerenciarCategorias(): void {
  logger.debug('Abrindo modal de categorias')
  criarModalCategorias(
    async (nome: string, icone?: string, cor?: string) => {
      const success = await categoriasHook.criarCategoria(nome, icone, cor)
      if (success) {
        atualizarSelectCategoriasForm()
        await updateGrafico()
      }
      return success
    },
    async (id: string, nome: string, icone?: string, cor?: string) => {
      const success = await categoriasHook.atualizarCategoria(
        id,
        nome,
        icone,
        cor
      )
      if (success) {
        atualizarSelectCategoriasForm()
        await updateGrafico()
      }
      return success
    },
    async (id: string) => {
      const success = await categoriasHook.excluirCategoria(id)
      if (success) {
        atualizarSelectCategoriasForm()
        await updateGrafico()
      }
      return success
    }
  )
}

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

  criarTelaCarregamento()

  // Inicializa auth
  initAuth()

  onAuthChange(async (user) => {
    if (user) {
      authContainer.classList.add('hidden')
      mainContainer.classList.remove('hidden')

      // Busca configuração de ciclo salvo
      try {
        const salvo = await buscarConfiguracaoCiclo(user.user?.id ?? '')
        if (salvo) {
          appStore.setConfiguracaoCiclo(
            salvo.dia_inicio_ciclo,
            salvo.dia_fim_ciclo
          )
        }
      } catch (err) {
        logger.error('Erro ao buscar configuração de ciclo no Supabase', err as any)
      }

      const salvoLocal = localStorage.getItem(`configuracao_ciclo_${user.user?.id}`)
      if (salvoLocal) {
        try {
          const { diaInicio, diaFim } = JSON.parse(salvoLocal)
          appStore.setConfiguracaoCiclo(diaInicio, diaFim)
        } catch {
          // Ignora erro de parse, usa padrão
        }
      }

      try {
        await updateDashboard()
      } finally {
        removerTelaCarregamento()
      }
    } else {
      authContainer.classList.remove('hidden')
      mainContainer.classList.add('hidden')
    }
  })
}

init()
