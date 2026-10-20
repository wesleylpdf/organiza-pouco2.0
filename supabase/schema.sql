-- Organiza Pouco - Schema do Banco de Dados Supabase
-- Versão: 2.0.0
-- Data: 2026-03-16

-- ============================================
-- TABELA: transacoes
-- ============================================

CREATE TABLE IF NOT EXISTS public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria TEXT NOT NULL,
  fixo BOOLEAN NOT NULL DEFAULT FALSE,
  descricao TEXT,
  ciclo_inicio DATE NOT NULL,
  dividido BOOLEAN NOT NULL DEFAULT FALSE,
  total_parcelas INTEGER,
  parcela_atual INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transacoes_user_ciclo ON public.transacoes(user_id, ciclo_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data ON public.transacoes(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_tipo ON public.transacoes(user_id, tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_fixo ON public.transacoes(user_id, fixo) WHERE fixo = TRUE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem suas próprias transações
DROP POLICY IF EXISTS "Users see own transactions" ON public.transacoes;
CREATE POLICY "Users see own transactions"
  ON public.transacoes
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir apenas suas próprias transações
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transacoes;
CREATE POLICY "Users insert own transactions"
  ON public.transacoes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNÇÕES HELPER
-- ============================================

-- Função: Calcula próximo ciclo (dia 9 do mês seguinte)
CREATE OR REPLACE FUNCTION public.proximo_ciclo(inicio DATE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (date_trunc('month', inicio) + INTERVAL '1 month - 8 days')::DATE;
$$;

-- Função: Calcula ciclo anterior (dia 9 do mês anterior)
CREATE OR REPLACE FUNCTION public.ciclo_anterior(inicio DATE)
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT (date_trunc('month', inicio) - INTERVAL '1 month - 8 days')::DATE;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Atualiza ciclo_inicio automaticamente se data mudar
CREATE OR REPLACE FUNCTION public.update_ciclo_inicio()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_dia_inicio_ciclo INTEGER;
BEGIN
  -- Busca o dia de início do ciclo configurado pelo usuário
  SELECT dia_inicio_ciclo INTO v_dia_inicio_ciclo
  FROM configuracoes_usuario
  WHERE user_id = NEW.user_id;

  IF v_dia_inicio_ciclo IS NULL THEN
    v_dia_inicio_ciclo := 9; -- padrão
  END IF;

  -- Calcula ciclo_inicio baseado na data e configuração do usuário
  -- Se dia < dia_inicio_ciclo, ciclo começou dia dia_inicio_ciclo do mês anterior
  -- Se dia >= dia_inicio_ciclo, ciclo começou dia dia_inicio_ciclo do próprio mês
  NEW.ciclo_inicio := CASE
    WHEN EXTRACT(DAY FROM NEW.data) < v_dia_inicio_ciclo
    THEN (date_trunc('month', NEW.data) - INTERVAL '1 month')::DATE + (v_dia_inicio_ciclo - 1) * INTERVAL '1 day'
    ELSE date_trunc('month', NEW.data)::DATE + (v_dia_inicio_ciclo - 1) * INTERVAL '1 day'
  END;

  RETURN NEW;
END;

  IF dia_inicio_ciclo IS NULL THEN
    dia_inicio_ciclo := 9; -- padrão
  END IF;

  -- Calcula ciclo_inicio baseado na data e configuração do usuário
  -- Se dia < dia_inicio_ciclo, ciclo começou dia dia_inicio_ciclo do mês anterior
  -- Se dia >= dia_inicio_ciclo, ciclo começou dia dia_inicio_ciclo do próprio mês
  NEW.ciclo_inicio := CASE
    WHEN EXTRACT(DAY FROM NEW.data) < dia_inicio_ciclo
    THEN (date_trunc('month', NEW.data) - INTERVAL '1 month')::DATE + (dia_inicio_ciclo - 1) * INTERVAL '1 day'
    ELSE date_trunc('month', NEW.data)::DATE + (dia_inicio_ciclo - 1) * INTERVAL '1 day'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_ciclo_inicio ON public.transacoes;
CREATE TRIGGER trg_update_ciclo_inicio
  BEFORE INSERT OR UPDATE OF data ON public.transacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ciclo_inicio();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.transacoes IS 'Transações financeiras dos usuários';
COMMENT ON COLUMN public.transacoes.id IS 'UUID único da transação';
COMMENT ON COLUMN public.transacoes.user_id IS 'ID do usuário (auth.users)';
COMMENT ON COLUMN public.transacoes.valor IS 'Valor da transação (sempre positivo)';
COMMENT ON COLUMN public.transacoes.data IS 'Data da transação';
COMMENT ON COLUMN public.transacoes.tipo IS 'Tipo: entrada ou saída';
COMMENT ON COLUMN public.transacoes.categoria IS 'Categoria da transação';
COMMENT ON COLUMN public.transacoes.fixo IS 'Indica se é transação fixa recorrente';
COMMENT ON COLUMN public.transacoes.descricao IS 'Descrição opcional da transação';
COMMENT ON COLUMN public.transacoes.ciclo_inicio IS 'Data de início do ciclo financeiro (respeita dia_inicio_ciclo do usuário)';
COMMENT ON COLUMN public.transacoes.created_at IS 'Timestamp de criação';

-- ============================================
-- TABELA: configuracoes_usuario
-- ============================================

CREATE TABLE IF NOT EXISTS public.configuracoes_usuario (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dia_inicio_ciclo INTEGER NOT NULL DEFAULT 9 CHECK (dia_inicio_ciclo BETWEEN 1 AND 31),
  dia_fim_ciclo INTEGER NOT NULL DEFAULT 8 CHECK (dia_fim_ciclo BETWEEN 1 AND 31),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.configuracoes_usuario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own configuracoes" ON public.configuracoes_usuario;
CREATE POLICY "Users see own configuracoes"
  ON public.configuracoes_usuario
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own configuracoes" ON public.configuracoes_usuario;
CREATE POLICY "Users insert own configuracoes"
  ON public.configuracoes_usuario
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own configuracoes" ON public.configuracoes_usuario;
CREATE POLICY "Users update own configuracoes"
  ON public.configuracoes_usuario
  FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.configuracoes_usuario IS 'Configurações de ciclo financeiro do usuário';
COMMENT ON COLUMN public.configuracoes_usuario.dia_inicio_ciclo IS 'Dia de início do ciclo financeiro';
COMMENT ON COLUMN public.configuracoes_usuario.dia_fim_ciclo IS 'Dia de fim do ciclo financeiro';

-- ============================================
-- TABELA: categorias
-- ============================================

CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  icone TEXT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, nome)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_categorias_user ON public.categorias(user_id);

-- RLS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own categorias" ON public.categorias;
CREATE POLICY "Users see own categorias"
  ON public.categorias
  FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own categorias" ON public.categorias;
CREATE POLICY "Users insert own categorias"
  ON public.categorias
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.categorias IS 'Categorias personalizadas dos usuários';
COMMENT ON COLUMN public.categorias.id IS 'UUID único da categoria';
COMMENT ON COLUMN public.categorias.user_id IS 'ID do usuário (auth.users)';
COMMENT ON COLUMN public.categorias.nome IS 'Nome da categoria';
COMMENT ON COLUMN public.categorias.icone IS 'Emoji opcional da categoria';
COMMENT ON COLUMN public.categorias.created_at IS 'Timestamp de criação';

-- ============================================
-- DADOS INICIAIS: Categorias padrão
-- ============================================

-- Função para inserir categorias padrão para novos usuários
CREATE OR REPLACE FUNCTION public.inserir_categorias_padrao()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.categorias (user_id, nome, icone) VALUES
    (NEW.id, 'Salário', '💰'),
    (NEW.id, 'Alimentação', '🍕'),
    (NEW.id, 'Moradia', '🏠'),
    (NEW.id, 'Transporte', '🚗'),
    (NEW.id, 'Lazer', '🎮'),
    (NEW.id, 'Saúde', '🏥'),
    (NEW.id, 'Educação', '📚'),
    (NEW.id, 'Investimentos', '📈'),
    (NEW.id, 'Outros', '✨');
  RETURN NEW;
END;
$$;

-- Trigger para criar categorias padrão quando novo usuário se registra
DROP TRIGGER IF EXISTS trg_novo_usuario_categorias ON auth.users;
CREATE TRIGGER trg_novo_usuario_categorias
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.inserir_categorias_padrao();
