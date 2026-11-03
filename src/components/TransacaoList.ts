import { salvarFiltroOrdemPadrao } from '@/services/configuracoes'
import { atualizarStatusPago } from '@/services/transacoes'
import { getAuthState } from '@/hooks/useAuth'
import { appStore } from '@/stores/AppState'
import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'
import { ordenarTransacoes, type OrdemTransacao } from '@/utils/ordenacao'
import type { FiltroStatusPago } from '@/utils/filtroTransacoes'
import { isTransacaoPaga, definirStatusPagoLocal } from '@/utils/statusPago'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void

let editCallback: EditCallback
let deleteCallback: DeleteCallback
let ordemAtual: OrdemTransacao = 'data-desc'
let filtroStatusAtual: FiltroStatusPago = 'todos'

const CHAVE_LISTA_RECOLHIDA = 'lista_lancamentos_recolhida'

export function setOrdem(ordem: OrdemTransacao): void {
  ordemAtual = ordem
}

export function getOrdem(): OrdemTransacao {
  return ordemAtual
}

export function getFiltroStatus(): FiltroStatusPago {
  return filtroStatusAtual
}

export function setFiltroStatus(status: FiltroStatusPago): void {
  filtroStatusAtual = status
  atualizarBotoesFiltroStatus()
}

export function expandirListaLancamentos(): void {
  const filtersRow = document.getElementById('list-filters-row')
  const bodyWrapper = document.getElementById('list-body-wrapper')
  const headerRow = document.getElementById('list-header-row')
  const indicator = document.getElementById('list-toggle-indicator')
  if (!filtersRow || !bodyWrapper || !headerRow || !indicator) return

  filtersRow.classList.remove('hidden')
  bodyWrapper.classList.remove('hidden')
  headerRow.classList.add('mb-3')
  indicator.textContent = '▲ Recolher'
  try {
    localStorage.setItem(CHAVE_LISTA_RECOLHIDA, '0')
  } catch {
    // Ignora erro de localStorage
  }
}

function aplicarEstadoAcordeaoLista(recolhido: boolean): void {
  const filtersRow = document.getElementById('list-filters-row')
  const bodyWrapper = document.getElementById('list-body-wrapper')
  const headerRow = document.getElementById('list-header-row')
  const indicator = document.getElementById('list-toggle-indicator')
  if (!filtersRow || !bodyWrapper || !headerRow || !indicator) return

  filtersRow.classList.toggle('hidden', recolhido)
  bodyWrapper.classList.toggle('hidden', recolhido)
  headerRow.classList.toggle('mb-3', !recolhido)
  indicator.textContent = recolhido ? '▼ Expandir' : '▲ Recolher'
}

function atualizarBotoesFiltroStatus(): void {
  const grupo = document.getElementById('filter-status-group')
  if (!grupo) return
  const botoes = grupo.querySelectorAll<HTMLButtonElement>('button[data-filtro-status]')
  botoes.forEach((btn) => {
    const ativo = btn.dataset.filtroStatus === filtroStatusAtual
    if (ativo) {
      btn.className = 'px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-extrabold bg-emerald-500 text-slate-950 shadow-sm transition whitespace-nowrap'
    } else {
      btn.className = 'px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition whitespace-nowrap'
    }
  })
}

/**
 * Aplica uma ordem salva ao select de ordenação e ao estado interno.
 * Chamado durante a inicialização da aplicação para restaurar a preferência do usuário.
 */
export function aplicarOrdemSalva(ordem: OrdemTransacao): void {
  ordemAtual = ordem
  const selectEl = document.getElementById('filter-ordem') as HTMLSelectElement | null
  if (selectEl) selectEl.value = ordem
}

