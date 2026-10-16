# Guia Rapido - Organiza Pouco v2.0

## Comecando em 5 minutos

### 1. Setup Rapido

```bash
# Clone e instale
git clone https://github.com/wesleylpdf/organiza-pouco2.0.git
cd organiza-pouco
npm install

# Configure Supabase
cp .env.example .env
# Edite .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Execute o schema no Supabase SQL Editor
# Cole o conteudo de supabase/schema.sql e execute

# Inicie a aplicacao
npm run dev
```

### 2. Primeiro Acesso

1. Acesse http://localhost:5173
2. Clique em "Nao tem conta? Cadastre-se"
3. Preencha email e senha (minimo 6 caracteres)
4. Confirme email (se habilitado no Supabase)
5. Faca login

### 3. Adicionando Transacoes

1. **Valor**: Digite o valor (ex: 150.50) -- deve ser maior que zero
2. **Data**: Selecione a data (padrao: hoje)
3. **Tipo**: Escolha Entrada (+) ou Saida (-)
4. **Categoria**: Selecione uma das 9 categorias disponiveis
5. **Fixa?**: Marque se for recorrente (aluguel, salario, etc.)
6. **Descricao**: Adicione uma descricao (maximo 100 caracteres)
7. Clique em "Guardar"

> Os dados sao validados em tempo real. Campos invalidos ficam com borda vermelha; validos ficam com borda verde.

### 4. Navegando entre Ciclos

- **Ciclo financeiro**: Dia 9 do mes ate dia 8 do proximo mes
- **Botoes "Anterior" e "Proximo"**: Navegam entre ciclos
- **Data exibida**: Mostra o periodo do ciclo atual no cabecalho

### 5. Transacoes Fixas

Transacoes fixas sao aquelas que se repetem todo mes (aluguel, salario, etc.)

**Aplicar fixos do ciclo anterior:**
1. Clique no botao "Aplicar fixos do ciclo anterior"
2. Confirme a acao
3. As transacoes fixas serao duplicadas com data ajustada (+1 mes)
4. Um toast verde confirma a quantidade de transacoes aplicadas

**Filtrar apenas fixas:**
- Marque "Mostrar apenas Fixas" no topo da lista

### 6. Grafico de Distribuicao

O grafico de pizza mostra distribuicao de gastos por categoria:
- Apenas saidas sao contabilizadas
- 9 cores distintas por categoria
- Tooltips mostram valor e percentual

### 7. Modo Escuro/Claro

- Clique no botao de tema no cabecalho
- Preferencia e salva automaticamente no localStorage

### 8. Editando/Excluindo Transacoes

- **Editar**: Clique em "Editar" ao lado da transacao -- o formulario e preenchido automaticamente
- **Excluir**: Clique em "Excluir" -- uma confirmacao sera solicitada antes da exclusao

## Feedback Visual

A aplicacao usa um sistema de **toasts** (notificacoes) para dar retorno visual:

| Tipo | Cor | Quando aparece |
|------|-----|----------------|
| Sucesso | Verde | Transacao criada/atualizada/excluida |
| Erro | Vermelho | Falha em operacoes ou validacao |
| Aviso | Amarelo | Situacoes atipicas |
| Info | Azul | Informacoes gerais (ex: nenhum fixo encontrado) |

Toasts aparecem no canto superior direito e desaparecem automaticamente (3s para sucesso, 5s para erro). Clique para fechar.

### Estados de Loading

- **Botoes desabilitados** durante operacoes (salvar, aplicar fixos)
- **Texto do botao** muda para "Salvando..." ou "Aplicando..." durante a operacao
- **Checkbox fixos** desabilitada enquanto carrega

### Validacao em Tempo Real

Campos do formulario mostram feedback visual via CSS:
- **Borda verde**: campo valido
- **Borda vermelha**: campo invalido (ex: valor negativo, data fora do formato)

Erros de validacao tambem aparecem como toasts vermelhos com mensagens especificas como:
- "Valor deve ser maior que zero"
- "Data deve estar no formato YYYY-MM-DD"
- "Descricao deve ter no maximo 100 caracteres"

