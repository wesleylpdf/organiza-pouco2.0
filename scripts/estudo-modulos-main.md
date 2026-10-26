# Estudo: Quebra de main.ts em módulos

> **Decisão:** Estudo apenas. Não foram realizadas alterações no código.

## Motivação

O arquivo `src/main.ts` (688 linhas) concentra a maior parte da orquestração da aplicação:
- inicialização (`init`, `setupApp`)
- controle de auth (`onAuthChange`)
- carregamento de ciclo e configuração
- atualização do dashboard, lista, header e gráfico
- handlers de transação (`handleSalvar`, `handleExcluir`, `handleEditar`, etc.)
- handlers de fixos, categorias e exportação
- estado de cache de fixos
- tela de carregamento

A proposta é dividir em módulos por responsabilidade, mantendo a funcionalidade idêntica.

---

## Módulos propostos

### 1. `src/modules/appInit.ts`
- `init()`
- `setupApp(_userEmail)`
- `carregarConfiguracaoCiclo(userId)`
- `salvarConfiguracaoCiclo(diaInicio, diaFim, userId)`
- `atualizarCarregamento(percentual, texto)`
- `criarTelaCarregamento()`
- `removerTelaCarregamento()`
- `atualizarCarregamentoCicloBtns(percentual)`
- `setBotoesDesabilitados(desabilitado)`
- `carregarCicloComFeedback()`

### 2. `src/modules/ciclo.ts`
- `carregarFixosTodos()`
- `limparCacheFixos()`
- `limparCampoBusca()`
- `updateDashboard()`
- `updateHeader()`
- `updateLista()`
- `updateGrafico(transacoes?)`
- `updateLoadingStates()`
- `calcularTotais(txs)`

### 3. `src/modules/transacoes.ts`
- `handleSalvar(data)`
- `handleCancelarEdicao()`
- `handleEditar(id)`
- `handleExcluir(id)`
- `handleAbrirFixos()`
- `handleExportar()`

### 4. `src/modules/categorias.ts`
- `handleGerenciarCategorias()`

---

## Relações e dependências

```
main.ts (orchestrador, chama init())
├── appInit.ts            (setup, ciclo, loading, tela)
├── ciclo.ts              (dashboard, lista, header, grafico, totais)
├── transacoes.ts         (salvar, excluir, editar, fixos, exportar)
├── categorias.ts         (gerenciar categorias)
└── (hooks já existentes)
    ├── useTransacoes
    ├── useCategorias
    └── useAuth
```

### Dependências compartilhadas

Todos os módulos precisam de:
- `appStore` (`@/stores/AppState`)
- `transacoesHook` / `categoriasHook` (instâncias de hooks)
- `logger`, `toast`
- `getAuthState` (`@/hooks/useAuth`)

Os handlers de transação (`transacoes.ts`) precisam de `limparFormEdicao`, que é retornado por `criarTransacaoForm` em `setupApp`. Esse callback precisaria ser passado como parâmetro ou armazenado em um módulo compartilhado de estado de UI.

---

## Problemas identificados no estudo

1. **Estado compartilhado disperso**: `fixosTodosCache`, `carregamentoEl`, `btnCicloAnterior`, `btnCicloProximo`, `limparFormEdicao` são variáveis de módulo em `main.ts`. Separar requer um estado de aplicação compartilhado ou passar esses valores por parâmetro entre módulos.

2. **Callbacks circulares**: `handleEditar` chama `preencherFormEdicao` (do `TransacaoForm`) que depende do `formContainer` criado em `setupApp`. `handleSalvar` chama `updateLista` e `updateHeader`. Essas cadeias precisam ser mapeadas antes da separação.

3. **Eventos globais**: `window.addEventListener('cicloConfigChange', ...)`, `window.addEventListener('themechange', ...)`, listeners de `ciclo-anterior`/`ciclo-proximo`/`export-btn`/`filter-*` estão todos em `setupApp`. Precisariam ser distribuídos ou centralizados em um módulo de eventos.

4. **`main.ts` como ponto de entrada**: A linha final `init()` é o ponto de partida. Após a quebra, `main.ts` poderia se tornar apenas um arquivo mínimo que importa e chama `init()` de `appInit.ts`.

---

## Conclusão do estudo

A quebra é tecnicamente viável, mas exige:
- Criar um estado compartilhado para `fixosTodosCache`, `limparFormEdicao`, etc.
- Mapear cuidadosamente as dependências entre handlers e atualização de UI
- Distribuir os event listeners dos elementos DOM criados em `setupApp`

**Decisão:** Não realizar alterações no código. Este estudo serve como referência para uma futura refatoração, se o time decidir proceder.
