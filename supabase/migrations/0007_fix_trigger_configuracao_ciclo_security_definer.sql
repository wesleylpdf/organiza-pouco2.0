-- Corrige "Database error saving new user" no cadastro.
--
-- A função inserir_configuracao_ciclo_padrao() (0003) rodava com os privilégios
-- do papel que disparou o trigger. No signup esse papel é supabase_auth_admin,
-- que não tem INSERT em public.configuracoes_usuario nem passa pela RLS
-- (auth.uid() é nulo nesse contexto). A exceção abortava a criação do usuário.
--
-- Segue o mesmo padrão de inserir_categorias_padrao(), que já era SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.inserir_configuracao_ciclo_padrao()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.configuracoes_usuario (user_id, dia_inicio_ciclo, dia_fim_ciclo)
  VALUES (NEW.id, 9, 8)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Garante que o papel do Auth consiga disparar o trigger.
GRANT EXECUTE ON FUNCTION public.inserir_configuracao_ciclo_padrao() TO supabase_auth_admin;

DROP TRIGGER IF EXISTS trg_novo_usuario_configuracao_ciclo ON auth.users;
CREATE TRIGGER trg_novo_usuario_configuracao_ciclo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.inserir_configuracao_ciclo_padrao();

-- Usuários criados enquanto o trigger estava quebrado podem ter ficado sem a
-- linha de configuração. Reaproveita os padrões da tabela (9 e 8).
INSERT INTO public.configuracoes_usuario (user_id)
SELECT u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.configuracoes_usuario c WHERE c.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
