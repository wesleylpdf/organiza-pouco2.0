-- Adicionar coluna cor na tabela categorias
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS cor TEXT;

-- Atualizar categorias existentes com cores padrão
UPDATE public.categorias SET cor = '#10b981' WHERE nome = 'Salário' AND cor IS NULL;
UPDATE public.categorias SET cor = '#f59e0b' WHERE nome = 'Alimentação' AND cor IS NULL;
UPDATE public.categorias SET cor = '#3b82f6' WHERE nome = 'Moradia' AND cor IS NULL;
UPDATE public.categorias SET cor = '#8b5cf6' WHERE nome = 'Transporte' AND cor IS NULL;
UPDATE public.categorias SET cor = '#ec4899' WHERE nome = 'Lazer' AND cor IS NULL;
UPDATE public.categorias SET cor = '#ef4444' WHERE nome = 'Saúde' AND cor IS NULL;
UPDATE public.categorias SET cor = '#06b6d4' WHERE nome = 'Educação' AND cor IS NULL;
UPDATE public.categorias SET cor = '#84cc16' WHERE nome = 'Investimentos' AND cor IS NULL;
UPDATE public.categorias SET cor = '#64748b' WHERE nome = 'Outros' AND cor IS NULL;
