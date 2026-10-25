# Resumo da Sessão - organiza-pouco

**Data:** 2026-10-20  
**Status:** Em andamento — CORREÇÃO APLICADA, AGUARDANDO TESTE  
**Problema:** Configuração de ciclo (dia início/fim) não persiste nas tabelas do Supabase. Ao deslogar/logar ou atualizar a página, o ciclo volta para o padrão (início 09, fim 08).

---

## 1. Problema Reportado

- Clicar no botão "Salvar" da configuração de ciclo **não grava** na tabela `configuracoes_usuario`.
- Na tabela `transacoes`, a coluna `ciclo_inicio` fica sempre com dia 09 (padrão) em vez do dia escolhido pelo usuário.
- Ao deslogar/logar ou atualizar a página, o ciclo volta para início 09 e fim 08.

---

## 2. Estrutura de Diretórios

```
D:\openclaude\organiza-pouco\
├── src\
│   ├── main.ts
│   ├── services\
│   │   └── configuracoes.ts
│   ├── hooks\
│   │   ├── useAuth.ts
│   │   └── useTransacoes.ts
│   ├── components\
│   │   ├── Header.ts
│   │   ├── TransacaoForm.ts
│   │   ├── TransacaoList.ts
│   │   ├── GraficoPizza.ts
│   │   └── ModalCategorias.ts
│   ├── utils\
│   │   ├── ciclo.ts
│   │   ├── debounce.ts
│   │   ├── format.ts
│   │   ├── logger.ts
│   │   └── toast.ts
│   ├── stores\
│   │   └── AppState.ts
│   └── types.ts
├── supabase\
│   ├── schema.sql
│   └── migrations\
│       └── 0003_configuracao_ciclo_padrao.sql
└── package.json
```

---

## 3. Arquivos Alterados Nesta Sessão

### `src/services/configuracoes.ts`
**Antes:**
```ts
export async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number
): Promise<void> {
  const { error } = await supabase.from('configuracoes_usuario').upsert({
    dia_inicio_ciclo: diaInicio,
    dia_fim_ciclo: diaFim,
  })
  if (error) throw error
}
```

**Depois:**
```ts
export async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('configuracoes_usuario').upsert({
    user_id: userId,
    dia_inicio_ciclo: diaInicio,
    dia_fim_ciclo: diaFim,
  })
  if (error) throw error
}
```

### `src/main.ts`
**Antes:** chamava `salvarConfiguracaoCicloSupabase(diaInicio, diaFim, userId!)` — `userId` podía ser `undefined` e era passado com non-null assertion, gravando `undefined` no Supabase.

**Depois:**
```ts
async function salvarConfiguracaoCiclo(
  diaInicio: number,
  diaFim: number,
  userEmail: string
): Promise<void> {
  const userId = getAuthState().user?.id
  if (!userId) {
    localStorage.setItem(`configuracao_ciclo_${userEmail}`, JSON.stringify({ diaInicio, diaFim }))
    return
  }
  try {
    await salvarConfiguracaoCicloSupabase(diaInicio, diaFim, userId)
  } catch {
    localStorage.setItem(`configuracao_ciclo_${userEmail}`, JSON.stringify({ diaInicio, diaFim }))
  }
}
```

