import { init } from '@/modules/appInit'
import {
  handleSalvar,
  handleCancelarEdicao,
  handleEditar,
  handleExcluir,
  handleQuickEdit,
  handleAbrirFixos,
  handleExportar,
  initTransacoes,
} from '@/modules/transacoes'
import {
  handleGerenciarCategorias,
  initCategorias,
} from '@/modules/categorias'

import {
  updateDashboard,
  updateLista,
  updateHeader,
  updateGrafico,
  limparCampoBusca,
  limparCacheFixos,
  initCiclo,
} from '@/modules/ciclo'

// Conecta os handlers do transacoes ao ciclo
initTransacoes({
  limparCampoBusca,
  limparCacheFixos,
  updateLista,
  updateHeader,
})

// Conecta os handlers do categorias ao ciclo
initCategorias({
  updateGrafico,
})

// Conecta os handlers do ciclo ao main.ts
initCiclo({
  handleEditar,
  handleExcluir,
  handleQuickEdit,
})

// Inicializa a aplicação passando os handlers para o appInit
init({
  handleSalvar,
  handleCancelarEdicao,
  handleGerenciarCategorias,
  handleAbrirFixos,
  handleExportar,
  updateDashboard,
  updateLista,
})
