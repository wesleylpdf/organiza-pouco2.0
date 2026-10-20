/**
 * Store de estado da aplicação
 * Encapsula estado global e fornece métodos de atualização
 */

import type { Transacao } from '@/types'
import type { CategoriaPersonalizada } from '@/services/categorias'
import { getCicloAtual, formatCicloISO } from '@/utils/ciclo'

interface AppState {
  transacoes: Transacao[]
  categorias: CategoriaPersonalizada[]
  cycleOffset: number
  diaInicioCiclo: number
  diaFimCiclo: number
  editandoId: string | null
  loading: {
    transacoes: boolean
    salvando: boolean
    aplicandoFixos: boolean
    categorias: boolean
  }
  error: string | null
}

type Listener = () => void

class AppStateStore {
  private state: AppState = {
    transacoes: [],
    categorias: [],
    cycleOffset: 0,
    diaInicioCiclo: 9,
    diaFimCiclo: 8,
    editandoId: null,
    loading: {
      transacoes: false,
      salvando: false,
      aplicandoFixos: false,
      categorias: false,
    },
    error: null,
  }

  private listeners: Set<Listener> = new Set()

  getState(): AppState {
    return this.state
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach(l => l())
  }

  // Transações
  setTransacoes(transacoes: Transacao[]): void {
    this.state = { ...this.state, transacoes }
    this.notify()
  }

  getTransacoes(): Transacao[] {
    return this.state.transacoes
  }

  // Categorias
  setCategorias(categorias: CategoriaPersonalizada[]): void {
    this.state = { ...this.state, categorias }
    this.notify()
  }

  getCategorias(): CategoriaPersonalizada[] {
    return this.state.categorias
  }

  // Ciclo
  setCycleOffset(offset: number): void {
    this.state = { ...this.state, cycleOffset: offset }
    this.notify()
  }

  // Configuração do ciclo
  setConfiguracaoCiclo(diaInicio: number, diaFim: number): void {
    this.state = { ...this.state, diaInicioCiclo: diaInicio, diaFimCiclo: diaFim }
    this.notify()
  }

  getDiaInicioCiclo(): number {
    return this.state.diaInicioCiclo
  }

  getDiaFimCiclo(): number {
    return this.state.diaFimCiclo
  }

  getCicloAtual() {
    return getCicloAtual(this.state.cycleOffset, this.state.diaInicioCiclo, this.state.diaFimCiclo)
  }

  getCicloInicioISO(): string {
    return formatCicloISO(this.getCicloAtual().inicio)
  }

  // Edição
  setEditandoId(id: string | null): void {
    this.state = { ...this.state, editandoId: id }
    this.notify()
  }

  getEditandoId(): string | null {
    return this.state.editandoId
  }

  // Loading
  setLoading(key: keyof AppState['loading'], value: boolean): void {
    this.state = {
      ...this.state,
      loading: { ...this.state.loading, [key]: value }
    }
    this.notify()
  }

  isLoading(key?: keyof AppState['loading']): boolean {
    if (key) return this.state.loading[key]
    return Object.values(this.state.loading).some(v => v)
  }

  // Error
  setError(error: string | null): void {
    this.state = { ...this.state, error }
    this.notify()
  }

  getError(): string | null {
    return this.state.error
  }

  clearError(): void {
    this.setError(null)
  }

  // Reset
  reset(): void {
    this.state = {
      transacoes: [],
      categorias: [],
      cycleOffset: 0,
      diaInicioCiclo: 9,
      diaFimCiclo: 8,
      editandoId: null,
      loading: { transacoes: false, salvando: false, aplicandoFixos: false, categorias: false },
      error: null,
    }
    this.notify()
  }
}

// Instância singleton
export const appStore = new AppStateStore()
