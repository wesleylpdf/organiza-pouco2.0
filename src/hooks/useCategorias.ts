import { appStore } from '@/stores/AppState'
import * as categoriasService from '@/services/categorias'
import { toast } from '@/utils/toast'
import { logger } from '@/utils/logger'

export function useCategorias() {
  async function carregarCategorias(): Promise<void> {
    try {
      appStore.setLoading('categorias', true)
      const categorias = await categoriasService.listarCategorias()
      appStore.setCategorias(categorias)
    } catch (error) {
      logger.error('Erro ao carregar categorias', { error })
      toast.error('Erro ao carregar categorias')
    } finally {
      appStore.setLoading('categorias', false)
    }
  }

  async function criarCategoria(nome: string, icone?: string, cor?: string): Promise<boolean> {
    try {
      appStore.setLoading('categorias', true)
      await categoriasService.criarCategoria({ nome, icone, cor })
      await carregarCategorias()
      toast.success('Categoria criada!')
      return true
    } catch (error) {
      logger.error('Erro ao criar categoria', { error })
      toast.error(error instanceof Error ? error.message : 'Erro ao criar categoria')
      return false
    } finally {
      appStore.setLoading('categorias', false)
    }
  }

  async function atualizarCategoria(id: string, nome: string, icone?: string, cor?: string): Promise<boolean> {
    try {
      appStore.setLoading('categorias', true)
      await categoriasService.atualizarCategoria(id, { nome, icone, cor })
      await carregarCategorias()
      toast.success('Categoria atualizada!')
      return true
    } catch (error) {
      logger.error('Erro ao atualizar categoria', { error })
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar categoria')
      return false
    } finally {
      appStore.setLoading('categorias', false)
    }
  }

  async function excluirCategoria(id: string): Promise<boolean> {
    try {
      appStore.setLoading('categorias', true)
      await categoriasService.excluirCategoria(id)
      await carregarCategorias()
      toast.success('Categoria excluída!')
      return true
    } catch (error) {
      logger.error('Erro ao excluir categoria', { error })
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir categoria')
      return false
    } finally {
      appStore.setLoading('categorias', false)
    }
  }

  return {
    carregarCategorias,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
  }
}
