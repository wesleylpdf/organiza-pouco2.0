import { supabase } from '@/lib/supabaseClient'

export interface ConfiguracaoCiclo {
  dia_inicio_ciclo: number
  dia_fim_ciclo: number
}

/**
 * Busca configuração de ciclo do usuário no Supabase
 */
export async function buscarConfiguracaoCiclo(
  userId: string
): Promise<ConfiguracaoCiclo | null> {
  const { data, error } = await supabase
    .from('configuracoes_usuario')
    .select('dia_inicio_ciclo, dia_fim_ciclo')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Salva (ou atualiza) configuração de ciclo do usuário no Supabase
 */
export async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('configuracoes_usuario').upsert({
    user_id: userId,
    dia_inicio_ciclo: diaInicio,
    dia_fim_ciclo: diaFim,
  })

  if (error) throw error
}