## Dicas

### Organizando Melhor

1. **Use categorias consistentes** -- Evite variacoes dentro da mesma categoria
2. **Marque transacoes fixas** -- Facilita a aplicacao mensal automatica
3. **Revise semanalmente** -- Mantem o controle atualizado
4. **Use descricoes claras** -- Facilita identificacao futura

### Categorias Disponiveis

| Icone | Categoria | Uso tipico |
|-------|-----------|------------|
| 💰 | Salario | Rendimentos |
| 🍕 | Alimentacao | Refeicoes, mercado |
| 🏠 | Moradia | Aluguel, contas da casa |
| 🚗 | Transporte | Combustivel, manutencao |
| 🎮 | Lazer | Entretenimento |
| 🏥 | Saude | Medicos, farmacia |
| 📚 | Educacao | Cursos, materiais |
| 📈 | Investimentos | Aplicacoes financeiras |
| ✨ | Outros | Demais despesas/receitas |

## Problemas Comuns

### "Nao consigo fazer login"
- Verifique se o email esta confirmado no Supabase
- Use "Esqueci minha senha" para resetar
- Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao corretos no `.env`

### "Transacoes nao aparecem"
- Verifique se esta no ciclo correto (navegue com os botoes)
- Confirme que o schema `supabase/schema.sql` foi executado no Supabase SQL Editor
- Verifique que as políticas RLS estao ativas na tabela `transacoes`

### "Grafico nao atualiza"
- Adicione transacoes de saida primeiro (o grafico so exibe saidas)
- O grafico atualiza automaticamente ao salvar/excluir

### "Erro ao conectar ao Supabase"
- Verifique sua conexao com a internet
- Confirme que o projeto Supabase esta ativo
- Verifique as credenciais no `.env`

## Migracao de Dados (do Google Sheets)

Se voce tem dados na versao anterior (Google Sheets):

1. Exporte os dados para JSON (formato em `data-export.example.json`)
2. Salve como `data-export.json` na raiz do projeto
3. Configure as variaveis de ambiente do Supabase no `.env`
4. Obtenha um token de sessao do Supabase:
   ```bash
   # Faca login via API e capture o access_token
   curl -X POST "https://seu-projeto.supabase.co/auth/v1/token?grant_type=password" \
     -H "apikey: SUA_ANON_KEY" \
     -d '{"email":"seu@email.com","password":"sua-senha"}'
   ```
5. Execute a migracao:
   ```bash
   export SUPABASE_SESSION_TOKEN=<access_token>
   npx tsx scripts/migrate-data.ts
   ```

## Comandos Disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (localhost:5173) |
| `npm run build` | Gera build de producao em `dist/` |
| `npm run preview` | Preview da build de producao |
| `npm test` | Executa testes unitarios (Vitest) |
| `npm run test:e2e` | Executa testes E2E (Playwright) |

## Estrutura do Projeto

```
src/
├── components/     # Componentes DOM (AuthForm, Header, TransacaoForm, etc.)
├── hooks/          # Logica de negocios (useAuth, useTransacoes)
├── stores/         # Estado global (AppState - singleton)
├── services/       # Integracao com Supabase (transacoes)
├── utils/          # Utilitarios (ciclo, format, chart, validation, toast, logger)
├── lib/            # Cliente Supabase
├── types/          # Tipos TypeScript
├── main.ts         # Entry point
└── styles.css      # Estilos customizados (animacoes, loading, a11y)

supabase/
└── schema.sql      # Schema PostgreSQL + RLS + triggers

scripts/
└── migrate-data.ts # Script de migracao Google Sheets -> Supabase
```

## Tecnologias

- **TypeScript** + **Vite** -- Build tool
- **Supabase** -- Auth + PostgreSQL + Row Level Security
- **Chart.js** -- Grafico de pizza
- **Tailwind CSS** (CDN) -- Estilizacao
- **Vitest** -- Testes unitarios
- **Playwright** -- Testes E2E

## Suporte

- **Testes**: `npm test` (18 testes unitarios) e `npm run test:e2e`
- **Issues**: Abra no repositorio GitHub
