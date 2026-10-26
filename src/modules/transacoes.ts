import { appStore } from '@/stores/AppState'
import { useTransacoes } from '@/hooks/useTransacoes'
import { preencherFormEdicao } from '@/components/TransacaoForm'
import { limparFormEdicaoAtual } from '@/modules/appInit'
import { listarTransacoes, criarTransacao } from '@/services/transacoes'
import { criarModalFixos } from '@/components/ModalFixos'
import { formatDateLocalISO } from '@/utils/ciclo'
import { logger } from '@/utils/logger'
import { getAuthState } from '@/hooks/useAuth'
import { somarAjustesSaldo } from '@/services/ajustes'
import { toast } from '@/utils/toast'
import { supabase } from '@/lib/supabaseClient'
import { listarCategorias } from '@/services/categorias'
import { buscarConfiguracaoCiclo, salvarConfiguracaoCiclo } from '@/services/configuracoes'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

// Hook de transações
const transacoesHook = useTransacoes()

// Callbacks injetados pelo ciclo.ts (evita dependência circular entre módulos)
interface TransacoesHandlers {
  limparCampoBusca: () => void
  limparCacheFixos: () => void
  updateLista: () => Promise<void>
  updateHeader: () => Promise<void>
}

let transacoesHandlers: TransacoesHandlers | null = null

export function initTransacoes(handlers: TransacoesHandlers): void {
  transacoesHandlers = handlers
}

export async function handleSalvar(data: Parameters<typeof transacoesHook.salvarTransacao>[0]): Promise<void> {
  logger.debug('Salvando transação', { data })
  const success = await transacoesHook.salvarTransacao(data)

  if (success) {
    toast.success('Transação salva com sucesso!')
    transacoesHandlers!.limparCampoBusca()
    transacoesHandlers!.limparCacheFixos()
    await transacoesHandlers!.updateLista()
    await transacoesHandlers!.updateHeader()
  } else {
    const error = appStore.getError()
    if (error) {
      toast.error(error)
    }
  }
}

export function handleCancelarEdicao(): void {
  logger.debug('Cancelando edição')
  transacoesHook.cancelarEdicao()
}

export function handleEditar(id: string): void {
  const transacoes = appStore.getTransacoes()
  const t = transacoes.find(tx => tx.id === id)
  if (!t) return

  logger.debug('Editando transação', { id })
  transacoesHook.iniciarEdicao(t)

  const formContainer = document.getElementById('form-container')!
  preencherFormEdicao(formContainer, t)
}

export async function handleExcluir(id: string): Promise<boolean> {
  logger.debug('Excluindo transação', { id })
  try {
    const success = await transacoesHook.excluir(id)

    if (success) {
      // Se a transação excluída está em edição, fecha/limpa o formulário de edição
      const inputId = document.getElementById('input-id') as HTMLInputElement | null
      if (inputId && inputId.value === id) {
        limparFormEdicaoAtual()
        transacoesHook.cancelarEdicao()
      }

      toast.success('Transação excluída!')
      transacoesHandlers!.limparCampoBusca()
      transacoesHandlers!.limparCacheFixos()
      await transacoesHandlers!.updateLista()
      await transacoesHandlers!.updateHeader()
    }
    return success
  } catch (err) {
    logger.error('Erro ao excluir transação', err as any)
    toast.error('Erro ao excluir transação')
    return false
  }
}

export async function handleAbrirFixos(): Promise<void> {
  const btnFixos = document.getElementById('fixos-btn') as HTMLButtonElement | null
  const textoOriginal = btnFixos?.textContent ?? 'FIXOS'
  if (btnFixos) {
    btnFixos.disabled = true
    btnFixos.textContent = 'Carregando...'
  }
  try {
    const transacoes = await listarTransacoes({})
    criarModalFixos(transacoes, async (id) => {
      const sucesso = await handleExcluir(id)
      return sucesso
    })
  } catch (err) {
    logger.error('Erro ao abrir transações fixas', err as any)
    toast.error('Erro ao abrir transações fixas')
  } finally {
    if (btnFixos) {
      btnFixos.disabled = false
      btnFixos.textContent = textoOriginal
    }
  }
}

