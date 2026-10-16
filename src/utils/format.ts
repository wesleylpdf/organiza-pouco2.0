/**
 * Formata valor monetário em BRL
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formata data ISO para formato pt-BR
 */
export function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  return data.toLocaleDateString('pt-BR')
}

/**
 * Sanitiza string para uso em HTML (previne XSS)
 */
export function sanitizarHTML(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
