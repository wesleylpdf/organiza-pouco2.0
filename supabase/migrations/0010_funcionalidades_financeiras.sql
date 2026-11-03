-- Migration 0010: Suporte a Status Pago/Pendente e Meta Mensal de Gastos
-- Data: 2026-11-03

-- 1. Adiciona coluna `pago` na tabela `transacoes` para controlar lançamentos pagos/pendentes
ALTER TABLE transacoes
ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT FALSE;

-- 2. Adiciona coluna `meta_gastos` na tabela `configuracoes_usuario` para armazenar o limite mensal do ciclo
ALTER TABLE configuracoes_usuario
ADD COLUMN IF NOT EXISTS meta_gastos NUMERIC DEFAULT NULL;
