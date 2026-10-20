-- Permite configurar dias do ciclo até 31 (antes limitado a 28).
-- Meses com menos dias são tratados no cliente (clamp para o último dia do mês).

ALTER TABLE public.configuracoes_usuario
  DROP CONSTRAINT IF EXISTS configuracoes_usuario_dia_inicio_ciclo_check;

ALTER TABLE public.configuracoes_usuario
  DROP CONSTRAINT IF EXISTS configuracoes_usuario_dia_fim_ciclo_check;

ALTER TABLE public.configuracoes_usuario
  ADD CONSTRAINT configuracoes_usuario_dia_inicio_ciclo_check
    CHECK (dia_inicio_ciclo BETWEEN 1 AND 31);

ALTER TABLE public.configuracoes_usuario
  ADD CONSTRAINT configuracoes_usuario_dia_fim_ciclo_check
    CHECK (dia_fim_ciclo BETWEEN 1 AND 31);
