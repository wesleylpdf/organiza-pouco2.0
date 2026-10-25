/**
 * Gerenciamento de ciclo financeiro: loading do ciclo, configuração e utilização de ciclo fixo.
 */

export function renderCycleLoading(container: HTMLElement): void {
  container.innerHTML = `
    <div class="cycle-loading">
      <div class="spinner"></div>
      <p>Carregando ciclo...</p>
    </div>
  `
}

export function hideCycleLoading(container: HTMLElement): void {
  container.innerHTML = ''
}