export async function handleExportar(): Promise<void> {
  const formatEl = document.getElementById('export-format') as HTMLSelectElement | null
  const format = formatEl?.value || 'csv'
  const transacoesDoCiclo = appStore.getTransacoes()

  // Busca TODAS as transações (inclui fixas de outros meses/ciclos)
  const todasTransacoes = await listarTransacoes({})
  const nomesCiclo = new Set(transacoesDoCiclo.map(t => t.id))
  const fixosForaDoCiclo = todasTransacoes.filter(t => t.fixo && !nomesCiclo.has(t.id))
  const transacoes = [...transacoesDoCiclo, ...fixosForaDoCiclo]

  if (transacoes.length === 0) {
    toast.warning('Nenhuma transação para exportar')
    return
  }

  const headers = ['id', 'data', 'tipo', 'categoria', 'valor', 'fixo', 'descricao']
  const rows = transacoes.map((t) => [
    t.id,
    t.data,
    t.tipo,
    t.categoria,
    Number(t.valor),
    t.fixo ? 'Sim' : 'Não',
    t.descricao || '',
  ])
  const nomeArquivo = `transacoes-${formatDateLocalISO(new Date())}`

  if (format === 'csv') {
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`${transacoes.length} transação(ões) exportada(s) para CSV`)
  } else if (format === 'pdf') {
    const pdfHeaders = ['data', 'tipo', 'categoria', 'valor', 'descricao']
    const pdfRows = transacoes.map((t) => {
      let descricao = t.descricao || ''
      if (t.dividido && t.parcelaAtual != null && t.totalParcelas != null) {
        descricao = `[${t.parcelaAtual}/${t.totalParcelas}] ${descricao}`
      } else if (t.fixo) {
        descricao = `[FIXO] ${descricao}`
      }
      return [
        t.data,
        t.tipo,
        t.categoria,
        Number(t.valor),
        descricao,
      ]
    })
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Relatório de Transações', 14, 14)
    doc.setFontSize(10)
    let y = 28
    pdfHeaders.forEach((h, i) => doc.text(h, 14 + i * 28, y))
    y += 8

    const DESCRICAO_MAX_WIDTH = 60 // mm (x=126 ate margem direita ~14mm na pagina A4)
    const CATEGORIA_MAX_WIDTH = 24 // mm (x=70 ate ~94, antes da coluna valor em x=98)

    pdfRows.forEach((row) => {
      const linhasCategoria = doc.splitTextToSize(String(row[2]), CATEGORIA_MAX_WIDTH) || ['']
      const linhasDescricao = doc.splitTextToSize(String(row[4]), DESCRICAO_MAX_WIDTH) || ['']
      const numLinhas = Math.max(linhasCategoria.length, linhasDescricao.length, 1)
      row.forEach((v, i) => {
        if (i === 2) {
          linhasCategoria.forEach((linha: string, j: number) => {
            doc.text(linha, 14 + i * 28, y + j * 5)
          })
        } else if (i === 4) {
          linhasDescricao.forEach((linha: string, j: number) => {
            doc.text(linha, 14 + i * 28, y + j * 5)
          })
        } else {
          doc.text(String(v), 14 + i * 28, y)
        }
      })
      y += numLinhas * 5
    })

    // Rodapé: referência do ciclo e saldo final
    const ciclo = appStore.getCicloAtual()
    let entradas = 0
    let saidas = 0
    transacoes.forEach((t) => {
      if (t.tipo === 'entrada') entradas += Number(t.valor)
      else if (t.tipo === 'saida') saidas += Number(t.valor)
    })

    // Ajustes manuais de saldo final (invisíveis na UI): apenas os ajustes cuja
    // data cai dentro do ciclo selecionado afetam o saldo final.
    let ajustesEntradas = 0
    let ajustesSaidas = 0
    try {
      const state = getAuthState()
      const userId = state.user?.id
      if (userId && ciclo) {
        const dataInicio = formatDateLocalISO(ciclo.inicio)
        const dataFim = formatDateLocalISO(ciclo.fim)
        const somas = await somarAjustesSaldo({ userId, dataInicio, dataFim })
        ajustesEntradas = somas.entradas
        ajustesSaidas = somas.saidas
      }
    } catch (err) {
      logger.error('Erro ao buscar ajustes de saldo para rodape do PDF', err as any)
    }

    const saldo = (entradas + ajustesEntradas) - (saidas + ajustesSaidas)

    const PAGE_MARGIN_BOTTOM = 15
    const PAGE_HEIGHT = doc.internal.pageSize.height || 297
    if (y + 30 > PAGE_HEIGHT - PAGE_MARGIN_BOTTOM) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Saldo final: R$ ${saldo.toFixed(2).replace('.', ',')}`, 14, y)

    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.pdf`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`${transacoes.length} transação(ões) exportada(s) para PDF`)
  } else if (format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${nomeArquivo}.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`${transacoes.length} transação(ões) exportada(s) para Excel`)
  } else {
    toast.warning(`Exportação para ${format.toUpperCase()} não disponível. Use CSV.`)
  }
}

