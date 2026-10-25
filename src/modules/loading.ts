/**
 * Tela de carregamento inicial da aplicação.
 */

export function renderLoading(container: HTMLElement): void {
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando...</p>
    </div>
  `
}

export function hideLoading(container: HTMLElement): void {
  container.innerHTML = ''
}
