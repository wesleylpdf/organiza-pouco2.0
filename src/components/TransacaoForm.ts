import type { TipoTransacao, Transacao } from '@/types'
import { appStore } from '@/stores/AppState'
import { formatDateLocalISO } from '@/utils/ciclo'

type SaveCallback = (data: {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: string
  descricao: string
  dividido: boolean
  totalParcelas: number
  valorOriginal: number | null
  fixo: boolean
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
      <form id="transaction-form" class="space-y-3 space-y-4">
        <input type="hidden" id="input-id">
        <div class="grid grid-cols-2 gap-2 gap-4">
          <input type="number" id="input-value" step="0.01" min="0.01" required
            class="w-full h-full min-w-0 p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm text-base"
            placeholder="Valor" inputmode="decimal">
          <input type="date" id="input-date" required
            class="w-full h-full min-w-0 p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm text-base">
        </div>
        <div class="grid grid-cols-2 gap-2 gap-4">
          <select id="input-type" class="w-full p-2 p-3 rounded-xl border bg-white font-bold text-sm text-base dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <option value="saida">Saída (-)</option>
            <option value="entrada">Entrada (+)</option>
          </select>
          <select id="input-category" class="w-full p-2 p-3 rounded-xl border bg-white text-sm text-base dark:bg-slate-900 dark:border-slate-700 dark:text-white">
            <!-- Populado dinamicamente -->
          </select>
        </div>
        <div class="flex justify-end mt-1">
          <button type="button" id="btn-gerenciar-categorias" class="text-xs text-blue-500 hover:underline font-bold">
            ⚙️ Gerenciar categorias
          </button>
        </div>
        <input type="text" id="input-description" required maxlength="100"
          class="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white"
          placeholder="Descrição">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 gap-x-6">
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300" for="input-dividido">
            <input type="checkbox" id="input-dividido" class="w-4 h-4">
            Parcelado?
          </label>
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 ml-2" for="input-fixo">
            <input type="checkbox" id="input-fixo" class="w-4 h-4">
            Fixo?
          </label>
          <label class="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hidden" id="dividir-valor-checkbox-label">
            <input type="checkbox" id="input-dividir-valor" class="w-4 h-4">
            Dividir valor pelas parcelas?
          </label>
        </div>
        <div id="parcelas-container" class="hidden grid grid-cols-1 gap-3 gap-4">
          <input type="number" id="input-total-parcelas" min="2" step="1" value="2"
            class="w-full p-3 rounded-xl border bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm text-base"
            placeholder="Quantidade de parcelas">
        </div>
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

  const inputDividido = container.querySelector('#input-dividido') as HTMLInputElement
  const inputFixo = container.querySelector('#input-fixo') as HTMLInputElement
  const inputTotalParcelas = container.querySelector('#input-total-parcelas') as HTMLInputElement
  const parcelasContainer = container.querySelector('#parcelas-container')!
  const dividirValorCheckboxLabel = container.querySelector('#dividir-valor-checkbox-label') as HTMLLabelElement

  inputDividido.addEventListener('change', () => {
    const isChecked = inputDividido.checked
    parcelasContainer.classList.toggle('hidden', !isChecked)
    dividirValorCheckboxLabel.classList.toggle('hidden', !isChecked)

    // Se 'Parcelado?' for desmarcado, desmarca e esconde 'Dividir valor pelas parcelas?'
    if (!isChecked) {
      const dividirValorCheckbox = container.querySelector('#input-dividir-valor') as HTMLInputElement
      dividirValorCheckbox.checked = false
    }

    // Parcelado e Fixo são mutuamente exclusivos: selecionar um esconde o outro
    inputFixo.classList.toggle('hidden', isChecked)
    container.querySelector('label[for="input-fixo"]')?.classList.toggle('hidden', isChecked)
    if (isChecked) {
      inputFixo.checked = false
    }
  })

  inputFixo.addEventListener('change', () => {
    const isChecked = inputFixo.checked
    inputDividido.classList.toggle('hidden', isChecked)
    container.querySelector('label[for="input-dividido"]')?.classList.toggle('hidden', isChecked)
    if (isChecked) {
      inputDividido.checked = false
      parcelasContainer.classList.add('hidden')
      dividirValorCheckboxLabel.classList.add('hidden')
      const dividirValorCheckbox = container.querySelector('#input-dividir-valor') as HTMLInputElement
      dividirValorCheckbox.checked = false
    } else {
      inputDividido.classList.remove('hidden')
      container.querySelector('label[for="input-dividido"]')?.classList.remove('hidden')
    }
  })


  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const valor = parsearValor((container.querySelector('#input-value') as HTMLInputElement).value)
    const dividirValor = (container.querySelector('#input-dividir-valor') as HTMLInputElement).checked
    const totalParcelas = parseInt((container.querySelector('#input-total-parcelas') as HTMLInputElement).value) || 1

    // Sem "Dividir valor pelas parcelas?" o valor digitado é usado exatamente
    // como está; ao dividir, cada parcela recebe o valor em centavos.
    const valorFinal = dividirValor ? dividirEmCentavos(valor, totalParcelas) : valor

    if (isNaN(valor) || valor <= 0) {
      alert('O valor deve ser maior que zero')
      return
    }

    const saveBtn = container.querySelector('#save-btn') as HTMLButtonElement
    saveBtn.disabled = true
    saveBtn.textContent = 'Salvando...'

    try {
      await onSave({
        valor: valorFinal, // Usa o valor final calculado
        data: (container.querySelector('#input-date') as HTMLInputElement).value,
        tipo: (container.querySelector('#input-type') as HTMLSelectElement).value as TipoTransacao,
        categoria: (container.querySelector('#input-category') as HTMLSelectElement).value,
        descricao: (container.querySelector('#input-description') as HTMLInputElement).value.trim(),
        dividido: (container.querySelector('#input-dividido') as HTMLInputElement).checked,
        totalParcelas: totalParcelas,
        valorOriginal: dividirValor ? valor : null,
        fixo: inputFixo.checked,
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
    parcelasContainer.classList.add('hidden')
    dividirValorCheckboxLabel.classList.add('hidden')
    inputDividido.checked = false
    inputFixo.checked = false
    ;(container.querySelector('#input-dividir-valor') as HTMLInputElement).checked = false
    inputTotalParcelas.value = '2'
    inputId.value = ''
    // Sempre volta para a data de hoje no fuso local
    ;(container.querySelector('#input-date') as HTMLInputElement).value = formatDateLocalISO(new Date())
    formTitle.textContent = 'Nova Transação'
    cancelBtn.classList.add('hidden')

    // Restaura a visibilidade dos checkboxes mutuamente exclusivos
    inputDividido.classList.remove('hidden')
    inputFixo.classList.remove('hidden')
    container.querySelector('label[for="input-dividido"]')?.classList.remove('hidden')
    container.querySelector('label[for="input-fixo"]')?.classList.remove('hidden')
  }

  // Define data atual como valor padrão
  ;(container.querySelector('#input-date') as HTMLInputElement).value = formatDateLocalISO(new Date())
}

/**
 * Lê o valor digitado aceitando vírgula (padrão pt-BR) como separador decimal.
 */
function parsearValor(texto: string): number {
  const normalizado = texto.trim().replace(/\s/g, '').replace(',', '.')
  return normalizado ? Number(normalizado) : NaN
}

/**
 * Divide um valor monetário em centavos, arredondando o centavo.
 */
function dividirEmCentavos(valor: number, parcelas: number): number {
  return Math.round(Math.round(valor * 100) / parcelas) / 100
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
  // Se o valor foi dividido entre as parcelas, o campo mostra o valor original
  const temValorOriginal = t.dividido && t.valorOriginal != null
  ;(container.querySelector('#input-value') as HTMLInputElement).value = String(
    temValorOriginal ? t.valorOriginal : t.valor
  )
  ;(container.querySelector('#input-date') as HTMLInputElement).value = t.data
  ;(container.querySelector('#input-type') as HTMLSelectElement).value = t.tipo
  atualizarSelectCategorias()
  ;(container.querySelector('#input-category') as HTMLSelectElement).value = t.categoria
  ;(container.querySelector('#input-description') as HTMLInputElement).value = t.descricao || ''
  container.querySelector('#form-title')!.textContent = 'Editar Transação'
  container.querySelector('#cancel-btn')!.classList.remove('hidden')
  window.scrollTo({ top: 0, behavior: 'smooth' })

  const inputDividido = container.querySelector('#input-dividido') as HTMLInputElement
  const inputFixo = container.querySelector('#input-fixo') as HTMLInputElement
  const inputTotalParcelas = container.querySelector('#input-total-parcelas') as HTMLInputElement
  const parcelasContainer = container.querySelector('#parcelas-container')!
  const dividirValorCheckboxLabel = container.querySelector('#dividir-valor-checkbox-label')!
  const inputDividirValor = container.querySelector('#input-dividir-valor') as HTMLInputElement
  inputDividido.checked = !!t.dividido
  inputFixo.checked = !!t.fixo
  inputTotalParcelas.value = String(t.totalParcelas || 1)
  inputDividirValor.checked = !!temValorOriginal
  parcelasContainer.classList.toggle('hidden', !t.dividido)
  dividirValorCheckboxLabel.classList.toggle('hidden', !t.dividido)
}
