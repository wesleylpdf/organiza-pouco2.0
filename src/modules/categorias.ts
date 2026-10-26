import { useCategorias } from '@/hooks/useCategorias'
import { atualizarSelectCategorias } from '@/components/TransacaoForm'
import { criarModalCategorias } from '@/components/ModalCategorias'
import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'

interface CategoriasHandlers {
  updateGrafico: () => Promise<void>
}

let categoriasHandlers: CategoriasHandlers | null = null

export function initCategorias(handlers: CategoriasHandlers): void {
  categoriasHandlers = handlers
}

export async function handleGerenciarCategorias(): Promise<void> {
  logger.debug('Abrindo modal de categorias')
  const categoriasHook = useCategorias()
  const handlers = categoriasHandlers

  if (!handlers) {
    logger.error('Categorias handlers não inicializados')
    return
  }

  criarModalCategorias(
    async (nome, icone, cor) => {
      try {
        const success = await categoriasHook.criarCategoria(nome, icone, cor)
        if (success) {
          atualizarSelectCategorias()
          await handlers.updateGrafico()
        }
        return success
      } catch (err) {
        logger.error('Erro ao criar categoria', err as any)
        toast.error('Erro ao criar categoria')
        return false
      }
    },
    async (id, nome, icone, cor) => {
      try {
        const success = await categoriasHook.atualizarCategoria(id, nome, icone, cor)
        if (success) {
          atualizarSelectCategorias()
          await handlers.updateGrafico()
        }
        return success
      } catch (err) {
        logger.error('Erro ao atualizar categoria', err as any)
        toast.error('Erro ao atualizar categoria')
        return false
      }
    },
    async (id) => {
      try {
        const success = await categoriasHook.excluirCategoria(id)
        if (success) {
          atualizarSelectCategorias()
          await handlers.updateGrafico()
        }
        return success
      } catch (err) {
        logger.error('Erro ao excluir categoria', err as any)
        toast.error('Erro ao excluir categoria')
        return false
      }
    }
  )
}
