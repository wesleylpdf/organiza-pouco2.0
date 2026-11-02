import type { Transacao } from '@/types'
import { formatarMoeda, formatarData, sanitizarHTML } from '@/utils/format'

type ExcluirCallback = (id: string) => Promise<boolean>

export function criarModalFixos(
  transacoes: Transacao[],
  onExcluir: ExcluirCallback
): void {
  // Remove modal existente se houver
  const existente = document.getElementById('modal-fixos')
  if (existente) existente.remove()

  const modal = document.createElement('div')
  modal.id = 'modal-fixos'
  modal.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4'

  const fixos = transacoes.filter(t => t.fixo)
  const totalFixos = fixos.reduce((acc, t) => acc + Number(t.valor), 0)

  modal.innerHTML = `
    <div id="modal-content" class="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-5 rounded-full bg-emerald-500"></span>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">📌 Transações Fixas</h3>
        </div>
        <button id="fechar-modal-fixos" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xl font-bold">&times;</button>
      </div>

      <div class="mb-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950 text-white border border-slate-800">
        <span class="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Total das fixas (todos os ciclos)</span>
        <p id="total-fixos" class="text-2xl font-black text-white">${formatarMoeda(totalFixos)}</p>
      </div>

      <div id="lista-fixos" class="flex-1 overflow-y-auto mb-2 pr-1">
        ${renderListaFixos(fixos)}
      </div>

      ${fixos.length === 0 ? `
        <p class="text-center text-slate-400 text-sm py-8">Nenhuma transação fixa cadastrada.</p>
      ` : ''}
    </div>
  `

  const fecharBtn = modal.querySelector('#fechar-modal-fixos')!
  fecharBtn.addEventListener('click', () => {
    modal.remove()
  })

  // Fecha clicando fora do conteúdo
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  // Rastreia quais botões estão em modo de confirmação de exclusão
  const confirmandoExclusao = new Set<string>()

  // Delegação de eventos para botões de excluir
  const lista = modal.querySelector('#lista-fixos')!
  lista.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement | null
    const action = btn?.dataset.action
    const id = btn?.dataset.id
    if (!action || !id) return

    const btnGroup = btn.closest('.flex.items-center.gap-3')
    if (!btnGroup) return

    const btnDelete = btnGroup.querySelector(`button[data-action="delete"][data-id="${id}"]`) as HTMLButtonElement | null
    const btnConfirm = btnGroup.querySelector(`button[data-action="confirm-delete"][data-id="${id}"]`) as HTMLButtonElement | null
    const btnCancel = btnGroup.querySelector(`button[data-action="cancel-delete"][data-id="${id}"]`) as HTMLButtonElement | null

    const modoConfirmacao = () => {
      btnDelete?.classList.add('hidden')
      btnConfirm?.classList.remove('hidden')
      btnCancel?.classList.remove('hidden')
    }

    const modoNormal = () => {
      btnDelete?.classList.remove('hidden')
      btnConfirm?.classList.add('hidden')
      btnCancel?.classList.add('hidden')
    }

    if (action === 'delete') {
      // Primeira vez: mostra botões Confirmar? e Cancelar, esconde Excluir
      confirmandoExclusao.add(id)
      modoConfirmacao()

      // Bloqueia todos os outros botões de excluir enquanto aguarda confirmação
      const todosBtnDelete = Array.from(lista.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b.dataset.id !== id) b.disabled = true
      })
    } else if (action === 'confirm-delete') {
      confirmandoExclusao.delete(id)
      btn.disabled = true
      btn.textContent = 'Excluindo...'

      // Esconde o botão Cancelar ao clicar em Confirmar?
      btnCancel?.classList.add('hidden')

      // Desabilita todos os outros botões de excluir até o retorno do Supabase
      const todosBtnDelete = Array.from(lista.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => {
        if (b !== btn) b.disabled = true
      })

      try {
        const sucesso = await onExcluir(id)
        if (sucesso) {
          btn.closest('.flex.items-center.justify-between')?.remove()
          atualizarTotalFixos()
        }
      } finally {
        btn.disabled = false
        btn.textContent = 'Confirmar?'
        todosBtnDelete.forEach(b => b.disabled = false)
        modoNormal()
      }
    } else if (action === 'cancel-delete') {
      confirmandoExclusao.delete(id)

      // Desbloqueia todos os botões de excluir ao cancelar
      const todosBtnDelete = Array.from(lista.querySelectorAll<HTMLButtonElement>('button[data-action="delete"]'))
      todosBtnDelete.forEach(b => b.disabled = false)

      modoNormal()
    }
  })

  function atualizarTotalFixos(): void {
    const itens = lista.querySelectorAll('[data-action="delete"]')
    let total = 0
    itens.forEach(btn => {
      const valorSpan = btn.previousElementSibling as HTMLSpanElement
      total += Number(valorSpan.textContent?.replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.') || 0)
    })
    const totalEl = document.getElementById('total-fixos')
    if (totalEl) totalEl.textContent = formatarMoeda(total)
  }

  document.body.appendChild(modal)
}

function renderListaFixos(fixos: Transacao[]): string {
  if (fixos.length === 0) return ''

  return `
    <div class="space-y-2.5">
      ${fixos.map(tx => `
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-bold text-slate-900 dark:text-white truncate">${sanitizarHTML(tx.descricao || '')}</span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">${formatarData(tx.data)}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-extrabold text-slate-700 dark:text-slate-200">${formatarMoeda(tx.valor)}</span>
            <button data-action="delete" data-id="${tx.id}" class="text-xs text-white bg-rose-500 hover:bg-rose-600 font-bold px-2.5 py-1.5 rounded-xl transition">Excluir</button>
            <button data-action="confirm-delete" data-id="${tx.id}" class="text-xs text-white bg-rose-600 hover:bg-rose-700 font-bold px-2.5 py-1.5 rounded-xl transition hidden">Confirmar?</button>
            <button data-action="cancel-delete" data-id="${tx.id}" class="text-xs text-slate-800 bg-slate-200 hover:bg-slate-300 font-bold px-2.5 py-1.5 rounded-xl transition hidden">Cancelar</button>
          </div>
        </div>
      `).join('')}
    </div>
  `
}
