import { supabase } from '@/lib/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

type AuthCallback = (state: AuthState) => void

let currentState: AuthState = {
  user: null,
  session: null,
  loading: true,
}

let listeners: AuthCallback[] = []

/**
 * Inicializa auth e escuta mudanças de estado
 */
export function initAuth(): () => void {
  // Busca sessão atual
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentState = {
      user: session?.user ?? null,
      session,
      loading: false,
    }
    notifyListeners()
  })

  // Escuta mudanças (login, logout, token refresh)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    currentState = {
      user: session?.user ?? null,
      session,
      loading: false,
    }
    notifyListeners()
  })

  return () => subscription.unsubscribe()
}

/**
 * Registra callback para mudanças de auth
 */
export function onAuthChange(callback: AuthCallback): () => void {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter(l => l !== callback)
  }
}

/**
 * Retorna estado atual do auth
 */
export function getAuthState(): AuthState {
  return currentState
}

function notifyListeners(): void {
  listeners.forEach(l => l(currentState))
}

/**
 * Login com email e senha
 */
export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Cadastro com email e senha
 */
export async function cadastro(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
}

/**
 * Envia email de reset de senha
 */
export async function resetSenha(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
