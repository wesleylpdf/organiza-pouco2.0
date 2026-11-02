-- Organiza Pouco - Migration 0009
-- Data: 2026-11-02
-- Adiciona coluna grupo_parcela_id para agrupar com precisão as parcelas de uma mesma compra

-- 1. Adiciona a coluna grupo_parcela_id na tabela transacoes
ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS grupo_parcela_id UUID;

-- 2. Cria índice parcial para buscas rápidas das parcelas de um mesmo grupo
CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_parcela
  ON public.transacoes(user_id, grupo_parcela_id)
  WHERE grupo_parcela_id IS NOT NULL;

-- 3. Preenche automaticamente grupo_parcela_id para as compras parceladas já existentes no banco
WITH grupos_existentes AS (
  SELECT
    user_id,
    regexp_replace(COALESCE(descricao, ''), '\s+\d+/\d+$', '') AS descricao_base,
    total_parcelas,
    valor,
    tipo,
    categoria,
    gen_random_uuid() AS novo_grupo_id
  FROM public.transacoes
  WHERE dividido = TRUE
    AND total_parcelas IS NOT NULL
    AND grupo_parcela_id IS NULL
  GROUP BY
    user_id,
    regexp_replace(COALESCE(descricao, ''), '\s+\d+/\d+$', ''),
    total_parcelas,
    valor,
    tipo,
    categoria
)
UPDATE public.transacoes t
SET grupo_parcela_id = g.novo_grupo_id
FROM grupos_existentes g
WHERE t.dividido = TRUE
  AND t.grupo_parcela_id IS NULL
  AND t.user_id = g.user_id
  AND regexp_replace(COALESCE(t.descricao, ''), '\s+\d+/\d+$', '') = g.descricao_base
  AND t.total_parcelas = g.total_parcelas
  AND t.valor = g.valor
  AND t.tipo = g.tipo
  AND t.categoria = g.categoria;

COMMENT ON COLUMN public.transacoes.grupo_parcela_id IS 'UUID compartilhado entre todas as parcelas de uma mesma compra dividida';