export function criarTransacaoList(container: HTMLElement): void {
  filtroStatusAtual = 'todos'

  container.innerHTML = `
    <div class="relative max-w-3xl mx-auto mb-6">
      <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-md mb-4">
        <div id="list-header-row" class="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <button type="button" id="btn-toggle-list" class="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none min-w-0">
            <span class="w-2.5 h-5 rounded-full bg-blue-500 shrink-0"></span>
            <h3 class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">Lançamentos do Ciclo</h3>
            <span id="list-toggle-indicator" class="text-[10px] sm:text-xs px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-bold group-hover:bg-blue-500/20 transition shrink-0">▲ Recolher</span>
          </button>
          <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-nowrap w-full sm:w-auto">
            <div id="filter-status-group" class="inline-flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap">
              <button type="button" data-filtro-status="todos" class="px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-extrabold bg-emerald-500 text-slate-950 shadow-sm transition whitespace-nowrap">Todos</button>
              <button type="button" data-filtro-status="pendentes" class="px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition whitespace-nowrap">⏳ Pendentes</button>
              <button type="button" data-filtro-status="pagos" class="px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition whitespace-nowrap">✅ Pagos</button>
            </div>
            <span id="list-filter-summary" class="text-[10px] sm:text-xs font-extrabold px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap"></span>
          </div>
        </div>
        <div id="list-filters-row" class="flex items-center gap-1.5 sm:gap-2.5 w-full flex-nowrap">
          <label class="shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 transition select-none">
            <input type="checkbox" id="filter-dividido" class="w-4 h-4 accent-emerald-600"> <span>🔄 Parcelados</span>
          </label>
          <input type="text" id="filter-descricao" placeholder="🔎 Buscar por descrição ou categoria..."
            class="flex-1 min-w-0 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          <select id="filter-ordem" class="shrink-0 max-w-[115px] sm:max-w-none truncate px-2 sm:px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/70 dark:bg-slate-800/80 dark:border-slate-700 dark:text-white text-[11px] sm:text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
            <option value="data-desc">Data (mais recente)</option>
            <option value="data-asc">Data (mais antiga)</option>
            <option value="valor-desc">Valor (maior primeiro)</option>
            <option value="valor-asc">Valor (menor primeiro)</option>
            <option value="categoria-asc">Categoria (A-Z)</option>
            <option value="categoria-desc">Categoria (Z-A)</option>
            <option value="criado-desc">Criado (mais recente)</option>
            <option value="criado-asc">Criado (mais antigo)</option>
          </select>
        </div>
      </div>

      <div id="list-body-wrapper">
        <div id="transaction-list" class="space-y-3 pb-4"></div>
        <p id="list-empty" class="text-center text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl py-10 hidden">Nenhuma transação neste ciclo</p>
      </div>
    </div>
  `

  const btnToggleList = document.getElementById('btn-toggle-list') as HTMLButtonElement | null
  const bodyWrapper = document.getElementById('list-body-wrapper') as HTMLElement | null

  try {
    if (localStorage.getItem(CHAVE_LISTA_RECOLHIDA) === '1') {
      aplicarEstadoAcordeaoLista(true)
    }
  } catch {
    // Ignora erro de localStorage
  }

  btnToggleList?.addEventListener('click', () => {
    const estaRecolhido = bodyWrapper?.classList.contains('hidden') ?? false
    const novoRecolhido = !estaRecolhido
    aplicarEstadoAcordeaoLista(novoRecolhido)
    try {
      localStorage.setItem(CHAVE_LISTA_RECOLHIDA, novoRecolhido ? '1' : '0')
    } catch {
      // Ignora erro de localStorage
    }
  })

  const statusGroup = document.getElementById('filter-status-group')!
  statusGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-filtro-status]') as HTMLButtonElement | null
    const novoStatus = btn?.dataset.filtroStatus as FiltroStatusPago | undefined
    if (!novoStatus) return
    expandirListaLancamentos()
    if (novoStatus === filtroStatusAtual) return
    filtroStatusAtual = novoStatus
    atualizarBotoesFiltroStatus()
    window.dispatchEvent(new CustomEvent('filtroStatusChange', { detail: { status: filtroStatusAtual } }))
  })

  document.getElementById('filter-ordem')!.addEventListener('change', async (e) => {
    const sel = e.target as HTMLSelectElement
    ordemAtual = sel.value as any

    // Persiste a escolha do usuário (sem botão salvar)
    const state = getAuthState()
    const userId = state.user?.id
    const chave = `filtro_ordem_padrao_${userId ?? 'anonimo'}`
    localStorage.setItem(chave, ordemAtual)
    if (userId) {
      salvarFiltroOrdemPadrao(ordemAtual, userId).catch(() => {})
    }

    // Notifica que a ordenação mudou para que o ciclo re-renderize a lista
    window.dispatchEvent(new CustomEvent('ordemChange', { detail: { ordem: ordemAtual } }))
  })

  // Rastreia quais botões estão em modo de confirmação de exclusão
  const confirmandoExclusao = new Set<string>()

  // Delegação de eventos registrada UMA VEZ
  const listContainer = document.getElementById('transaction-list')!
  listContainer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('button[data-action]') as HTMLButtonElement | null
    const action = btn?.dataset.action
    const id = btn?.dataset.id
    if (!action || !id || !btn) return

    if (action === 'toggle-pago') {
      const pagoAtual = btn.dataset.pago === '1'
      const novoPago = !pagoAtual
      const userId = getAuthState().user?.id ?? null

      // Atualiza estado local imediatamente
      definirStatusPagoLocal(id, novoPago, userId)
      const txNoStore = appStore.getTransacoes().find(tx => tx.id === id)
      if (txNoStore) {
        txNoStore.pago = novoPago
      }

      // Atualiza visual do botão imediatamente
      btn.dataset.pago = novoPago ? '1' : '0'
      btn.title = novoPago ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'
      btn.textContent = novoPago ? '✅ Pago' : '⏳ Pendente'
      btn.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition cursor-pointer ${
        novoPago
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
      }`

      // Se houver filtro ativo por status (Pendentes ou Pagos), atualiza a lista
      if (filtroStatusAtual !== 'todos') {
        window.dispatchEvent(new CustomEvent('statusPagoChange', { detail: { id, pago: novoPago } }))
      }

      // Sincroniza no Supabase em background
      atualizarStatusPago(id, novoPago).catch(() => {})
      return
    }

    const btnGroup = btn.closest('.flex.gap-2.shrink-0')
    if (!btnGroup) return

    const btnEdit = btnGroup.querySelector(`button[data-action="edit"][data-id="${id}"]`) as HTMLButtonElement | null
    const btnDelete = btnGroup.querySelector(`button[data-action="delete"][data-id="${id}"]`) as HTMLButtonElement | null
    const btnConfirm = btnGroup.querySelector(`button[data-action="confirm-delete"][data-id="${id}"]`) as HTMLButtonElement | null
    const btnCancel = btnGroup.querySelector(`button[data-action="cancel-delete"][data-id="${id}"]`) as HTMLButtonElement | null

    const modoConfirmacao = () => {
      btnEdit?.classList.add('hidden')
      btnDelete?.classList.add('hidden')
      btnConfirm?.classList.remove('hidden')
      btnCancel?.classList.remove('hidden')
    }

    const modoNormal = () => {
      btnEdit?.classList.remove('hidden')
      btnDelete?.classList.remove('hidden')
      btnConfirm?.classList.add('hidden')
      btnCancel?.classList.add('hidden')
    }

    if (action === 'edit') {
      editCallback(id)
    } else if (action === 'delete') {
      // Primeira vez: mostra botões Confirmar? e Cancelar, esconde Editar e Excluir
      confirmandoExclusao.add(id)
      modoConfirmacao()

      // Bloqueia todos os outros botões de excluir enquanto aguarda confirmação
      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b.dataset.id !== id) b.disabled = true
      })

      // Bloqueia todos os outros botões de editar enquanto aguarda confirmação
      const todosBtnEdit = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]'))
      todosBtnEdit.forEach(b => {
        if (b.dataset.id !== id) b.disabled = true
      })
    } else if (action === 'confirm-delete' && deleteCallback) {
      confirmandoExclusao.delete(id)
      btn.disabled = true
      btn.textContent = 'Excluindo...'

      // Esconde o botão Cancelar ao clicar em Confirmar?
      btnCancel?.classList.add('hidden')

      // Desabilita todos os outros botões de excluir até o retorno do Supabase
      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b !== btn) b.disabled = true
      })

      // Desabilita todos os outros botões de editar até o retorno do Supabase
      const todosBtnEdit = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]'))
      todosBtnEdit.forEach(b => {
        if (b !== btn) b.disabled = true
      })

      try {
        await deleteCallback(id)
      } finally {
        btn.disabled = false
        btn.textContent = 'Confirmar?'
        todosBtnDelete.forEach(b => b.disabled = false)
        modoNormal()
      }
    } else if (action === 'cancel-delete') {
      confirmandoExclusao.delete(id)

      // Desbloqueia todos os botões de excluir ao cancelar
      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => b.disabled = false)

      // Desbloqueia todos os botões de editar ao cancelar
      const todosBtnEdit = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]'))
      todosBtnEdit.forEach(b => b.disabled = false)

      modoNormal()
    }
  })
}

export function renderLista(
  transactions: Transacao[],
  onEdit: EditCallback,
  onDelete: DeleteCallback,
  ajustes?: { entradas: number; saidas: number }
): void {
  // Atualiza callbacks
  editCallback = onEdit
  deleteCallback = onDelete

  const listContainer = document.getElementById('transaction-list')!
  const emptyMsg = document.getElementById('list-empty')!
  const summaryEl = document.getElementById('list-filter-summary')
  const userId = getAuthState().user?.id ?? null

  if (summaryEl) {
    const somaEntradas = transactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0) + (ajustes?.entradas ?? 0)
    const somaSaidas = transactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0) + (ajustes?.saidas ?? 0)
    const saldoVisivel = somaEntradas - somaSaidas
    const totalAbsoluto = somaEntradas > 0 && somaSaidas === 0
      ? `+${formatarMoeda(somaEntradas)}`
      : somaSaidas > 0 && somaEntradas === 0
        ? `-${formatarMoeda(somaSaidas)}`
        : `${saldoVisivel >= 0 ? '+' : ''}${formatarMoeda(saldoVisivel)}`
    summaryEl.textContent = `${transactions.length} ${transactions.length === 1 ? 'item' : 'itens'} • ${totalAbsoluto}`
  }

  if (transactions.length === 0) {
    listContainer.innerHTML = ''
    emptyMsg.classList.remove('hidden')
    return
  }

  emptyMsg.classList.add('hidden')

  // Aplica ordenação
  const items = ordenarTransacoes(transactions, ordemAtual)

  listContainer.innerHTML = items.map(t => {
    const isEntrada = t.tipo === 'entrada'
    const sinal = isEntrada ? '+' : '-'
    const corClasse = isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    const bordaLateral = isEntrada ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500'
    const descSanitizada = sanitizarHTML(t.descricao || '')
    const catSanitizada = sanitizarHTML(t.categoria)
    const pago = isTransacaoPaga(t, userId)
    const pagoBadge = `
      <button type="button" data-action="toggle-pago" data-id="${t.id}" data-pago="${pago ? '1' : '0'}" title="${pago ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border transition cursor-pointer ${pago ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'}">
        ${pago ? '✅ Pago' : '⏳ Pendente'}
      </button>
    `
    const fixoBadge = t.fixo
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20">📌 Fixo</span>'
      : ''
    const parceladoBadge = (t.dividido && t.totalParcelas && t.parcelaAtual)
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/20">🔄 ${t.parcelaAtual}/${t.totalParcelas}${t.valorOriginal != null ? ` (${formatarMoeda(t.valorOriginal)})` : ''}</span>`
      : ''

    return `
      <div class="p-4 bg-white/95 border border-slate-200/80 ${bordaLateral} rounded-2xl flex flex-col gap-2 shadow-sm hover:shadow-md transition dark:bg-slate-900/95 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3 min-w-0">
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <span class="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">${descSanitizada}</span>
              <span class="font-black text-sm sm:text-base ${corClasse} shrink-0">${sinal} ${formatarMoeda(t.valor)}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">${catSanitizada}</span>
              <span>•</span>
              <span class="font-medium">${formatarData(t.data)}</span>
              ${pagoBadge}
              ${fixoBadge}
              ${parceladoBadge}
            </div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-action="edit" data-id="${t.id}" class="bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-500/20 text-xs font-bold hover:bg-blue-600 hover:text-white transition px-3 py-1.5 rounded-xl">Editar</button>
            <button data-action="delete" data-id="${t.id}" class="bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-500/20 text-xs font-bold hover:bg-rose-500 hover:text-white transition px-3 py-1.5 rounded-xl">Excluir</button>
            <button data-action="confirm-delete" data-id="${t.id}" class="bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition px-3 py-1.5 rounded-xl hidden">Confirmar?</button>
            <button data-action="cancel-delete" data-id="${t.id}" class="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition px-3 py-1.5 rounded-xl hidden">Cancelar</button>
          </div>
        </div>
      </div>
    `
  }).join('')
}
