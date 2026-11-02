# Sugestões de Melhoria — Organiza Pouco

**Data do levantamento:** 01/11/2026  
**Status:** Pendente de revisão e autorização para implementação

---

## 1. Performance & Bundle (Alto Impacto)

- [x] **Lazy Loading (Importação Dinâmica) na Exportação (`jspdf` e `xlsx`)**
  - **Onde:** `src/modules/transacoes.ts` (linhas 13–14 e função `handleExportar` nas linhas 119–272)
  - **Problema:** As bibliotecas `jspdf` e `xlsx` são importadas estaticamente no topo do arquivo, que é carregado logo na inicialização (`src/main.ts`). Isso adiciona centenas de KBs ao bundle inicial mesmo quando o usuário não utiliza a exportação.
  - **Solução:** Substituir os imports estáticos por `await import('jspdf')` e `await import('xlsx')` dentro de `handleExportar`, carregando sob demanda apenas quando o formato `pdf` ou `xlsx` for acionado.

- [x] **Tree-shaking do Chart.js**
  - **Onde:** `src/components/GraficoPizza.ts` (linhas 1–6)
  - **Problema:** `Chart.register(...registerables)` importa todos os tipos de gráficos, escalas e plugins do Chart.js.
  - **Solução:** Importar e registrar apenas os módulos necessários para o gráfico de pizza/rosca (`ArcElement`, `Tooltip`, `Legend`, `PieController` / `DoughnutController`).

- [ ] **Migrar Tailwind CSS da CDN para Build Local (Vite/PostCSS)**
  - **Onde:** `index.html` (linha 7) e `src/styles.css`
  - **Problema:** O uso de `<script src="https://cdn.tailwindcss.com"></script>` compila estilos em tempo de execução no navegador, aumenta o tempo de renderização inicial e emite alerta em produção.
  - **Solução:** Configurar o Tailwind CSS via Vite/PostCSS para gerar apenas o CSS efetivamente utilizado no build.

---

## 2. Consultas ao Supabase & Escalabilidade de Dados

- [ ] **Filtrar Transações Fixas Diretamente no Banco de Dados**
  - **Onde:** `src/modules/ciclo.ts` (`carregarFixosTodos`, linhas 49–54), `src/modules/transacoes.ts` (`handleAbrirFixos`, linhas 95–107) e `src/services/transacoes.ts` (`listarTransacoes`, linhas 47–71)
  - **Problema:** `listarTransacoes({})` busca **todas** as transações do histórico do usuário para depois filtrar `.filter(t => t.fixo)` em memória no navegador, ignorando o índice parcial `idx_transacoes_user_fixo` já existente em `supabase/schema.sql` (linha 30).
  - **Solução:** Adicionar o parâmetro opcional `fixo?: boolean` em `listarTransacoes` aplicando `.eq('fixo', params.fixo)` na query do Supabase.

- [ ] **Inserção em Lote (Batch Insert) ao Criar Transações Parceladas**
  - **Onde:** `src/hooks/useTransacoes.ts` (`salvarTransacao`, linhas 163–176) e `src/services/transacoes.ts` (`criarTransacao`)
  - **Problema:** Ao criar uma compra parcelada (ex.: 12x), o loop `for` executa 12 chamadas sequenciais ao Supabase (e 12 chamadas a `supabase.auth.getUser()`).
  - **Solução:** Criar uma função `criarTransacoesEmLote` que envia um array de objetos em um único `.insert([...])`, reduzindo drasticamente o tempo de salvamento e evitando gravações parciais caso a conexão caia no meio.

---

## 3. Possíveis Bugs & Casos de Borda (Edge Cases)

- [ ] **Overflow de Datas ao Gerar Parcelas nos Dias 29, 30 e 31**
  - **Onde:** `src/hooks/useTransacoes.ts` (linhas 144–145 e 167–168)
  - **Problema:** O cálculo `dataParcela.setMonth(dataParcela.getMonth() + i)` sofre com o comportamento nativo do `Date` do JavaScript: uma compra em `31/01` ao somar 1 mês vira `03/03` (pulando fevereiro).
  - **Solução:** Utilizar uma função auxiliar que limite o dia ao último dia do mês de destino (similar a `criarDataNoMes` em `src/utils/ciclo.ts`).

- [ ] **Vincular Parcelas por ID de Grupo em vez de Regex na Descrição**
  - **Onde:** `src/services/transacoes.ts` (`listarParcelasRelacionadas`, linhas 162–183)
  - **Problema:** As parcelas são encontradas buscando transações com o mesmo `total_parcelas` e comparando a `descricao` via expressão regular. Duas compras distintas com a mesma descrição e mesmo número de parcelas colidem ao editar ou excluir.
  - **Solução:** Adicionar uma coluna opcional `grupo_parcela_id UUID` em `transacoes` para agrupar parcelas de uma mesma compra de forma única (mantendo fallback pela lógica atual para parcelas antigas).

- [ ] **Evitar Duplicação de Event Listeners Globais e Corrigir `debouncedUpdateDashboard`**
  - **Onde:** `src/modules/appInit.ts` (linhas 24–26, 260–268 e 291)
  - **Problema:** `window.addEventListener('cicloConfigChange', ...)` e `window.addEventListener('themechange', ...)` são adicionados dentro de `setupApp`, acumulando novos listeners a cada ciclo de logout/login. Além disso, `debouncedUpdateDashboard` em `appInit.ts` possui corpo vazio, não disparando `handlers.updateDashboard()`.
  - **Solução:** Chamar `handlers.updateDashboard()` dentro do debounce e garantir que listeners globais sejam registrados apenas uma vez (ou removidos ao deslogar).

- [ ] **Limpar Classes Tailwind Conflitantes e Substituir `alert()` por `toast`**
  - **Onde:** `src/components/Header.ts` (linhas 21–76) e `src/components/TransacaoForm.ts` (linhas 35–47, 159 e 181)
  - **Problema:** Há classes duplicadas/conflitantes no mesmo elemento (`p-4 p-6`, `rounded-2xl rounded-3xl`, `text-xs text-sm`, `mb-4 mb-8`) sem breakpoint responsivo (`sm:`), além de uso de `alert()` bloqueante no formulário.
  - **Solução:** Ajustar as classes para usar prefixos responsivos (`p-4 sm:p-6`, etc.) e trocar os `alert()` por `toast.error(...)` / `toast.warning(...)`.

---

## 4. PWA, Cache & Service Worker

- [ ] **Aprimorar Estratégia de Cache do Service Worker (`sw.js`)**
  - **Onde:** `src/sw.js` (linhas 1–22)
  - **Problema:** O Service Worker intercepta todas as requisições em modo *Cache-First* e não remove caches antigos no evento `activate`, o que pode servir HTML desatualizado ou interferir na verificação de atualização.
  - **Solução:** Ignorar chamadas para o Supabase e `version.json`, aplicar limpeza de caches antigos no `activate` e usar estratégia *Network-First* para navegação de página.
