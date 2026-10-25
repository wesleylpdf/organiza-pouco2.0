# Migração do Banco de Dados — Organiza Pouco 2.0

## Visão Geral

Este documento consolida:
1. **Plano passo a passo para migrar o banco de dados Supabase de EUA (US East) para o Brasil (sa-east-1)**.
2. **Documentação completa do projeto** (estrutura de pastas, stack, arquitetura, fluxos, commits, variáveis de ambiente) para garantir continuidade de trabalho de IA em sessões futuras.

---

## Parte 1 — Migração do Supabase (EUA → Brasil)

O Supabase não permite mover um projeto existente entre regiões. A migração é **manual**: criar um novo projeto na região `sa-east-1`, recriar o schema, migrar os dados e reconfigurar autenticação e variáveis de ambiente.

### Tabelas do banco (conforme `supabase/schema.sql`)

| Tabela | Descrição |
|--------|-----------|
| `transacoes` | Transações financeiras (entradas/saídas, fixas, divididas/parceladas) |
| `ajustes_saldo` | Ajustes manuais de saldo final por ciclo |
| `configuracoes_usuario` | Configuração de ciclo (dia_inicio_ciclo, dia_fim_ciclo) por usuário |
| `categorias` | Categorias de transação |

Todas as tabelas possuem **RLS (Row Level Security)** habilitado.

### Pré-requisitos

- Conta na Supabase com acesso para criar projetos
- Acesso ao projeto atual (EUA) para exportar dados
- Acesso ao código fonte para atualizar variáveis de ambiente
- (Opcional) Chave `service_role` para operações administrativas de migração

---

### Passo a passo da migração

#### 1. Criar novo projeto na região Brasil (sa-east-1)

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **"New Project"**
3. Escolha a organização
4. Nome do projeto: `organiza-pouco-brasil` (ou similar)
5. Senha do banco de dados: anote-a (será necessária para acesso direto via SQL)
6. Região: selecione **São Paulo (sa-east-1)**
7. Aguarde a criação (provisionamento pode levar alguns minutos)
8. Anote as credenciais:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret` → `VITE_SUPABASE_SERVICE_ROLE_KEY` (para migração administrativa)

#### 2. Exportar o schema do projeto atual (EUA)

No painel do projeto atual, vá em **SQL Editor** e exporte as definições:

```sql
-- 1. Estrutura das tabelas
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';

-- 2. DDL completo de cada tabela (transacoes, ajustes_saldo, configuracoes_usuario, categorias)
-- Use pg_dump via linha de comando se preferir:
-- pg_dump -h <host> -U postgres --schema=public --schema-only > schema.sql
```

Alternativamente, use o `pg_dump` com a string de conexão do projeto EUA para gerar um arquivo SQL com estrutura + dados:

```bash
pg_dump -h db.<projeto-eua>.supabase.co -U postgres -d postgres \
  --schema=public \
  --data-only \
  -f dados_eua.sql
