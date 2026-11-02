# Sugestões de Melhoria — Organiza Pouco

**Data do levantamento:** 01/11/2026  
**Última atualização:** 02/11/2026  
**Status:** Todas as 6 Etapas concluídas (10/10 itens implementados).

---

## Backups Criados Nesta Sessão (Git Branches & Tags)

- **Antes da Etapa 1:** `backup/antes-melhorias-2026-11-02` / tag `backup-antes-melhorias-2026-11-02`
- **Antes da Etapa 2:** `backup/antes-etapa2-supabase-2026-11-02` / tag `backup-antes-etapa2-supabase-2026-11-02`
- **Antes da Etapa 3:** `backup/antes-etapa3-listeners-ui-2026-11-02` / tag `backup-antes-etapa3-listeners-ui-2026-11-02`
- **Antes da Etapa 4:** `backup/antes-etapa4-service-worker-2026-11-02` / tag `backup-antes-etapa4-service-worker-2026-11-02`
- **Antes da Etapa 5:** `backup/antes-etapa5-toast-tailwind-2026-11-02` / tag `backup-antes-etapa5-toast-tailwind-2026-11-02`
- **Antes da Etapa 6:** `backup/antes-etapa6-grupo-parcelas-2026-11-02` / tag `backup-antes-etapa6-grupo-parcelas-2026-11-02`

---

## Observação para Verificar na Próxima Sessão (Toast de Nova Versão)

- **Como o Toast funciona hoje:**
  1. Se o usuário **abre ou dá F5** na página após um deploy, o script inline do `<head>` no `index.html` (linhas 14–34) redireciona instantaneamente para `index-<versao>.html?v=<versao>` **antes** de carregar a interface (por isso é muito rápido e não exibe toast).
  2. O toast `"Nova versão disponível. Atualizando..."` (`src/utils/atualizacao.ts`, linha 65) aparece quando o usuário **já está com o app aberto** e um novo deploy termina (ou quando ele volta para a aba aberta após um deploy), exibindo o aviso por `800ms` antes de recarregar.
  3. *(Opcional para próxima sessão)*: Se quiser que o toast fique visível por mais tempo (ex.: `2000ms` ou `2500ms` em vez de `800ms`) ou que também apareça quando o `<head>` detectar atualização, podemos ajustar na próxima sessão.

---

## 1. Performance & Bundle (Alto Impacto)

- [x] **Lazy Loading (Importação Dinâmica) na Exportação (`jspdf` e `xlsx`)** *(Concluído na Etapa 1)*
  - **Onde:** `src/modules/transacoes.ts` (função `handleExportar`)
  - **Solução aplicada:** Imports estáticos substituídos por `await import('jspdf')` e `await import('xlsx')` sob demanda, reduzindo mais de 800 kB do bundle inicial.

- [x] **Tree-shaking do Chart.js** *(Concluído na Etapa 1)*
  - **Onde:** `src/components/GraficoPizza.ts` (linhas 1–6)
  - **Solução aplicada:** Registrados apenas `PieController`, `DoughnutController`, `ArcElement`, `Tooltip` e `Legend`.

- [x] **Etapa 5 — Migrar Tailwind CSS da CDN para Build Local (Vite/PostCSS)** *(Concluído na Etapa 5)*
  - **Onde:** `index.html` (linha 7) e `src/styles.css`
  - **Problema:** O uso de `<script src="https://cdn.tailwindcss.com"></script>` compila estilos em tempo de execução no navegador, aumenta o tempo de renderização inicial e emite alerta em produção.
  - **Solução:** Configurar o Tailwind CSS via Vite/PostCSS para gerar apenas o CSS efetivamente utilizado no build.

---

## 2. Consultas ao Supabase & Escalabilidade de Dados

- [x] **Filtrar Transações Fixas Diretamente no Banco de Dados** *(Concluído na Etapa 2)*
  - **Onde:** `src/modules/ciclo.ts` (`carregarFixosTodos`), `src/modules/transacoes.ts` (`handleAbrirFixos`, `handleExportar`) e `src/services/transacoes.ts` (`listarTransacoes`)
  - **Solução aplicada:** Adicionado filtro opcional `fixo?: boolean` em `listarTransacoes` aplicando `.eq('fixo', params.fixo)` no Supabase, mantendo os Fixos sempre visíveis e somando no Saldo Final.

- [x] **Inserção em Lote (Batch Insert) ao Criar Transações Parceladas** *(Concluído na Etapa 2)*
  - **Onde:** `src/hooks/useTransacoes.ts` (`salvarTransacao`) e `src/services/transacoes.ts` (`criarTransacoesEmLote`)
  - **Solução aplicada:** Criada `criarTransacoesEmLote` para enviar todas as parcelas em um único `.insert([...])`.

---

## 3. Possíveis Bugs & Casos de Borda (Edge Cases)

- [x] **Overflow de Datas ao Gerar Parcelas nos Dias 29, 30 e 31** *(Concluído na Etapa 2)*
  - **Onde:** `src/utils/ciclo.ts` (`adicionarMeses`) e `src/hooks/useTransacoes.ts`
  - **Solução aplicada:** Criada função `adicionarMeses` que limita o dia ao último dia do mês de destino sem pular meses curtos (como fevereiro).

- [x] **Etapa 6 — Vincular Parcelas por ID de Grupo em vez de Regex na Descrição** *(Concluído na Etapa 6)*
  - **Onde:** `src/services/transacoes.ts` (`listarParcelasRelacionadas`) e `supabase/schema.sql`
  - **Problema:** As parcelas são encontradas buscando transações com o mesmo `total_parcelas` e comparando a `descricao` via expressão regular. Duas compras distintas com a mesma descrição e mesmo número de parcelas colidem ao editar ou excluir.
  - **Solução:** Adicionar uma coluna opcional `grupo_parcela_id UUID` em `transacoes` para agrupar parcelas de uma mesma compra de forma única (mantendo fallback pela lógica atual para parcelas antigas).

- [x] **Evitar Duplicação de Event Listeners Globais e Corrigir `debouncedUpdateDashboard`** *(Concluído na Etapa 3)*
  - **Onde:** `src/modules/appInit.ts`
  - **Solução aplicada:** `debouncedUpdateDashboard` conectado a `currentHandlers?.updateDashboard()`, cache de ciclo limpo ao trocar dia início/fim, `AbortController` aplicado nos listeners globais e proteção contra reset de tela em refresh de token.

- [x] **Limpar Classes Tailwind Conflitantes e Substituir `alert()` por `toast`** *(Concluído na Etapa 3)*
  - **Onde:** `src/components/Header.ts`, `src/components/TransacaoForm.ts` e `src/components/GraficoPizza.ts`
  - **Solução aplicada:** Substituídos `alert()` por `toast.warning` / `toast.error` e removidas classes utilitárias duplicadas no mesmo elemento.

---

## 4. PWA, Cache & Service Worker

- [x] **Aprimorar Estratégia de Cache do Service Worker (`sw.js`)** *(Concluído na Etapa 4)*
  - **Onde:** `src/sw.js` e `vite.config.ts`
  - **Solução aplicada:** `CACHE_NAME` versionado por build (`organiza-pouco-<versao>`), limpeza automática de caches antigos no `activate`, exclusão de chamadas externas/Supabase e `version.json` do cache, e estratégia *Network-First* para navegação HTML.
