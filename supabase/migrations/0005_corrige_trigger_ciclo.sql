-- Alinha o trigger update_ciclo_inicio() com o cálculo do cliente.
--
-- Antes, o trigger usava aritmética sem limite:
--   date_trunc('month', data) + (dia_inicio - 1) days
-- Para dia_inicio = 31 e data em fevereiro, isso produzia 3 de março.
-- Para dia_inicio = 30 em fevereiro, produzia 2 de março. O cliente limita ao
-- último dia do mês, então os dois lados divergiam e o banco sobrescrevia
-- ciclo_inicio com um valor diferente do calculado no app.
--
-- Agora ambos usam: início = dia min(dia_inicio, último dia do mês).

-- Início do ciclo que contém `p_data`, limitando o dia ao último dia do mês.
CREATE OR REPLACE FUNCTION public.calcular_ciclo_inicio(
  p_data DATE,
  p_dia_inicio INTEGER
)
RETURNS DATE
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_data >= date_trunc('month', p_data)::DATE
                    + (LEAST(p_dia_inicio,
                             EXTRACT(DAY FROM (date_trunc('month', p_data)::DATE + INTERVAL '1 month - 1 day'))::INTEGER) - 1)
    THEN date_trunc('month', p_data)::DATE
         + (LEAST(p_dia_inicio,
                  EXTRACT(DAY FROM (date_trunc('month', p_data)::DATE + INTERVAL '1 month - 1 day'))::INTEGER) - 1)
    ELSE (date_trunc('month', p_data)::DATE - INTERVAL '1 month')::DATE
         + (LEAST(p_dia_inicio,
                  EXTRACT(DAY FROM ((date_trunc('month', p_data)::DATE - INTERVAL '1 month')::DATE + INTERVAL '1 month - 1 day'))::INTEGER) - 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.update_ciclo_inicio()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
DECLARE
  v_dia_inicio_ciclo INTEGER;
BEGIN
  SELECT dia_inicio_ciclo INTO v_dia_inicio_ciclo
  FROM public.configuracoes_usuario
  WHERE user_id = NEW.user_id;

  IF v_dia_inicio_ciclo IS NULL THEN
    v_dia_inicio_ciclo := 9; -- padrão
  END IF;

  NEW.ciclo_inicio := public.calcular_ciclo_inicio(NEW.data, v_dia_inicio_ciclo);

  RETURN NEW;
END;
$$;

-- Recalcula ciclo_inicio das transações já existentes.
-- O trigger é BEFORE UPDATE OF data, então este UPDATE não o dispara.
UPDATE public.transacoes t
SET ciclo_inicio = public.calcular_ciclo_inicio(t.data, c.dia_inicio_ciclo)
FROM public.configuracoes_usuario c
WHERE c.user_id = t.user_id
  AND t.ciclo_inicio IS DISTINCT FROM public.calcular_ciclo_inicio(t.data, c.dia_inicio_ciclo);
