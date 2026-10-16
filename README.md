# Organiza Pouco v2.0.0

Aplicação web de controle financeiro pessoal migrada do Google Sheets/Apps Script para **Supabase** (PostgreSQL + Auth).

## 🚀 Tecnologias

- **Frontend**: TypeScript + Vite
- **UI**: Tailwind CSS (CDN)
- **Gráficos**: Chart.js
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Testes**: Vitest (unitários) + Playwright (E2E)

## 📋 Pré-requisitos

- Node.js 18+
- Conta no Supabase (https://supabase.com)

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/wesleylpdf/organiza-pouco2.0.git
cd organiza-pouco
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

#### 3.1 Crie um projeto no Supabase

1. Acesse https://supabase.com → **New Project**
2. Região: **São Paulo** (ou mais próxima)
3. Anote as credenciais em **Project Settings → API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

#### 3.2 Execute o schema SQL

1. No Supabase, acesse **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql`
3. Execute

#### 3.3 Configure Auth

1. **Authentication → Providers → Email/Password**: Enable
2. (Opcional) Configure OAuth (Google, GitHub)

### 4. Configure variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Use `.env.example` como referência.

### 5. Execute a aplicação

```bash
npm run dev
```

Acesse: http://localhost:5173

## 🧪 Testes

### Testes Unitários (Vitest)

```bash
npm test
```

Cobertura:
- `src/utils/ciclo.test.ts` - Lógica de ciclos financeiros
- `src/utils/format.test.ts` - Formatação de moeda, data e sanitização
- `src/utils/chart.test.ts` - Agrupamento de categorias e configuração de gráficos

### Testes E2E (Playwright)

```bash
# Instala browsers
npx playwright install

# Executa testes
npm run test:e2e
```

Cobertura:
- `tests/e2e/auth.spec.ts` - Autenticação e tema
- `tests/e2e/transactions.spec.ts` - Formulário, lista e resumo

## 📦 Build para Produção

```bash
npm run build
npm run preview
```

Arquivos gerados em `dist/`

## 🔄 Migração de Dados (Google Sheets → Supabase)

### 1. Exporte dados do Google Sheets

1. Acesse a planilha original
2. Exporte como JSON (ou CSV e converta)
3. Salve como `data-export.json` na raiz do projeto

Formato esperado:

```json
[
  {
    "id": "1234567890.123",
    "Valor": "150.50",
    "Data": "2026-02-15",
    "Tipo": "saida",
    "Categoria": "Alimentação",
    "Fixo": "true",
    "Descrição": "Supermercado"
  }
]
```

### 2. Configure variáveis de ambiente

```bash
export VITE_SUPABASE_URL=https://seu-projeto.supabase.co
export VITE_SUPABASE_ANON_KEY=sua-anon-key
export SUPABASE_SESSION_TOKEN=seu-token-de-sessao
```

**Como obter o session token:**

1. Faça login via interface web
2. No console do navegador, execute:
   ```javascript
   localStorage.getItem("sb-SEU-PROJECT-KEY-auth-token")
   ```
3. Copie o valor do campo `access_token`

### 3. Execute o script de migração

```bash
npx tsx scripts/migrate-data.ts
```

O script:
- Lê `data-export.json`
- Converte para formato do Supabase
- Importa em lotes de 100 transações
- Preserva todos os campos (valor, data, tipo, categoria, fixo, descrição)
- Calcula `ciclo_inicio` automaticamente baseado na data

## 📁 Estrutura do Projeto

```
organiza-pouco/
├── src/
│   ├── components/       # Componentes da UI
│   │   ├── AuthForm.ts
│   │   ├── Header.ts
│   │   ├── TransacaoForm.ts
│   │   ├── TransacaoList.ts
│   │   └── GraficoPizza.ts
│   ├── hooks/            # Hooks de lógica de negócios
│   │   ├── useAuth.ts
│   │   └── useTransacoes.ts
│   ├── stores/           # Estado global da aplicação
│   │   └── AppState.ts
│   ├── services/         # Serviços de API
│   │   └── transacoes.ts
│   ├── lib/              # Configurações externas
│   │   └── supabaseClient.ts
│   ├── types/            # Definições de tipos
│   │   └── index.ts
│   ├── utils/            # Funções utilitárias
│   │   ├── ciclo.ts
│   │   ├── format.ts
│   │   ├── chart.ts
│   │   ├── validation.ts
│   │   ├── debounce.ts
│   │   ├── logger.ts
│   │   └── toast.ts
│   ├── main.ts           # Ponto de entrada
│   └── styles.css        # Estilos customizados
├── supabase/
│   └── schema.sql        # Schema do banco de dados
├── scripts/
│   └── migrate-data.ts   # Script de migração
├── tests/
│   └── e2e/              # Testes end-to-end
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── GUIA_RAPIDO.md        # Guia rápido em português
├── QUICK_GUIDE.md        # Quick guide em inglês
└── package.json
```

## 🔐 Segurança

### Melhorias implementadas na migração:

✅ **Autenticação real** - Supabase Auth (email/senha ou OAuth)  
✅ **Row Level Security (RLS)** - Usuários só veem suas próprias transações  
✅ **Sanitização de XSS** - `textContent` em vez de `innerHTML` com template literals  
✅ **Validação de entrada** - TypeScript + constraints no banco  
✅ **HTTPS obrigatório** - Supabase força HTTPS por padrão  
✅ **Sem credenciais hardcoded** - Variáveis de ambiente via `import.meta.env`

## 🎯 Funcionalidades

### Core

- ✅ Criar, editar e excluir transações
- ✅ Categorização (Salário, Alimentação, Moradia, etc.)
- ✅ Transações fixas recorrentes
- ✅ Ciclo financeiro personalizado (dia 9 a dia 8)
- ✅ Navegação entre ciclos
- ✅ Gráfico de pizza (distribuição por categoria)
- ✅ Modo escuro/claro

### Novidades v2.0

- ✅ Autenticação multiusuário
- ✅ Persistência em PostgreSQL
- ✅ TypeScript para type safety
- ✅ Testes automatizados
- ✅ Componentização modular
- ✅ Sanitização contra XSS

## 📝 Licença

MIT

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
