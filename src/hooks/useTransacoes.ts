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
  atualizarParcelasRelacionadas,
  excluirParcelasRelacionadas,
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
  valorOriginal?: number | null
  fixo: boolean
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
          // Se o usuário desmarcou "dividida", mantém apenas um lançamento
          const qtdeNova = params.dividido && params.totalParcelas > 1 ? params.totalParcelas : 1
          const qtdeManter = Math.min(qtdeAtual, qtdeNova)

          // Atualiza as parcelas que serão mantidas (sem alterar data, pois estão em meses diferentes)
          const paraManter = relacionadas.slice(0, qtdeManter)
          if (paraManter.length > 0) {
            await atualizarParcelasRelacionadas(paraManter.map(tx => tx.id), {
              valor: params.valor,
              tipo: params.tipo,
              categoria: params.categoria,
              descricao: params.descricao,
              dividido: qtdeNova > 1,
              totalParcelas: qtdeNova > 1 ? qtdeNova : null,
              valorOriginal: params.valorOriginal ?? null,
              fixo: params.fixo,
            })

            // Renumera as parcelas mantidas quando a quantidade mudou
            if (qtdeAtual !== qtdeNova) {
              await Promise.all(
                paraManter.map((tx, i) =>
                  atualizarTransacao(tx.id, { parcelaAtual: qtdeNova > 1 ? i + 1 : null })
                )
              )
            }
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
            await Promise.all(
              Array.from({ length: qtdeNova - qtdeAtual }, (_, i) => {
                const dataNova = new Date(dataBase)
                dataNova.setMonth(dataNova.getMonth() + (i + 1))
                return criarTransacao({
                  ...params,
                  data: formatDateLocalISO(dataNova),
                  parcelaAtual: qtdeAtual + i + 1,
                  descricao: params.descricao,
                  totalParcelas: qtdeNova,
                  fixo: params.fixo,
                } as CriarTransacaoParams)
              })
            )
          }
        } else { // Se não era dividida ou não tem mais parcelas, atualiza como transação única
          logger.debug('Atualizando transação única', { id: editandoId, params })
          await atualizarTransacao(editandoId, { ...params, fixo: params.fixo })
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
            data: formatDateLocalISO(dataParcela),
            parcelaAtual: i + 1,
            descricao: params.descricao,
            fixo: params.fixo,
          } as CriarTransacaoParams)
        }
      } else {
        logger.debug('Criando transação única', { params })
        await criarTransacao({ ...params, fixo: params.fixo })
      }

      logger.info('Transação salva com sucesso')
      appStore.limparCacheCiclo(appStore.getCicloInicioISO())
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
      appStore.limparCacheCiclo(appStore.getCicloInicioISO())
      await carregarTransacoes()
      return true
    } catch (error) {
      const message = extrairMensagemErro(error)
      logger.error('Erro ao excluir transação', { error, id })
      appStore.setError(message)
      return false
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
    iniciarEdicao,
    cancelarEdicao,
  }
}
