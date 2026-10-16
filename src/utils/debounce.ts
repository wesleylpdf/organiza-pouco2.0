/**
 * Utilitários de debounce e throttle
 */

/**
 * Debounce: executa função após N ms de inatividade
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttle: executa função no máximo uma vez por N ms
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= limit) {
      fn(...args)
      lastCall = now
    } else if (!timeoutId) {
      // Agenda execução no final do período
      timeoutId = setTimeout(() => {
        fn(...args)
        lastCall = Date.now()
        timeoutId = null
      }, limit - timeSinceLastCall)
    }
  }
}
