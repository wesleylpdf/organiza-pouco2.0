-- Criar função que insere configuração padrão de ciclo para novo usuário
CREATE OR REPLACE FUNCTION public.inserir_configuracao_ciclo_padrao()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  INSERT INTO public.configuracoes_usuario (user_id, dia_inicio_ciclo, dia_fim_ciclo)
  VALUES (NEW.id, 9, 8);
  RETURN NEW;
END;
$$;

-- Trigger: cria configuração de ciclo automaticamente ao cadastrar novo usuário
DROP TRIGGER IF EXISTS trg_novo_usuario_configuracao_ciclo ON auth.users;
CREATE TRIGGER trg_novo_usuario_configuracao_ciclo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.inserir_configuracao_ciclo_padrao();
