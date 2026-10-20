import type { TipoTransacao, Transacao } from '@/types'
import { appStore } from '@/stores/AppState'

type SaveCallback = (data: {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: string
  fixo: boolean
  descricao: string
}) => Promise<void>

type CancelCallback = () => void

export function criarTransacaoForm(
  container: HTMLElement,
  onSave: SaveCallback,
  onCancel: CancelCallback,
  onGerenciarCategorias: () => void
): void {
  container.innerHTML = `
    <div class="rounded-3xl p-6 mb-8 border bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      <h3 id="form-title" class="font-bold text-lg mb-4 text-slate-800 dark:text-white">Nova Transação</h3>
      <form id="transaction-form" class="space-y-3 sm:space-y-4">
        <input type="hidden" id="input-id">
        <div class="grid grid-cols-1 gap-3 sm:gap-4">
          <input type="number" id="input-value" step="0.01" min="0.01" required
            class="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm sm:text-base"
            placeholder="Valor" inputmode="decimal">
          <input type="date" id="input-date" required
            class="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm sm:text-base">
        </div>
        <div class="grid grid-cols-2 gap-2 sm:gap-4">
          <select id="input-type" class="w-full p-2 sm:p-3 rounded-xl border bg-white font-bold text-sm sm:text-base dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <option value="saida">Saída (-)</option>
            <option value="entrada">Entrada (+)</option>
          </select>
          <select id="input-category" class="w-full p-2 sm:p-3 rounded-xl border bg-white text-sm sm:text-base dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <!-- Populado dinamicamente -->
          </select>
        </div>
        <button type="button" id="btn-gerenciar-categorias" class="text-xs text-blue-500 hover:underline font-bold">
          ⚙️ Gerenciar categorias
        </button>
        <label class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
          <input type="checkbox" id="input-fixed" class="w-4 h-4"> É transação fixa?
        </label>
        <input type="text" id="input-description" required maxlength="100"
          class="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white"
          placeholder="Descrição">
        <button type="submit" id="save-btn"
          class="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition dark:bg-slate-700">
          Guardar
        </button>
        <button type="button" id="cancel-btn" class="hidden w-full py-2 bg-slate-200 rounded-xl font-bold dark:bg-slate-600 dark:text-white">
          Cancelar Edição
        </button>
      </form>
    </div>
  `

  const form = container.querySelector('#transaction-form') as HTMLFormElement
  const cancelBtn = container.querySelector('#cancel-btn')!
  const formTitle = container.querySelector('#form-title')!
  const inputId = container.querySelector('#input-id') as HTMLInputElement
  const btnGerenciar = container.querySelector('#btn-gerenciar-categorias')!

  // Popula categorias do store
  atualizarSelectCategorias()

  btnGerenciar.addEventListener('click', () => {
    onGerenciarCategorias()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const valor = parseFloat((container.querySelector('#input-value') as HTMLInputElement).value)
    if (isNaN(valor) || valor <= 0) {
      alert('O valor deve ser maior que zero')
      return
    }

    const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Salvando...'

    try {
      await onSave({
        valor,
        data: (container.querySelector('#input-date') as HTMLInputElement).value,
        tipo: (container.querySelector('#input-type') as HTMLSelectElement).value as TipoTransacao,
        categoria: (container.querySelector('#input-category') as HTMLSelectElement).value,
        fixo: (container.querySelector('#input-fixed') as HTMLInputElement).checked,
        descricao: (container.querySelector('#input-description') as HTMLInputElement).value.trim(),
      })
      resetarForm()
    } catch (err: any) {
      alert('Erro ao salvar: ' + (err.message || 'desconhecido'))
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = 'Guardar'
    }
  })

  cancelBtn.addEventListener('click', () => {
    resetarForm()
    onCancel()
  })

  function resetarForm(): void {
    form.reset()
    inputId.value = ''
    formTitle.textContent = 'Nova Transação'
    cancelBtn.classList.add('hidden')
  }

  // Define data atual como valor padrão
  ;(container.querySelector('#input-date') as HTMLInputElement).valueAsDate = new Date()
}

/**
 * Atualiza o select de categorias baseado no store
 */
function atualizarSelectCategorias(): void {
  const select = document.getElementById('input-category') as HTMLSelectElement
  if (!select) return
  const categorias = appStore.getCategorias()
  select.innerHTML = categorias.map(c =>
    `<option value="${c.nome}">${c.icone ? c.icone + ' ' : ''}${c.nome}</option>`
  ).join('')
}

export { atualizarSelectCategorias }

/**
 * Preenche o formulário para edição
 */
export function preencherFormEdicao(container: HTMLElement, t: Transacao): void {
  ;(container.querySelector('#input-id') as HTMLInputElement).value = t.id
  ;(container.querySelector('#input-value') as HTMLInputElement).value = String(t.valor)
  ;(container.querySelector('#input-date') as HTMLInputElement).value = t.data
  ;(container.querySelector('#input-type') as HTMLSelectElement).value = t.tipo
  atualizarSelectCategorias()
  ;(container.querySelector('#input-category') as HTMLSelectElement).value = t.categoria
  ;(container.querySelector('#input-fixed') as HTMLInputElement).checked = t.fixo
  ;(container.querySelector('#input-description') as HTMLInputElement).value = t.descricao || ''
  container.querySelector('#form-title')!.textContent = 'Editar Transação'
  container.querySelector('#cancel-btn')!.classList.remove('hidden')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
