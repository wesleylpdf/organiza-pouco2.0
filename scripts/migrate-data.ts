/**
 * Script de Migração de Dados: Google Sheets → Supabase
 *
 * Este script lê dados exportados do Google Sheets (CSV ou JSON)
 * e importa para o Supabase, preservando todos os campos.
 *
 * Uso:
 *   1. Exporte dados do Google Sheets para JSON (formato abaixo)
 *   2. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
 *   3. Execute: npx tsx scripts/migrate-data.ts
 *
 * Formato JSON esperado:
 * [
 *   {
 *     "id": "1234567890.123",
 *     "Valor": "150.50",
 *     "Data": "2026-02-15",
 *     "Tipo": "saida",
 *     "Categoria": "Alimentação",
 *     "Fixo": "true",
 *     "Descrição": "Supermercado"
 *   },
 *   ...
 * ]
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Configuração Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Função para calcular ciclo_inicio baseado na data
function calcularCicloInicio(dataStr: string): string {
  const data = new Date(dataStr + 'T00:00:00')
  const dia = data.getDate()

  if (dia < 9) {
    data.setMonth(data.getMonth() - 1)
  }
  data.setDate(9)
  data.setHours(0, 0, 0, 0)

  return data.toISOString().split('T')[0]
}

// Função principal de migração
async function migrarDados() {
  console.log('🚀 Iniciando migração de dados...\n')

  // Lê arquivo JSON
  const inputFile = path.join(process.cwd(), 'data-export.json')

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Arquivo não encontrado: ${inputFile}`)
    console.log('💡 Exporte os dados do Google Sheets para data-export.json')
    process.exit(1)
  }

  const rawData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'))
  console.log(`📄 Arquivo lido: ${rawData.length} transações encontradas\n`)

  // Autentica usuário (precisa logar primeiro)
  console.log('🔐 Autenticando usuário...')
  console.log('⚠️  IMPORTANTE: Antes de executar este script, você precisa:')
  console.log('   1. Criar conta no sistema')
  console.log('   2. Login via interface web')
  console.log('   3. Copiar o session token do localStorage')
  console.log('   4. Definir variável de ambiente: SUPABASE_SESSION_TOKEN\n')

  const sessionToken = process.env.SUPABASE_SESSION_TOKEN

  if (!sessionToken) {
    console.error('❌ Variável SUPABASE_SESSION_TOKEN não definida')
    console.log('💡 No navegador (após login), execute no console:')
    console.log('   localStorage.getItem("sb-YOUR-PROJECT-KEY-auth-token")')
    console.log('   Copie o valor e defina: export SUPABASE_SESSION_TOKEN=...')
    process.exit(1)
  }

  // Define sessão
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: sessionToken,
    refresh_token: sessionToken,
  })

  if (sessionError) {
    console.error('❌ Erro ao autenticar:', sessionError.message)
    process.exit(1)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ Usuário não autenticado')
    process.exit(1)
  }

  console.log(`✅ Autenticado como: ${user.email}\n`)

  // Converte dados do formato antigo
  const transacoes = rawData.map((item: any) => {
    const valor = parseFloat(String(item.Valor || item.valor).replace(',', '.'))
    const data = item.Data || item.data
    const tipo = (item.Tipo || item.tipo || 'saida').toLowerCase()
    const categoria = item.Categoria || item.categoria || 'Outros'
    const fixo = String(item.Fixo || item.fixo || 'false').toLowerCase() === 'true'
    const descricao = item.Descricao || item.descricao || null

    if (isNaN(valor) || valor <= 0) {
      console.warn(`⚠️  Valor inválido ignorado: ${JSON.stringify(item)}`)
      return null
    }

    if (!data) {
      console.warn(`⚠️  Data inválida ignorada: ${JSON.stringify(item)}`)
      return null
    }

    return {
      user_id: user.id,
      valor,
      data,
      tipo,
      categoria,
      fixo,
      descricao,
      ciclo_inicio: calcularCicloInicio(data),
    }
  }).filter(Boolean)

  console.log(`📊 ${transacoes.length} transações válidas para importar\n`)

  if (transacoes.length === 0) {
    console.log('✅ Nenhuma transação para importar')
    return
  }

  // Importa em lotes de 100
  const batchSize = 100
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < transacoes.length; i += batchSize) {
    const batch = transacoes.slice(i, i + batchSize)
    console.log(`📤 Importando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(transacoes.length / batchSize)} (${batch.length} transações)...`)

    const { data, error } = await supabase
      .from('transacoes')
      .insert(batch)
      .select()

    if (error) {
      console.error(`❌ Erro no lote:`, error.message)
      errorCount += batch.length
    } else {
      successCount += data.length
      console.log(`✅ Lote importado com sucesso\n`)
    }

    // Delay para evitar rate limiting
    if (i + batchSize < transacoes.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Resumo
  console.log('\n========================================')
  console.log('📈 RESUMO DA MIGRAÇÃO')
  console.log('========================================')
  console.log(`✅ Sucesso: ${successCount} transações`)
  if (errorCount > 0) {
    console.log(`❌ Erros: ${errorCount} transações`)
  }
  console.log('========================================\n')

  if (errorCount === 0) {
    console.log('🎉 Migração concluída com sucesso!')
  } else {
    console.log('⚠️  Migração concluída com alguns erros')
  }
}

// Executa migração
migrarDados().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
