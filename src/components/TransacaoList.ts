import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void

let editCallback: EditCallback
let deleteCallback: DeleteCallback

export function criarTransacaoList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="flex items-center justify-center gap-3 sm:gap-4 w-full">
        <label class="flex items-center justify-center gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 py-3 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          <input type="checkbox" id="filter-dividido" class="w-4 h-4"> <span class="hidden md:inline">Mostrar parcelados</span><span class="md:hidden">Parcelados</span>
        </label>
        <input type="text" id="filter-descricao" placeholder="Buscar por descrição"
          class="w-full sm:w-64 p-2 sm:p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none">
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
    const parceladoIcon = (t.dividido && t.totalParcelas && t.parcelaAtual)
      ? ` 🔄 ${t.parcelaAtual}/${t.totalParcelas}${t.valorOriginal != null ? ` (${formatarMoeda(t.valorOriginal)})` : ''}`
      : ''

    return `
      <div class="p-3 sm:p-4 bg-white border rounded-xl flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div class="min-w-0 flex-1">
          <span class="block font-bold text-sm dark:text-white truncate">${descSanitizada}${fixoIcon}</span>
          <span class="text-xs sm:text-sm text-slate-500">${catSanitizada} | ${formatarData(t.data)}${parceladoIcon}</span>
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
