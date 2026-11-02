import type { TipoTransacao, Transacao } from '@/types'
import { appStore } from '@/stores/AppState'
import { formatDateLocalISO } from '@/utils/ciclo'
import { sanitizarHTML } from '@/utils/format'
import { toast } from '@/utils/toast'

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

export type FormApi = {
  limparFormEdicao: () => void
}

export function criarTransacaoForm(
  container: HTMLElement,
  onSave: SaveCallback,
  onCancel: CancelCallback,
  onGerenciarCategorias: () => void
): FormApi {
  container.innerHTML = `
    <div class="relative max-w-3xl mx-auto p-5 sm:p-6 border bg-white/95 border-slate-200/90 rounded-3xl shadow-md mb-6 dark:bg-slate-900/95 dark:border-slate-800">
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-6 rounded-full bg-emerald-500"></span>
          <h3 id="form-title" class="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">Nova Transação</h3>
        </div>
        <button type="button" id="btn-gerenciar-categorias" class="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold transition">
          ⚙️ Categorias
        </button>
      </div>

      <form id="transaction-form" class="space-y-4">
        <input type="hidden" id="input-id">

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label for="input-value" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Valor (R$)</label>
            <input type="number" id="input-value" step="0.01" min="0.01" required
              class="w-full min-w-0 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:text-white text-base font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="0,00" inputmode="decimal">
          </div>
          <div>
            <label for="input-date" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Data</label>
            <input type="date" id="input-date" required
              class="w-full min-w-0 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:text-white text-base font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label for="input-type" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tipo de Lançamento</label>
            <select id="input-type" class="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50/70 font-bold text-base dark:bg-slate-800/80 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="saida">🔻 Saída (-)</option>
              <option value="entrada">🔺 Entrada (+)</option>
            </select>
          </div>
          <div>
            <label for="input-category" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoria</label>
            <select id="input-category" class="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50/70 text-base font-semibold dark:bg-slate-800/80 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <!-- Populado dinamicamente -->
            </select>
          </div>
        </div>

        <div>
          <label for="input-description" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Descrição</label>
          <input type="text" id="input-description" required maxlength="100"
            class="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white dark:bg-slate-800/80 dark:border-slate-700 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            placeholder="Ex.: Supermercado, Aluguel, Salário...">
        </div>

        <div class="flex flex-wrap items-center gap-2.5 pt-1">
          <label class="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none transition" for="input-dividido">
            <input type="checkbox" id="input-dividido" class="w-4 h-4 accent-emerald-600">
            🔄 Parcelado?
          </label>
          <label class="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer select-none transition" for="input-fixo">
            <input type="checkbox" id="input-fixo" class="w-4 h-4 accent-emerald-600">
            📌 Fixo?
          </label>
          <label class="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 cursor-pointer select-none hidden transition" id="dividir-valor-checkbox-label">
            <input type="checkbox" id="input-dividir-valor" class="w-4 h-4 accent-emerald-600">
            ➗ Dividir valor pelas parcelas?
          </label>
        </div>

        <div id="parcelas-container" class="hidden grid grid-cols-1 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <label for="input-total-parcelas" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Quantidade de Parcelas</label>
          <input type="number" id="input-total-parcelas" min="2" step="1" value="2"
            class="w-full p-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-base font-bold"
            placeholder="Quantidade de parcelas">
        </div>

        <div class="pt-1 space-y-2">
          <button type="submit" id="save-btn"
            class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-extrabold tracking-wide shadow-md shadow-emerald-600/20 transition">
            Guardar
          </button>
          <button type="button" id="cancel-btn" class="hidden w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-2xl font-bold dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white transition">
            Cancelar Edição
          </button>
        </div>
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

    // Parcelado e Fixo são mutuamente exclusivos: selecionar um desmarca o outro e esconde o outro (mantém o espaço no layout)
    if (isChecked) {
      inputFixo.checked = false
      inputFixo.classList.add('invisible')
      container.querySelector('label[for="input-fixo"]')?.classList.add('invisible')
    } else {
      inputFixo.classList.remove('invisible')
      container.querySelector('label[for="input-fixo"]')?.classList.remove('invisible')
    }
  })

  inputFixo.addEventListener('change', () => {
    const isChecked = inputFixo.checked
    if (isChecked) {
      inputDividido.checked = false
      inputDividido.classList.add('invisible')
      container.querySelector('label[for="input-dividido"]')?.classList.add('invisible')
      parcelasContainer.classList.add('hidden')
      dividirValorCheckboxLabel.classList.add('hidden')
      const dividirValorCheckbox = container.querySelector('#input-dividir-valor') as HTMLInputElement
      dividirValorCheckbox.checked = false
    } else {
      inputDividido.classList.remove('invisible')
      container.querySelector('label[for="input-dividido"]')?.classList.remove('invisible')
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
      toast.warning('O valor deve ser maior que zero')
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
      toast.error('Erro ao salvar: ' + (err.message || 'desconhecido'))
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
    inputDividido.classList.remove('invisible')
    inputFixo.classList.remove('invisible')
    container.querySelector('label[for="input-dividido"]')?.classList.remove('invisible')
    container.querySelector('label[for="input-fixo"]')?.classList.remove('invisible')
  }

  // Define data atual como valor padrão
  ;(container.querySelector('#input-date') as HTMLInputElement).value = formatDateLocalISO(new Date())

  return {
    /**
     * Limpa o formulário de edição, voltando ao estado "Nova Transação".
     * Chamado quando a transação em edição é excluída pela lista.
     */
    limparFormEdicao: () => resetarForm(),
  }
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
    `<option value="${sanitizarHTML(c.nome)}">${sanitizarHTML(c.icone ? c.icone + ' ' : '')}${sanitizarHTML(c.nome)}</option>`
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
