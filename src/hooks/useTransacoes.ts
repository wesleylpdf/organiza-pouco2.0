/**
 * Hook de transações
 * Encapsula lógica de negócios e integração com store
 */

import { appStore } from '@/stores/AppState'
import { supabase } from '@/lib/supabaseClient'
import {
  listarTransacoes,
  criarTransacao,
  atualizarTransacao,
  excluirTransacao,
  listarParcelasRelacionadas,
  excluirParcelasRelacionadas,
  duplicarFixosCicloAnterior,
} from '@/services/transacoes'
import { validarTransacao, extrairMensagemErro } from '@/utils/validation'
import { logger } from '@/utils/logger'
import { formatDateLocalISO } from '@/utils/ciclo'
import type { Transacao, TipoTransacao } from '@/types'

export interface CriarTransacaoParams {
  valor: number
  data: string
  tipo: TipoTransacao
  categoria: string
  descricao: string
  dividido: boolean
  totalParcelas: number
}

export function useTransacoes() {
  async function carregarTransacoes(): Promise<void> {
    try {
      appStore.setLoading('transacoes', true)
      appStore.clearError()

      const ciclo = appStore.getCicloAtual()
      const cicloInicio = appStore.getCicloInicioISO()
      const dataFim = formatDateLocalISO(ciclo.fim)
      const cicloKey = `${ciclo.inicio.toISOString()}-${ciclo.fim.toISOString()}`

      logger.debug('Carregando transações', { cicloInicio, dataFim })

      // Verifica cache antes de consultar a API
      const cache = appStore.getTransacoesPorCiclo(cicloKey)
      if (cache) {
        appStore.setTransacoes(cache)
        logger.info('Transações carregadas do cache', { count: cache.length })
        return
      }

      const transacoes = await listarTransacoes({
        dataInicio: cicloInicio,
        dataFim,
      })
      appStore.setTransacoes(transacoes)
      appStore.setTransacoesPorCiclo(cicloKey, transacoes)

      logger.info('Transações carregadas', { count: transacoes.length })
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao carregar transações', { error })
      appStore.setError(message)
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
        const transacoes = appStore.getTransacoes()
        const original = transacoes.find(tx => tx.id === editandoId)

        if (original?.dividido && original.totalParcelas) {
          logger.debug('Atualizando parcelas relacionadas', { id: editandoId, totalParcelas: original.totalParcelas })
          const descricaoBase = (original.descricao || '').replace(/\s+\d+\/\d+$/, '')
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) throw new Error('Usuário não autenticado')

          const relacionadas = await listarParcelasRelacionadas({
            userId: user.id,
            totalParcelas: original.totalParcelas,
            descricaoBase,
          })

          // Ordena por data crescente (primeira parcela primeiro)
          relacionadas.sort((a, b) => a.data.localeCompare(b.data))

          const qtdeAtual = relacionadas.length
          const qtdeNova = params.totalParcelas || 1
          const qtdeManter = Math.min(qtdeAtual, qtdeNova)

          // Atualiza as parcelas que serão mantidas (sem alterar data, pois estão em meses diferentes)
          for (let i = 0; i < qtdeManter; i++) {
            const tx = relacionadas[i]
            await atualizarTransacao(tx.id, {
              valor: params.valor,
              tipo: params.tipo,
              categoria: params.categoria,
              descricao: `${params.descricao} ${i + 1}/${qtdeNova}`,
              dividido: params.dividido,
              totalParcelas: qtdeNova,
            })
          }

          // Exclui parcelas excedentes quando diminui a quantidade
          const paraExcluir = relacionadas.slice(qtdeManter)
          if (paraExcluir.length > 0) {
            await excluirParcelasRelacionadas(paraExcluir.map(tx => tx.id))
          }

          // Cria parcelas faltantes quando aumenta a quantidade
          if (qtdeNova > qtdeAtual) {
            const ultimaParcela = relacionadas[relacionadas.length - 1]
            const dataBase = ultimaParcela
              ? new Date(ultimaParcela.data + 'T00:00:00')
              : new Date(params.data + 'T00:00:00')
            for (let i = qtdeAtual; i < qtdeNova; i++) {
              const dataNova = new Date(dataBase)
              dataNova.setMonth(dataNova.getMonth() + (i - qtdeAtual + 1))
              await criarTransacao({
                ...params,
                data: dataNova.toISOString().slice(0, 10),
                parcelaAtual: i + 1,
                descricao: `${params.descricao} ${i + 1}/${qtdeNova}`,
                totalParcelas: qtdeNova,
              } as CriarTransacaoParams)
            }
          }
        } else {
          logger.debug('Atualizando transação', { id: editandoId, params })
          await atualizarTransacao(editandoId, params)
        }

        appStore.setEditandoId(null)
      } else if (params.dividido && params.totalParcelas > 1) {
        logger.debug('Criando transação dividida', { totalParcelas: params.totalParcelas })
        const dataInicial = new Date(params.data + 'T00:00:00')
        for (let i = 0; i < params.totalParcelas; i++) {
          const dataParcela = new Date(dataInicial)
          dataParcela.setMonth(dataParcela.getMonth() + i)
          await criarTransacao({
            ...params,
            data: dataParcela.toISOString().slice(0, 10),
            parcelaAtual: i + 1,
            descricao: `${params.descricao} ${i + 1}/${params.totalParcelas}`,
          } as CriarTransacaoParams)
        }
      } else {
        logger.debug('Criando transação', { params })
        await criarTransacao(params)
      }

      logger.info('Transação salva com sucesso')
      appStore.limparCacheCiclo()
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao salvar transação', { error, params })
      appStore.setError(message)
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

      const transacoes = appStore.getTransacoes()
      const original = transacoes.find(tx => tx.id === id)

      if (original?.dividido && original.totalParcelas) {
        logger.debug('Excluindo parcelas relacionadas', { id, totalParcelas: original.totalParcelas })
        const descricaoBase = (original.descricao || '').replace(/\s+\d+\/\d+$/, '')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        const relacionadas = await listarParcelasRelacionadas({
          userId: user.id,
          totalParcelas: original.totalParcelas,
          descricaoBase,
        })

        await excluirParcelasRelacionadas(relacionadas.map(tx => tx.id))
      } else {
        logger.debug('Excluindo transação', { id })
        await excluirTransacao(id)
      }

      logger.info('Transação excluída', { id })
      appStore.limparCacheCiclo()
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao excluir transação', { error, id })
      appStore.setError(message)
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

      logger.info('Fixos aplicados', { quantidade })

      appStore.limparCacheCiclo()
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao aplicar fixos', { error })
      appStore.setError(message)
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
