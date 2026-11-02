import { appStore } from '@/stores/AppState'
import { sanitizarHTML } from '@/utils/format'

type CriarCallback = (nome: string, icone?: string, cor?: string) => Promise<boolean>
type AtualizarCallback = (id: string, nome: string, icone?: string, cor?: string) => Promise<boolean>
type ExcluirCallback = (id: string) => Promise<boolean>

export function criarModalCategorias(
  onCriar: CriarCallback,
  onAtualizar: AtualizarCallback,
  onExcluir: ExcluirCallback
): void {
  // Remove modal existente se houver
  const existente = document.getElementById('modal-categorias')
  if (existente) existente.remove()

  const modal = document.createElement('div')
  modal.id = 'modal-categorias'
  modal.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4'

  modal.innerHTML = `
    <div id="modal-content" class="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-5 rounded-full bg-emerald-500"></span>
          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white">⚙️ Gerenciar Categorias</h3>
        </div>
        <button id="fechar-modal" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center text-xl font-bold">&times;</button>
      </div>

      <!-- Formulário de nova categoria -->
      <div class="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 dark:bg-slate-800/70 dark:border-slate-700">
        <h4 class="font-bold text-xs uppercase tracking-wider mb-2.5 text-slate-500 dark:text-slate-400">Nova Categoria</h4>
        <div class="space-y-2.5">
          <input type="text" id="input-nova-categoria" placeholder="Nome da categoria" maxlength="50"
            class="w-full p-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm">
          <div class="flex gap-2">
            <input type="text" id="input-icon-categoria" placeholder="Emoji" maxlength="2"
              class="w-20 p-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm text-center">
            <div class="flex-1 flex items-center gap-2 px-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700">
              <input type="color" id="input-cor-categoria" value="#6366f1"
                class="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Cor no gráfico</span>
            </div>
          </div>
          <button id="btn-criar-categoria" class="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-500 hover:to-teal-500 transition shadow-sm">
            Adicionar
          </button>
        </div>
      </div>

      <!-- Lista de categorias existentes -->
      <div class="flex-1 overflow-y-auto pr-1">
        <h4 class="font-bold text-xs uppercase tracking-wider mb-2.5 text-slate-500 dark:text-slate-400">Categorias Atuais</h4>
        <div id="lista-categorias" class="space-y-2">
          <!-- Populado dinamicamente -->
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)

  // Renderiza lista
  renderizarListaCategorias(onAtualizar, onExcluir)

  // Eventos
  const fecharBtn = modal.querySelector('#fechar-modal')!
  fecharBtn.addEventListener('click', () => modal.remove())

  // Fecha modal apenas quando clicar no backdrop (fora do content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })

  const criarBtn = modal.querySelector('#btn-criar-categoria')!
  const inputNome = modal.querySelector('#input-nova-categoria') as HTMLInputElement
  const inputIcone = modal.querySelector('#input-icon-categoria') as HTMLInputElement
  const inputCor = modal.querySelector('#input-cor-categoria') as HTMLInputElement

  criarBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    const nome = inputNome.value.trim()
    const icone = inputIcone.value.trim()
    const cor = inputCor.value

    if (!nome) {
      alert('Informe o nome da categoria')
      return
    }

    criarBtn.setAttribute('disabled', 'true')
    criarBtn.textContent = 'Criando...'

    try {
      const success = await onCriar(nome, icone || undefined, cor)

      criarBtn.removeAttribute('disabled')
      criarBtn.textContent = 'Adicionar'

      if (success) {
        inputNome.value = ''
        inputIcone.value = ''
        inputCor.value = '#6366f1'
        renderizarListaCategorias(onAtualizar, onExcluir)
      }
    } catch (error) {
      alert('Erro ao criar categoria')
      criarBtn.removeAttribute('disabled')
      criarBtn.textContent = 'Adicionar'
    }
  })
}

function renderizarListaCategorias(
  onAtualizar: AtualizarCallback,
  onExcluir: ExcluirCallback
): void {
  const lista = document.getElementById('lista-categorias')!
  const categorias = appStore.getCategorias()

  if (categorias.length === 0) {
    lista.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">Nenhuma categoria cadastrada</p>'
    return
  }

  lista.innerHTML = categorias.map(c => `
    <div class="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl dark:bg-slate-800/80 dark:border-slate-700" data-id="${c.id}">
      <div class="flex-1 flex items-center gap-2 flex-wrap">
        ${c.icone ? `<span class="text-lg">${sanitizarHTML(c.icone)}</span>` : ''}
        <input type="text" value="${sanitizarHTML(c.nome)}" class="flex-1 min-w-[100px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm font-medium" data-field="nome">
        <input type="color" value="${c.cor || '#6366f1'}" class="w-8 h-8 rounded-lg border cursor-pointer bg-white dark:bg-slate-900 dark:border-slate-700" data-field="cor">
      </div>
      <button data-action="salvar" data-id="${c.id}" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500 hover:text-white transition">Salvar</button>
      <button data-action="excluir" data-id="${c.id}" class="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500 hover:text-white transition">Excluir</button>
    </div>
  `).join('')

  // Delegação de eventos (listener persistente no modal)
  const modalEl = document.getElementById('modal-categorias')!
  if (!modalEl.dataset.listaBound) {
    modalEl.dataset.listaBound = '1'
    modalEl.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      const action = target.dataset.action
      const id = target.dataset.id

      if (!action || !id) return

      if (action === 'excluir') {
        const confirmou = confirm('Deseja excluir esta categoria?')
        if (confirmou) {
          target.setAttribute('disabled', 'true')
          await onExcluir(id)
          renderizarListaCategorias(onAtualizar, onExcluir)
        }
      } else if (action === 'salvar') {
        const item = target.closest('div[data-id]')!
        const inputNome = item.querySelector('input[data-field="nome"]') as HTMLInputElement
        const inputCor = item.querySelector('input[data-field="cor"]') as HTMLInputElement
        const nome = inputNome.value.trim()
        const cor = inputCor.value

        if (!nome) {
          alert('O nome não pode estar vazio')
          return
        }

        target.setAttribute('disabled', 'true')
        target.textContent = 'Salvando...'

        const success = await onAtualizar(id, nome, undefined, cor)

        target.removeAttribute('disabled')
        target.textContent = 'Salvar'

        if (success) {
          renderizarListaCategorias(onAtualizar, onExcluir)
        }
      }
    })
  }
}