export async function handleBackup(): Promise<void> {
  try {
    const state = getAuthState()
    const userId = state.user?.id
    if (!userId) throw new Error('Usuário não autenticado')

    const [transacoes, categorias, configuracao] = await Promise.all([
      listarTransacoes({}),
      listarCategorias(),
      buscarConfiguracaoCiclo(userId),
    ])

    const backup = {
      versao: '2.2.x',
      exportadoEm: new Date().toISOString(),
      categorias,
      configuracaoCiclo: configuracao ?? null,
      transacoes,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `backup-organiza-pouco-${formatDateLocalISO(new Date())}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Backup concluído: ${transacoes.length} transação(ões), ${categorias.length} categoria(s)`)
  } catch (err) {
    logger.error('Erro ao fazer backup', err as any)
    toast.error('Erro ao fazer backup')
  }
}

export async function handleRestauracao(): Promise<void> {
  const state = getAuthState()
  const userId = state.user?.id
  if (!userId) {
    toast.error('Usuário não autenticado')
    return
  }

  // Cria o modal de confirmação e seleção de opções
  const existente = document.getElementById('modal-restauracao')
  if (existente) existente.remove()

  const modal = document.createElement('div')
  modal.id = 'modal-restauracao'
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000] p-4'
  modal.innerHTML = `
    <div class="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl dark:bg-slate-800 max-h-[85vh] flex flex-col">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg text-slate-800 dark:text-white">Restaurar Backup</h3>
        <button id="fechar-modal-restauracao" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
      </div>
      <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Selecione o que deseja restaurar. O ajuste de saldo não é incluído no backup.
      </p>
      <div class="space-y-3 mb-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="rest-categorias" checked class="rounded text-blue-600 focus:ring-blue-500">
          <span class="text-sm text-slate-700 dark:text-slate-200">Categorias</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="rest-configuracao" checked class="rounded text-blue-600 focus:ring-blue-500">
          <span class="text-sm text-slate-700 dark:text-slate-200">Configuração do ciclo</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="rest-transacoes" checked class="rounded text-blue-600 focus:ring-blue-500">
          <span class="text-sm text-slate-700 dark:text-slate-200">Transações</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400">
          <input type="checkbox" id="rest-substituir" class="rounded text-blue-600 focus:ring-blue-500">
          <span class="text-sm">Substituir todos os dados existentes (apaga o que houver)</span>
        </label>
      </div>
      <div class="mb-4 border-t pt-3">
        <label class="block text-xs text-slate-500 dark:text-slate-400 mb-2">Arquivo de backup (.json)</label>
        <input type="file" id="rest-arquivo" accept=".json" class="w-full text-xs border rounded px-2 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
      </div>
      <div class="flex justify-end gap-2">
        <button id="btn-cancelar-restauracao" class="text-xs text-slate-600 bg-slate-200 hover:bg-slate-300 font-bold px-3 py-1.5 rounded transition">Cancelar</button>
        <button id="btn-restaurar" class="text-xs text-white bg-blue-600 hover:bg-blue-700 font-bold px-3 py-1.5 rounded transition">Restaurar</button>
      </div>
    </div>
  `

  const fecharBtn = modal.querySelector('#fechar-modal-restauracao')!
  const cancelarBtn = modal.querySelector('#btn-cancelar-restauracao')!
  const restaurarBtn = modal.querySelector('#btn-restaurar')!
  const fecharModal = () => modal.remove()

  fecharBtn.addEventListener('click', fecharModal)
  cancelarBtn.addEventListener('click', fecharModal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) fecharModal()
  })

  restaurarBtn.addEventListener('click', async () => {
    const arquivoInput = document.getElementById('rest-arquivo') as HTMLInputElement | null
    const file = arquivoInput?.files?.[0]
    if (!file) {
      toast.warning('Selecione um arquivo de backup')
      return
    }

    const restCategorias = (document.getElementById('rest-categorias') as HTMLInputElement).checked
    const restConfiguracao = (document.getElementById('rest-configuracao') as HTMLInputElement).checked
    const restTransacoes = (document.getElementById('rest-transacoes') as HTMLInputElement).checked
    const substituir = (document.getElementById('rest-substituir') as HTMLInputElement).checked

    const btn = restaurarBtn as HTMLButtonElement
    btn.disabled = true
    btn.textContent = 'Restaurando...'

    try {
      const texto = await file.text()
      const backup = JSON.parse(texto)

      if (restCategorias && Array.isArray(backup.categorias)) {
        if (substituir) {
          const catsAtuais = await listarCategorias()
          await Promise.all(catsAtuais.map(c => supabase.from('categorias').delete().eq('id', c.id)))
        }
        for (const cat of backup.categorias) {
          await supabase.from('categorias').upsert({
            id: cat.id,
            user_id: userId,
            nome: cat.nome,
            icone: cat.icone ?? null,
            cor: cat.cor ?? null,
          })
        }
      }

      if (restConfiguracao && backup.configuracaoCiclo) {
        const cfg = backup.configuracaoCiclo
        await salvarConfiguracaoCiclo(cfg.dia_inicio_ciclo, cfg.dia_fim_ciclo, userId)
        appStore.setConfiguracaoCiclo(cfg.dia_inicio_ciclo, cfg.dia_fim_ciclo)
      }

      if (restTransacoes && Array.isArray(backup.transacoes)) {
        if (substituir) {
          const txsAtuais = await listarTransacoes({})
          await Promise.all(txsAtuais.map(t => supabase.from('transacoes').delete().eq('id', t.id)))
        }
        for (const tx of backup.transacoes) {
          await criarTransacao({
            valor: tx.valor,
            data: tx.data,
            tipo: tx.tipo,
            categoria: tx.categoria,
            descricao: tx.descricao ?? '',
            dividido: tx.dividido ?? false,
            totalParcelas: tx.totalParcelas ?? null,
            parcelaAtual: tx.parcelaAtual ?? null,
            valorOriginal: tx.valorOriginal ?? null,
            fixo: tx.fixo ?? false,
          })
        }
      }

      toast.success('Restauração concluída com sucesso')
      fecharModal()
      transacoesHook.carregarTransacoes()
    } catch (err) {
      logger.error('Erro ao restaurar backup', err as any)
      toast.error('Erro ao restaurar backup')
    } finally {
      btn.disabled = false
      btn.textContent = 'Restaurar'
    }
  })

  document.body.appendChild(modal)
}
