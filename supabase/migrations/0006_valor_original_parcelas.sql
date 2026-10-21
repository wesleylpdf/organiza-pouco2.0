-- Guarda o valor original de uma transação parcelada com "Dividir valor pelas parcelas?".
--
-- Quando o usuário marca essa opção, cada parcela recebe valor / total_parcelas.
-- Sem essa coluna a tela só conseguia mostrar o valor da parcela, escondendo o
-- valor total da compra original.

ALTER TABLE public.transacoes
  ADD COLUMN IF NOT EXISTS valor_original NUMERIC(12, 2);

COMMENT ON COLUMN public.transacoes.valor_original IS
  'Valor original (sem divisão) quando o usuário marcou "Dividir valor pelas parcelas?"';
