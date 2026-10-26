import { appStore } from '@/stores/AppState'
import { useTransacoes } from '@/hooks/useTransacoes'
import { preencherFormEdicao } from '@/components/TransacaoForm'
import { limparFormEdicaoAtual } from '@/modules/appInit'
import { listarTransacoes } from '@/services/transacoes'
import { criarModalFixos } from '@/components/ModalFixos'
import { formatDateLocalISO } from '@/utils/ciclo'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'
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
    pdfRows.forEach((row) => {
      row.forEach((v, i) => doc.text(String(v), 14 + i * 28, y))
      y += 7
    })
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