```

#### 3. Recriar o schema no projeto Brasil

No novo projeto (sa-east-1), execute o conteúdo de `supabase/schema.sql` no **SQL Editor**. Isso recria:

- Todas as 4 tabelas
- Colunas, tipos e restrições
- Índices
- Triggers (ex.: função de categorias padrão)
- Políticas RLS
- Funções auxiliares

Atenção: verifique se todos os `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`, `CREATE FUNCTION` e `CREATE TRIGGER` foram executados sem erros.

#### 4. Migrar os dados dos usuários (Auth)

O **Supabase Auth não pode ser exportado/importado diretamente** entre projetos (senhas são hashes vinculados ao projeto de origem). Opções:

| Abordagem | Quando usar |
|-----------|-------------|
| **Redefinição de senha** | Usuários poucos; avise que precisarão redefinir senha via "Esqueci minha senha" no novo projeto |
| **Migração programática** | Muitos usuários; exige acesso à chave `service_role` e recriação de usuários com senhas temporárias |

**Recomendado:** avisar os usuários que precisarão cadastrar/redefinir senha no novo projeto. O fluxo de cadastro/login já está implementado em `src/components/AuthForm.ts` e `src/hooks/useAuth.ts`.

#### 5. Migrar os dados das tabelas

Com o schema recriado, importe os dados exportados (passo 2):

```bash
psql -h db.<projeto-brasil>.supabase.co -U postgres -d postgres -f dados_eua.sql
```

Ou via SQL Editor do Supabase, executando os `INSERT`s em ordem respeitando chaves estrangeiras:

1. `categorias`
2. `configuracoes_usuario`
3. `transacoes`
4. `ajustes_saldo`

Verifique a integridade após a importação:

```sql
SELECT count(*) FROM transacoes;
SELECT count(*) FROM categorias;
SELECT count(*) FROM configuracoes_usuario;
SELECT count(*) FROM ajustes_saldo;
```

#### 6. Reconfigurar RLS, triggers e Edge Functions

Confirme que as políticas de segurança estão ativas em todas as tabelas. Se houver Edge Functions, reimplante-as no novo projeto.

#### 7. Atualizar variáveis de ambiente

No repositório, edite `.env` e `.env.example`:

```
VITE_SUPABASE_URL=https://<novo-projeto>.supabase.co
VITE_SUPABASE_ANON_KEY=<nova-anon-key>
VITE_SITE_URL=https://wesleylpdf.github.io/organiza-pouco2.0/
```

Se usar GitHub Pages / Vercel / Netlify, atualize também as variáveis de ambiente no painel de deploy.

#### 8. Build, teste e deploy

```bash
cd /d/openclaude/organiza-pouco
npm run build
npm test -- --run
git add . && git commit -m "migracao: atualiza supabase para regiao sa-east-1"
git push origin main
```

O deploy automático no GitHub Pages será disparado pelo push.

#### 9. Plano de downtime e rollback

- **Downtime estimado:** algumas horas (tempo para criar projeto, recriar schema, importar dados e reconfigurar env)
- **Rollback:** mantenha o projeto EUA ativo até validar que o novo projeto funciona corretamente. Aponte o DNS/variáveis de ambiente de volta para o EUA se houver problemas críticos.

---

## Parte 2 — Documentação Completa do Projeto

### Identificação

- **Nome:** Organiza Pouco 2.0
- **Tipo:** PWA de controle financeiro pessoal
- **Repositório GitHub:** `wesleylpdf/organiza-pouco2.0`
- **Branch principal:** `main`
- **Deploy:** GitHub Pages (base path `/organiza-pouco2.0/`)
- **URL do site:** `https://wesleylpdf.github.io/organiza-pouco2.0/`

### Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Linguagem | TypeScript (strict) |
| Build tool | Vite |
| CSS | Tailwind CSS |
| Banco / Auth | Supabase (PostgreSQL + Auth + RLS) |
| Gráficos | Chart.js |
| Testes | Vitest |
| Gerenciador de pacotes | npm |
| Versionamento | Git |

### Alias de importação

`@/*` → `src/*` (configurado em `tsconfig.json` e `vite.config.ts`)

### Estrutura de Pastas

```
organiza-pouco/
├── supabase/
│   └── schema.sql          # Schema completo do banco (tabelas, RLS, triggers)
├── src/
│   ├── components/         # Componentes de UI (DOM puro, sem framework)
│   │   ├── AuthForm.ts          # Login / cadastro / reset de senha
│   │   ├── GraficoPizza.ts      # Gráfico de pizza de despesas por categoria
│   │   ├── Header.ts            # Cabeçalho com resumo do ciclo, botões ciclo anterior/próximo, FIXOS, tema, logout
│   │   ├── ModalCategorias.ts   # Modal de gerenciamento de categorias
│   │   ├── ModalFixos.ts        # Modal de transações fixas
│   │   ├── TransacaoForm.ts     # Formulário de criar/editar transação
│   │   └── TransacaoList.ts     # Lista de transações com filtros (parcelados, busca)
│   ├── hooks/              # Hooks de negócio (integração store + serviços)
│   │   ├── useAuth.ts           # login, cadastro, resetSenha, logout, initAuth, onAuthChange
│   │   ├── useTransacoes.ts     # carregarTransacoes, salvarTransacao, excluir, edição de parcelas
│   │   └── useCategorias.ts     # carregarCategorias, criar/atualizar/excluir categoria
│   ├── lib/                # Configuração de clientes externos
│   │   └── supabaseClient.ts    # Instância do cliente Supabase (createClient)
│   ├── main.ts             # Ponto de entrada da aplicação (inicialização, store, renderização)
│   ├── services/           # Camada de acesso a dados (Supabase queries)
│   │   ├── transacoes.ts        # listar, criar, atualizar, excluir transações e parcelas
│   │   ├── categorias.ts        # CRUD de categorias
│   │   ├── configuracoes.ts     # buscar/salvar configuração de ciclo
│   │   └── ajustes.ts           # buscar/criar/somar ajustes de saldo
│   ├── stores/             # Gerenciamento de estado global
│   │   └── AppState.ts          # AppStateStore (transacoes, categorias, cicloOffset, loading, error, cache por ciclo)
│   ├── types/              # Tipos TypeScript
│   │   └── index.ts             # TipoTransacao, Categoria, Transacao, Ciclo, ConfiguracaoCiclo, TotaisCiclo, AjusteSaldo
│   ├── utils/              # Utilitários puros
│   │   ├── ciclo.ts             # getCicloAtual, DIA_INICIO_PADRAO=9, DIA_FIM_PADRAO=8, formatDateLocalISO
│   │   ├── format.ts            # formatarMoeda, formatarData, sanitizarHTML
│   │   ├── validation.ts        # validarTransacao, extrairMensagemErro, ValidationError
│   │   ├── debounce.ts          # debounce, throttle
│   │   ├── toast.ts             # Sistema de notificações toast
│   │   ├── logger.ts            # Logger de debug
│   │   ├── chart.ts             # Utilitários de gráfico
│   │   ├── atualizacao.ts       # Guarda de atualização de versão
│   │   ├── chart.test.ts        # Testes do chart
│   │   ├── ciclo.test.ts        # Testes do ciclo
│   │   └── format.test.ts       # Testes de formatação
│   └── vite-env.d.ts        # Tipos do Vite
├── public/
│   └── logo-organiza.jpeg    # Logo usada em telas de carregamento e auth
├── .env                      # Variáveis de ambiente (não versionado)
├── .env.example              # Exemplo de variáveis de ambiente
├── vite.config.ts            # Configuração Vite + plugin de versionamento de build
├── tsconfig.json             # Configuração TypeScript
└── package.json              # Dependências e scripts npm
```

