/**
 * Gerenciamento de categorias: listagem, adição e exclusão.
 */

export interface CategoriaItem {
  id: string
  nome: string
  cor?: string
}

export function renderCategorias(container: HTMLElement, categorias: CategoriaItem[]): void {
  container.innerHTML = `
    <h3>Categorias</h3>
    <ul class="categorias-lista">
      ${categorias.map((c) => `<li>${c.nome}</li>`).join('')}
    </ul>
  `
}

export function adicionarCategoria(categorias: CategoriaItem[], nome: string): CategoriaItem[] {
  const nova: CategoriaItem = { id: crypto.randomUUID(), nome }
  return [...categorias, nova]
}

export function removerCategoria(categorias: CategoriaItem[], id: string): CategoriaItem[] {
  return categorias.filter((c) => c.id !== id)
}