### Commit realizado
- Commit `ffe3134` — `fix(ciclo): passar user_id ao salvar configuracao de ciclo`
- Push para `origin/main` (https://github.com/wesleylpdf/organiza-pouco2.0.git)

---

## 4. Por que o Problema Continua (Hipóteses)

A correção acima adicionou `user_id` ao upsert, mas o usuário reporta que **ainda não salva**. Possíveis causas:

### Hipótese A: RLS (Row Level Security) bloqueando o INSERT/UPSERT
A tabela `configuracoes_usuario` tem RLS habilitado com política `auth.uid() = user_id`. Se o `userId` passado não corresponde ao `auth.uid()` da sessão Supabase, o upsert é rejeitado silenciosamente (ou com erro capturado pelo try/catch).

**Verificar:** `supabase/schema.sql` — políticas RLS de `configuracoes_usuario`.

### Hipótese B: `getAuthState().user?.id` retornando undefined
O hook `useAuth` pode expor o user de forma diferente (ex: `session.user.id` vs `user.id`). Se `userId` for `undefined`, o `userId!` passa `undefined` para o Supabase, falhando a constraint NOT NULL.

**Verificar:** `src/hooks/useAuth.ts` — o que `getAuthState()` retorna.

### Hipótese C: Erro de Supabase sendo capturado pelo try/catch
O erro do Supabase está sendo engolido pelo `catch` e o código cai no `localStorage`. O usuário vê o toast "Configuração de ciclo salva!" (disparado no Header antes mesmo do Supabase responder), mas nada foi gravado.

**Verificar:** Adicionar `console.error` ou logger no `catch` para ver o erro real do Supabase.

### Hipótese D: `buscarConfiguracaoCiclo()` não filtra por usuário
Em `src/services/configuracoes.ts:11-18`, `buscarConfiguracaoCiclo()` faz `.select()` **sem filtro de `user_id`** e usa `.maybeSingle()`. Se houver múltiplas linhas ou nenhuma, pode retornar dado errado ou null.

**Verificar:** Adicionar `.eq('user_id', userId)` na busca.

---

## 5. Código Chave para Investigar

### `supabase/schema.sql` (linhas ~75-108)
Trigger `update_ciclo_inicio()`:
```sql
SELECT dia_inicio_ciclo INTO dia_inicio_ciclo
FROM configuracoes_usuario
WHERE user_id = NEW.user_id;

IF dia_inicio_ciclo IS NULL THEN
  dia_inicio_ciclo := 9; -- padrão
END IF;
```
→ Se não encontrar linha para o `user_id`, defaulta para 9.

### `supabase/schema.sql` — tabela `configuracoes_usuario`
Verificar colunas: `user_id` (PK), `dia_inicio_ciclo` (default 9), `dia_fim_ciclo` (default 8), RLS enabled.

### `supabase/migrations/0003_configuracao_ciclo_padrao.sql`
Trigger que insere default (9,8) ao criar novo usuário.

### `src/hooks/useAuth.ts`
Verificar estrutura do estado de auth e como acessar `user.id`.

### `src/main.ts` — `carregarConfiguracaoCiclo` (linhas ~156-176)
Chama `buscarConfiguracaoCiclo()` sem passar `user_id`. Depois tenta localStorage com `configuracao_ciclo_${userEmail}`.

---

## 6. Próximos Passos Sugeridos

1. **Verificar RLS:** Confirmar se a política RLS de `configuracoes_usuario` permite upsert com o `user_id` da sessão atual.
2. **Expor erro do Supabase:** Substituir o `catch` vazio por um log para ver o erro real:
   ```ts
   } catch (err) {
     console.error('Erro Supabase:', err)
     localStorage.setItem(...)
   }
   ```
3. **Verificar `getAuthState().user?.id`:** Confirmar que retorna um UUID válido, não `undefined`.
4. **Filtrar busca por usuário:** Adicionar `.eq('user_id', userId)` em `buscarConfiguracaoCiclo()`.
5. **Verificar se linha existe:** Conferir no Supabase Dashboard se existe linha em `configuracoes_usuario` para o usuário logado.
6. **Testar fluxo completo:** Login → alterar ciclo → salvar → recarregar página → verificar se persiste.

---

## 7. Último Commit

```
ffe3134 fix(ciclo): passar user_id ao salvar configuracao de ciclo
```

Branch: `main` (up to date com origin/main)

---

**Obs:** Não execute `npx tsc --noEmit` diretamente — o projeto não tem TypeScript instalado localmente (o `npx tsc` baixa um pacote errado `tsc@2.0.4`). Verificar se há script de build no `package.json`.