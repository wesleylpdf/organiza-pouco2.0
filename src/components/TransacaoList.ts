import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void

let editCallback: EditCallback
let deleteCallback: DeleteCallback

export function criarTransacaoList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mb-6 grid grid-cols-1 gap-4">
      <div class="flex items-center justify-center gap-3 w-full">
        <label class="flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 py-3 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          <input type="checkbox" id="filter-dividido" class="w-4 h-4"> <span>Parcelados</span>
        </label>
        <select id="filter-campo" class="p-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          <option value="descricao">Descrição</option>
          <option value="categoria">Categoria</option>
          <option value="data">Data</option>
        </select>
        <input type="text" id="filter-descricao" placeholder="Buscar"
          class="w-full p-2 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
      </div>
    <div id="transaction-list" class="space-y-3 pb-10"></div>
    <p id="list-empty" class="text-center text-slate-400 py-8 hidden">Nenhuma transação neste ciclo</p>
  `

  // Rastreia quais botões estão em modo de confirmação de exclusão
  const confirmandoExclusao = new Set<string>()

  // Delegação de eventos registrada UMA VEZ
  const listContainer = document.getElementById('transaction-list')!
  listContainer.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement
    const btn = target.closest('button[data-action]') as HTMLButtonElement | null
    const action = btn?.dataset.action
    const id = btn?.dataset.id
    if (!action || !id) return

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
  onDelete: DeleteCallback
): void {
  // Atualiza callbacks
  editCallback = onEdit
  deleteCallback = onDelete

  const listContainer = document.getElementById('transaction-list')!
  const emptyMsg = document.getElementById('list-empty')!

  if (transactions.length === 0) {
    listContainer.innerHTML = ''
    emptyMsg.classList.remove('hidden')
    return
  }

  emptyMsg.classList.add('hidden')

  // Lista invertida (mais recente primeiro)
  const items = [...transactions].reverse()

  listContainer.innerHTML = items.map(t => {
    const sinal = t.tipo === 'entrada' ? '+' : '-'
    const corClasse = t.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'
    const descSanitizada = sanitizarHTML(t.descricao || '')
    const catSanitizada = sanitizarHTML(t.categoria)
    const fixoIcon = t.fixo ? ' 📌' : ''
    const parceladoIcon = (t.dividido && t.totalParcelas && t.parcelaAtual)
      ? ` 🔄 ${t.parcelaAtual}/${t.totalParcelas}${t.valorOriginal != null ? ` (${formatarMoeda(t.valorOriginal)})` : ''}`
      : ''

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
      </div>
    `
  }).join('')
}
