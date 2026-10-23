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
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4'

  const fixos = transacoes.filter(t => t.fixo)
  const totalFixos = fixos.reduce((acc, t) => acc + Number(t.valor), 0)

  modal.innerHTML = `
    <div id="modal-content" class="bg-white rounded-3xl p-4 p-6 w-full max-w-md shadow-2xl dark:bg-slate-800 max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg text-slate-800 dark:text-white">Transações Fixas</h3>
        <button id="fechar-modal-fixos" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
      </div>

      <div class="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
        <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total das fixas (todos os ciclos)</span>
        <p class="text-lg text-xl font-black text-slate-900 dark:text-white">${formatarMoeda(totalFixos)}</p>
      </div>

      <div id="lista-fixos" class="flex-1 overflow-y-auto mb-3">
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

  // Delegação de eventos para botões de excluir
  const lista = modal.querySelector('#lista-fixos')!
  lista.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('button[data-action="delete"]') as HTMLButtonElement | null
    if (!btn) return
    const id = btn.dataset.id
    if (!id) return

    const confirmado = confirm('Deseja realmente excluir esta transação fixa?')
    if (!confirmado) return

    const textoOriginal = btn.textContent
    btn.disabled = true
    btn.textContent = 'Excluindo...'
    try {
      const sucesso = await onExcluir(id)
      if (sucesso) {
        btn.closest('.flex.items-center.justify-between')?.remove()
      }
    } finally {
      btn.disabled = false
      btn.textContent = textoOriginal
    }
  })

  document.body.appendChild(modal)
}

function renderListaFixos(fixos: Transacao[]): string {
  if (fixos.length === 0) return ''

  return `
    <div class="space-y-2">
      ${fixos.map(tx => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-slate-800 dark:text-white truncate">${sanitizarHTML(tx.descricao || '')}</span>
            <span class="text-[10px] text-slate-500 dark:text-slate-400">${formatarData(tx.data)}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-sm font-bold text-slate-600 dark:text-slate-300">${formatarMoeda(tx.valor)}</span>
            <button data-action="delete" data-id="${tx.id}" class="text-[10px] text-xs text-white bg-rose-500 hover:bg-rose-600 font-bold px-2 py-1 rounded transition">Excluir</button>
          </div>
        </div>
      `).join('')}
    </div>
  `
}

