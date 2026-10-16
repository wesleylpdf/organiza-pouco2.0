/**
 * Hook de transações
 * Encapsula lógica de negócios e integração com store
 */

import { appStore } from '@/stores/AppState'
import {
  listarTransacoes,
  criarTransacao,
  atualizarTransacao,
  excluirTransacao,
  duplicarFixosCicloAnterior,
} from '@/services/transacoes'
import { validarTransacao, extrairMensagemErro } from '@/utils/validation'
import { toast } from '@/utils/toast'
import { logger } from '@/utils/logger'
import type { Transacao, TipoTransacao } from '@/types'

export interface CriarTransacaoParams {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: string
  fixo: boolean
  descricao: string
}

export function useTransacoes() {
  async function carregarTransacoes(): Promise<void> {
    try {
      appStore.setLoading('transacoes', true)
      appStore.clearError()

      const cicloInicio = appStore.getCicloInicioISO()
      logger.debug('Carregando transações', { cicloInicio })

      const transacoes = await listarTransacoes(cicloInicio)
      appStore.setTransacoes(transacoes)

      logger.info('Transações carregadas', { count: transacoes.length })
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao carregar transações', { error })
      appStore.setError(message)
      toast.error(message)
    } finally {
      appStore.setLoading('transacoes', false)
    }
  }

  async function salvarTransacao(params: CriarTransacaoParams): Promise<boolean> {
    try {
      // Valida dados
      validarTransacao(params)

      appStore.setLoading('salvando', true)
      appStore.clearError()

      const editandoId = appStore.getEditandoId()

      if (editandoId) {
        logger.debug('Atualizando transação', { id: editandoId, params })
        await atualizarTransacao(editandoId, params)
        appStore.setEditandoId(null)
        toast.success('Transação atualizada!')
      } else {
        logger.debug('Criando transação', { params })
        await criarTransacao(params)
        toast.success('Transação criada!')
      }

      logger.info('Transação salva com sucesso')
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao salvar transação', { error, params })
      appStore.setError(message)
      toast.error(message)
      return false
    } finally {
      appStore.setLoading('salvando', false)
    }
  }

  async function excluir(id: string): Promise<boolean> {
    try {
      appStore.clearError()

      if (!confirm('Deseja realmente excluir esta transação?')) {
        return false
      }

      logger.debug('Excluindo transação', { id })
      await excluirTransacao(id)

      toast.success('Transação excluída!')
      logger.info('Transação excluída', { id })
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao excluir transação', { error, id })
      appStore.setError(message)
      toast.error(message)
      return false
    }
  }

  async function aplicarFixos(): Promise<boolean> {
    try {
      if (!confirm('Aplicar transações fixas do ciclo anterior?')) {
        return false
      }

      appStore.setLoading('aplicandoFixos', true)
      appStore.clearError()

      const cicloInicio = appStore.getCicloInicioISO()
      logger.debug('Aplicando fixos', { cicloInicio })

      const quantidade = await duplicarFixosCicloAnterior(cicloInicio)

      if (quantidade === 0) {
        toast.info('Nenhuma transação fixa encontrada no ciclo anterior')
        logger.info('Nenhum fixo encontrado')
      } else {
        toast.success(`${quantidade} transação(ões) fixa(s) aplicada(s)!`)
        logger.info('Fixos aplicados', { quantidade })
      }

      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao aplicar fixos', { error })
      appStore.setError(message)
      toast.error(message)
      return false
    } finally {
      appStore.setLoading('aplicandoFixos', false)
    }
  }

  function iniciarEdicao(transacao: Transacao): void {
    logger.debug('Iniciando edição', { id: transacao.id })
    appStore.setEditandoId(transacao.id)
  }

  function cancelarEdicao(): void {
    logger.debug('Cancelando edição')
    appStore.setEditandoId(null)
  }

  return {
    carregarTransacoes,
    salvarTransacao,
    excluir,
    aplicarFixos,
    iniciarEdicao,
    cancelarEdicao,
  }
}