### Principais Arquivos e Suas Responsabilidades

#### `src/main.ts`
Ponto de entrada da aplicação. Contém:
- `criarTelaCarregamento()`, `atualizarCarregamento()`, `removerTelaCarregamento()` — tela de carregamento percentual pós-login
- Controle de carregamento de navegação de ciclo (botões Voltar/Avançar com % dentro do botão)
- `setBotoesDesabilitados(true/false)` — desabilita Guardar, Editar, Excluir, FIXOS, ciclos, salvar config durante carregamento
- `handleAbrirFixos()` com loading state no botão FIXOS
- Inicialização da store, auth, e renderização do dashboard

#### `src/stores/AppState.ts`
Store central (AppStateStore) com:
- `transacoes`, `categorias`, `cycleOffset`, `diaInicioCiclo`, `diaFimCiclo`, `editandoId`
- `loading` states por feature (`transacoes`, `categorias`)
- `error` e `setError` / `clearError`
- `transacoesPorCiclo` cache (evita requisições duplicadas para o mesmo ciclo)
- `getCicloAtual()`, `getCicloInicioISO()`, `setCycleOffset()`, `setTransacoes()`, `setCategorias()`

#### `src/hooks/useTransacoes.ts`
Lógica de negócio de transações:
- `carregarTransacoes()` — com verificação de cache por ciclo
- `salvarTransacao()` — criar/editar (incluindo split em parcelas)
- `excluir()` — exclui transação e parcelas relacionadas
- `iniciarEdicao()` / `cancelarEdicao()`

#### `src/hooks/useAuth.ts`
Autenticação:
- `login(email, pass)`, `cadastro(email, pass)`, `resetSenha(email)`, `logout()`
- `initAuth()`, `onAuthChange()`

#### `src/hooks/useCategorias.ts`
- `carregarCategorias()`, `criarCategoria()`, `atualizarCategoria()`, `excluirCategoria()`

#### `src/services/transacoes.ts`
Acesso ao Supabase para transações (snake_case ↔ camelCase mapeamento).

#### `src/utils/ciclo.ts`
Lógica de ciclo financeiro:
- `DIA_INICIO_PADRAO = 9`, `DIA_FIM_PADRAO = 8`
- `getCicloAtual(offset, diaInicio, diaFim)` — calcula início/fim do ciclo respeitando offset
- `inicioDoCicloDaData()`, `formatDateLocalISO()`

#### `src/components/Header.ts`
Cabeçalho com:
- Resumo do ciclo (entradas, saídas, saldo final)
- Botões ciclo anterior/próximo
- Selectores dia início/fim do ciclo e botão Salvar
- Botão FIXOS, tema (claro/escuro), logout
- Versão: 2.2.0

#### `src/components/TransacaoList.ts`
Lista de transações com:
- Filtro por parcelados (checkbox)
- Busca por descrição (input)
- Botões Editar (azul) e Excluir (vermelho) com loading feedback "Excluindo..."

#### `src/components/ModalFixos.ts`
Modal de transações fixas com total e exclusão individual.

#### `src/lib/supabaseClient.ts`
Instância única do cliente Supabase usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

### Fluxo Principal da Aplicação

