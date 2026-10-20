import { supabase } from '@/lib/supabaseClient'

export interface ConfiguracaoCiclo {
  dia_inicio_ciclo: number
  dia_fim_ciclo: number
}

/**
 * Busca configuração de ciclo do usuário no Supabase
 */
export async function buscarConfiguracaoCiclo(): Promise<ConfiguracaoCiclo | null> {
  const { data, error } = await supabase
    .from('configuracoes_usuario')
    .select('dia_inicio_ciclo, dia_fim_ciclo')
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Salva (ou atualiza) configuração de ciclo do usuário no Supabase
 */
export async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number
): Promise<void> {
  const { error } = await supabase.from('configuracoes_usuario').upsert({
    dia_inicio_ciclo: diaInicio,
    dia_fim_ciclo: diaFim,
  })

  if (error) throw error
}
