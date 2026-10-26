import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void
type SaveQuickEditCallback = (id: string, campo: string, valor: string | number) => Promise<void>

let editCallback: EditCallback
let deleteCallback: DeleteCallback
let saveQuickEditCallback: SaveQuickEditCallback | null = null
let ordemAtual: 'data-desc' | 'data-asc' | 'valor-desc' | 'valor-asc' | 'categoria-asc' | 'categoria-desc' | 'criado-desc' | 'criado-asc' = 'data-desc'

// Campos em modo de edição inline por transação (id -> campo)
const editandoCampo = new Map<string, string>()

export function setOrdem(ordem: string): void {
  ordemAtual = ordem as any
}

export function setSaveQuickEdit(cb: SaveQuickEditCallback): void {
  saveQuickEditCallback = cb
}

export function criarTransacaoList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mb-6 grid grid-cols-1 gap-4">
      <div class="flex items-center justify-center gap-3 w-full">
        <label class="flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 py-3 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          <input type="checkbox" id="filter-dividido" class="w-4 h-4"> <span>Parcelados</span>
        </label>
        <input type="text" id="filter-descricao" placeholder="Buscar"
          class="w-full p-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
        <select id="filter-ordem" class="p-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
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
    <div id="transaction-list" class="space-y-3 pb-10"></div>
    <p id="list-empty" class="text-center text-slate-400 py-8 hidden">Nenhuma transação neste ciclo</p>
  `

  document.getElementById('filter-ordem')!.addEventListener('change', (e) => {
    const sel = e.target as HTMLSelectElement
    ordemAtual = sel.value as any
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
    const campo = btn?.dataset.field
    if (!action || !id) return

    // --- Edição inline ---
    if (action === 'inline-edit' && campo && saveQuickEditCallback) {
      editandoCampo.set(id, campo)
      // Re-render é feito pelo caller (updateLista); aqui apenas marca o estado.
      // O renderLista re-exibirá com o input visível porque editandoCampo é lido lá.
      return
    }

    if (action === 'inline-cancel' && campo) {
      editandoCampo.delete(id)
      // Re-render para voltar ao estado normal
      return
    }

    if (action === 'inline-save' && campo && saveQuickEditCallback) {
      const input = document.querySelector(`input[data-field="${campo}"][data-id="${id}"]`) as HTMLInputElement | null
      const valor = input?.value || ''
      editandoCampo.delete(id)
      try {
        await saveQuickEditCallback(id, campo, campo === 'valor' ? Number(valor) : valor)
      } catch (err) {
        logger.error('Erro ao salvar edição rápida', err as any)
        toast.error('Erro ao salvar alteração')
      }
      return
    }

    // --- Editar / Excluir (existente) ---
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
      confirmandoExclusao.add(id)
      modoConfirmacao()

      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b.dataset.id !== id) b.disabled = true
      })

      const todosBtnEdit = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="edit"]'))
      todosBtnEdit.forEach(b => {
        if (b.dataset.id !== id) b.disabled = true
      })
    } else if (action === 'confirm-delete' && deleteCallback) {
      confirmandoExclusao.delete(id)
      btn.disabled = true
      btn.textContent = 'Excluindo...'

      btnCancel?.classList.add('hidden')

      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b !== btn) b.disabled = true
      })

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

      const todosBtnDelete = Array.from(listContainer.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => b.disabled = false)

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
  onSaveQuickEdit: SaveQuickEditCallback
): void {
  // Atualiza callbacks
  editCallback = onEdit
  deleteCallback = onDelete
  saveQuickEditCallback = onSaveQuickEdit

  const listContainer = document.getElementById('transaction-list')!
  const emptyMsg = document.getElementById('list-empty')!

  if (transactions.length === 0) {
    listContainer.innerHTML = ''
    emptyMsg.classList.remove('hidden')
    return
  }

  emptyMsg.classList.add('hidden')

  // Aplica ordenação
  const items = [...transactions].sort((a, b) => {
    switch (ordemAtual) {
      case 'data-desc':
        return new Date(b.data).getTime() - new Date(a.data).getTime()
      case 'data-asc':
        return new Date(a.data).getTime() - new Date(b.data).getTime()
      case 'valor-desc':
        return Number(b.valor) - Number(a.valor)
      case 'valor-asc':
        return Number(a.valor) - Number(b.valor)
      case 'categoria-asc':
        return String(a.categoria).localeCompare(String(b.categoria))
      case 'categoria-desc':
        return String(b.categoria).localeCompare(String(a.categoria))
      case 'criado-desc':
        return new Date(b.created_at || b.data).getTime() - new Date(a.created_at || a.data).getTime()
      case 'criado-asc':
        return new Date(a.created_at || a.data).getTime() - new Date(b.created_at || b.data).getTime()
      default:
        return new Date(b.data).getTime() - new Date(a.data).getTime()
    }
  })

  listContainer.innerHTML = items.map(t => {
    const sinal = t.tipo === 'entrada' ? '+' : '-'
    const corClasse = t.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'
    const descSanitizada = sanitizarHTML(t.descricao || '')
    const catSanitizada = sanitizarHTML(t.categoria)
    const fixoIcon = t.fixo ? ' 📌' : ''
    const parceladoIcon = (t.dividido && t.totalParcelas && t.parcelaAtual)
      ? ` 🔄 ${t.parcelaAtual}/${t.totalParcelas}${t.valorOriginal != null ? ` (${formatarMoeda(t.valorOriginal)})` : ''}`
      : ''

    const emEdicao = editandoCampo.get(t.id)

    const campoEditavel = (campo: string, valorAtual: string, tipo: 'text' | 'number' | 'date' = 'text') => {
      const estáEditando = emEdicao === campo
      const inputId = `inline-${campo}-${t.id}`
      const btnId = `btn-inline-${campo}-${t.id}`
      return `
        <div id="${inputId}" class="flex items-center gap-2 ${estáEditando ? '' : 'hidden'}">
          <input type="${tipo}" value="${sanitizarHTML(valorAtual)}" data-field="${campo}" data-id="${t.id}"
            class="p-1 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-xs w-24 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          <button data-action="inline-save" data-id="${t.id}" data-field="${campo}"
            class="bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 px-2 py-1 rounded">Salvar</button>
          <button data-action="inline-cancel" data-id="${t.id}" data-field="${campo}"
            class="bg-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-400 px-2 py-1 rounded">Cancelar</button>
        </div>
        <div id="${btnId}" class="flex items-center gap-2 ${estáEditando ? 'hidden' : ''}">
          <span class="text-xs text-slate-500 truncate max-w-[120px]">${sanitizarHTML(valorAtual)}</span>
          <button data-action="inline-edit" data-id="${t.id}" data-field="${campo}"
            class="text-slate-400 hover:text-emerald-600 text-xs">✏️</button>
        </div>
      `
    }

    return `
      <div class="p-3 bg-white border rounded-xl flex flex-col gap-2 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div class="flex items-start justify-between gap-2 min-w-0">
          <div class="min-w-0 flex-1">
            <span class="block font-bold text-sm dark:text-white truncate">${descSanitizada}${fixoIcon} <span class="${corClasse}">${sinal} ${formatarMoeda(t.valor)}</span></span>
            <span class="text-xs text-slate-500">${catSanitizada} | ${formatarData(t.data)}${parceladoIcon}</span>
          </div>
          <div class="flex gap-2 shrink-0">
            <button data-action="edit" data-id="${t.id}" class="bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition px-2 py-1 rounded">Editar</button>
            <button data-action="delete" data-id="${t.id}" class="bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition px-2 py-1 rounded">Excluir</button>
            <button data-action="confirm-delete" data-id="${t.id}" class="bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition px-2 py-1 rounded hidden">Confirmar?</button>
            <button data-action="cancel-delete" data-id="${t.id}" class="bg-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-400 transition px-2 py-1 rounded hidden">Cancelar</button>
          </div>
        </div>
        <div class="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
          <span class="text-xs text-slate-500 w-16">Valor:</span>
          ${campoEditavel('valor', formatarMoeda(t.valor), 'text')}
          <span class="text-xs text-slate-500 w-16">Data:</span>
          ${campoEditavel('data', t.data, 'date')}
          <span class="text-xs text-slate-500 w-16">Categoria:</span>
          ${campoEditavel('categoria', catSanitizada, 'text')}
          <span class="text-xs text-slate-500 w-16">Descrição:</span>
          ${campoEditavel('descricao', descSanitizada, 'text')}
        </div>
      </div>
    `
  }).join('')
}
