import type { Transacao } from '@/types'

function getChaveStorage(userId?: string | null): string {
  return `status_pago_${userId || 'anonimo'}`
}

function lerMapaPagoLocal(userId?: string | null): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(getChaveStorage(userId))
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function isTransacaoPaga(t: Transacao, userId?: string | null): boolean {
  const mapa = lerMapaPagoLocal(userId)
  if (t.id in mapa) {
    return Boolean(mapa[t.id])
  }
  return Boolean(t.pago)
}

export function definirStatusPagoLocal(id: string, pago: boolean, userId?: string | null): void {
  try {
    const mapa = lerMapaPagoLocal(userId)
    mapa[id] = pago
    localStorage.setItem(getChaveStorage(userId), JSON.stringify(mapa))
  } catch {
    // Ignora falha de localStorage
  }
}