1. Usuário acessa a aplicação (GitHub Pages)
2. `AuthForm` exibe tela de login/cadastro/reset
3. Após login bem-sucedido, `main.ts` inicializa a store e exibe tela de carregamento percentual (0% → 100%)
4. `updateDashboard()` carrega transações, categorias e configurações do ciclo atual
5. Usuário navega pelo dashboard:
   - Visualiza resumo do ciclo (entradas/saídas/saldo)
   - Navega entre ciclos (Voltar/Avançar com % nos botões)
   - Adiciona/edita/exclui transações
   - Gerencia transações fixas (modal FIXOS)
   - Gerencia categorias
   - Altera configuração de ciclo (dia início/fim)
   - Alterna tema claro/escuro

### Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | `eyJ...` |
| `VITE_SITE_URL` | URL do site para deploy | `https://wesleylpdf.github.io/organiza-pouco2.0/` |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | (Opcional) Chave de serviço para admin | `eyJ...` |

### Comandos Disponíveis

```bash
npm run build    # Build de produção para dist/ (base /organiza-pouco2.0/)
npm test         # Executa vitest (--run para uma única execução)
npm run dev      # Servidor de desenvolvimento (porta 5173)
```

### Histórico de Commits (main)

| Commit | Mensagem |
|--------|----------|
| `a03aa7d` | feat: percentual dentro dos botoes Voltar/Avançar ciclo |
| `8c45549` | feat: carregamento percentual e desabilitação de botões na navegação de ciclo |
| `0088ed9` | feat: botão Excluir vermelho e loading feedback nas exclusões |
| `d0960ee` | feat: botões Editar/Excluir com fundo colorido nas transações |
| `9f205af` | perf: feedback de carregamento no botão FIXOS |
| `c805885` | perf: reduz lentidão após login |
| `72ca288` | feat: exibe valor ao lado da descrição na lista de transações |
| `d10dd42` | feat: remove todos os breakpoints responsivos (sm:, md:) |
| `122aab3` | fix: busca ao lado do checkbox também em mobile |
| `4c8819e` | fix: busca ao lado do checkbox em desktop, empilhado em mobile |
| `96fc749` | fix: lista de transações empilhada verticalmente em desktop e mobile |
| `b6ec24d` | fix: ajusta layout do filtro para ficar empilhado em desktop e mobile |
| `b5a1d41` | feat: adiciona busca por descrição na lista de transações |
| `1d3ab54` | feat: adiciona ajustes manuais de saldo final filtrados por ciclo |
| `dca713c` | fix: corrige calculo do saldo final com transacoes fixas |
| `b9289a6` | fix: transacoes fixas aparecem no grafico pizza em todos os meses |
| `35900a6` | fix: grava campo fixo no banco, checkboxes mutuamente exclusivos e fixas no grafico pizza |
| `e28390f` | feat: adiciona transações fixas com modal FIXOS e saldo final em todos os ciclos |
| `e36ca63` | Atualiza mensagens de sucesso de cadastro e recuperação de senha |
| `3707133` | Fix: UX do login |

### UX Implementadas (Phase 2 concluída)

- Tela de carregamento percentual (0% → 100%) após login com logo
- Botão FIXOS com estado de carregamento ("Carregando...")
- Botões Editar (azul bg-blue-600) e Excluir (vermelho bg-rose-500) nas transações
- Loading feedback "Excluindo..." + desabilitação em todos os botões Excluir
- Percentual 0% → 100% dentro dos botões Voltar/Avançar ciclo durante carregamento
- Todos os botões desabilitados (Guardar, Editar, Excluir, FIXOS, ciclos, salvar config) durante carregamento de ciclo, revertendo após sucesso ou erro

### Configuração de Ciclo Padrão

- `dia_inicio_ciclo = 9`
- `dia_fim_ciclo = 8`

### Observações Importantes para IA em Sessões Futuras

1. **Não modificar código sem autorização explícita do usuário** (especialmente banco de dados e variáveis de ambiente).
2. O app usa **DOM puro** (sem React/Vue/Svelte) — componentes são funções que criam/injetam elementos HTML diretamente.
3. O padrão de **cache por ciclo** em `useTransacoes.ts` evita requisições duplicadas ao Supabase.
4. Todas as tabelas possuem **RLS** — o `user_id` é filtrado em todas as queries via `supabase.auth.getUser()`.
5. O deploy usa **GitHub Pages** com base path `/organiza-pouco2.0/` — o plugin de versionamento em `vite.config.ts` gera `version.json` e cópias do `index.html` para bust de cache.
6. Para rodar localmente: `npm install && npm run dev`.
7. Os testes estão em `src/utils/*.test.ts` e rodam com `npm test -- --run`.