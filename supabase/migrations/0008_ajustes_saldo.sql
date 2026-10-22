-- Organiza Pouco - Migration 0008
-- Data: 2026-10-22
-- Tabela de ajustes manuais de saldo final (ajuste invisível na UI)

-- ============================================
-- TABELA: ajustes_saldo
-- ============================================

CREATE TABLE IF NOT EXISTS public.ajustes_saldo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consulta por usuário e data (filtro de ciclo)
CREATE INDEX IF NOT EXISTS idx_ajustes_saldo_user_data ON public.ajustes_saldo(user_id, data);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.ajustes_saldo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own ajustes saldo" ON public.ajustes_saldo;
CREATE POLICY "Users see own ajustes saldo"
  ON public.ajustes_saldo
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own ajustes saldo" ON public.ajustes_saldo;
CREATE POLICY "Users insert own ajustes saldo"
  ON public.ajustes_saldo
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ajustes_saldo IS 'Ajustes manuais de saldo final (apenas afeta o número do saldo final, não aparece na UI)';
COMMENT ON COLUMN public.ajustes_saldo.valor IS 'Valor do ajuste (sempre positivo)';
COMMENT ON COLUMN public.ajustes_saldo.tipo IS 'Tipo: entrada ou saída';
COMMENT ON COLUMN public.ajustes_saldo.descricao IS 'Descrição opcional do ajuste';
COMMENT ON COLUMN public.ajustes_saldo.data IS 'Data do ajuste (filtrada pelo ciclo selecionado)';
