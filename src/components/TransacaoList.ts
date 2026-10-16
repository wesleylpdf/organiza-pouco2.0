import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'

type EditCallback = (id: string) => void
type DeleteCallback = (id: string) => void

export function criarTransacaoList(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mb-6 flex items-center gap-4 flex-wrap">
      <button id="btn-aplicar-fixos" class="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-emerald-700 transition shadow-lg">
        <span>📋</span> Aplicar fixos do ciclo anterior
      </button>
      <label class="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600 bg-slate-50 px-4 py-3 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
        <input type="checkbox" id="filter-fixed" class="w-4 h-4"> Mostrar apenas Fixas
      </label>
    </div>
    <div id="transaction-list" class="space-y-3 pb-10"></div>
    <p id="list-empty" class="text-center text-slate-400 py-8 hidden">Nenhuma transação neste ciclo</p>
  `
}

export function renderLista(
  transactions: Transacao[],
  onEdit: EditCallback,
  onDelete: DeleteCallback
): void {
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
      <div class="p-4 bg-white border rounded-xl flex justify-between items-center shadow-sm dark:bg-slate-800 dark:border-slate-700">
        <div class="min-w-0 flex-1">
          <span class="block font-bold text-sm dark:text-white truncate">${descSanitizada}${fixoIcon}</span>
          <span class="text-[10px] text-slate-500">${catSanitizada} | ${formatarData(t.data)}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="font-bold ${corClasse} text-sm">${sinal} ${formatarMoeda(t.valor)}</span>
          <button data-action="edit" data-id="${t.id}" class="text-blue-500 text-xs font-bold hover:underline">Editar</button>
          <button data-action="delete" data-id="${t.id}" class="text-rose-500 text-xs font-bold hover:underline">Excluir</button>
        </div>
      </div>
    `
  }).join('')

  // Delegação de eventos
  listContainer.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const action = target.dataset.action
    const id = target.dataset.id
    if (!action || !id) return

    if (action === 'edit') onEdit(id)
    else if (action === 'delete') onDelete(id)
  }, { once: false })
}
