import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void

let editCallback: EditCallback
let deleteCallback: DeleteCallback

export function criarTransacaoList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <button id="btn-aplicar-fixos" class="flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 px-6 py-2 py-3 rounded-full font-bold text-sm hover:bg-emerald-700 transition shadow-lg">
        <span>📋</span> <span class="hidden md:inline">Aplicar fixos</span><span class="md:hidden">Fixos</span>
      </button>
      <label class="flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 py-3 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
        <input type="checkbox" id="filter-fixed" class="w-4 h-4"> <span class="hidden md:inline">Mostrar apenas Fixas</span><span class="md:hidden">Fixas</span>
      </label>
    </div>
    <div id="transaction-list" class="space-y-3 pb-10"></div>
    <p id="list-empty" class="text-center text-slate-400 py-8 hidden">Nenhuma transação neste ciclo</p>
  `

  // Delegação de eventos registrada UMA VEZ
  const listContainer = document.getElementById('transaction-list')!
  listContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const action = target.dataset.action
    const id = target.dataset.id
    if (!action || !id) return

    if (action === 'edit' && editCallback) editCallback(id)
    else if (action === 'delete' && deleteCallback) deleteCallback(id)
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

    return `
      <div class="p-3 sm:p-4 bg-white border rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div class="min-w-0 flex-1">
          <span class="block font-bold text-sm dark:text-white truncate">${descSanitizada}${fixoIcon}</span>
          <span class="text-[10px] sm:text-xs text-slate-500">${catSanitizada} | ${formatarData(t.data)}</span>
        </div>
        <div class="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
          <span class="font-bold ${corClasse} text-sm">${sinal} ${formatarMoeda(t.valor)}</span>
          <div class="flex gap-2">
            <button data-action="edit" data-id="${t.id}" class="text-blue-500 text-xs font-bold hover:underline px-2 py-1">Editar</button>
            <button data-action="delete" data-id="${t.id}" class="text-rose-500 text-xs font-bold hover:underline px-2 py-1">Excluir</button>
          </div>
        </div>
      </div>
    `
  }).join('')
}
