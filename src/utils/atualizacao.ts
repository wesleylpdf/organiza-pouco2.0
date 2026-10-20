/**
 * Detecção de novas versões do app.
 *
 * Cada build gera um identificador único, que é:
 *  - embutido no bundle em execução (`__BUILD_VERSION__`);
 *  - publicado em `version.json` no servidor.
 *
 * O app consulta `version.json` periodicamente e, quando o valor diverge do
 * bundle atual, recarrega a página com cache contornado.
 */

import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000
const URL_VERSAO = `${import.meta.env.BASE_URL}version.json`

interface VersionInfo {
  version: string
  builtAt?: string
}

let recarregando = false

async function buscarVersaoPublicada(): Promise<string | null> {
  try {
    const resposta = await fetch(`${URL_VERSAO}?_=${Date.now()}`, { cache: 'no-store' })
    if (!resposta.ok) return null
    const dados = (await resposta.json()) as VersionInfo
    return dados.version || null
  } catch {
    // Rede instável: tenta novamente na próxima verificação
    return null
  }
}

/**
 * Recarrega a página buscando o index.html do servidor.
 * `location.reload(true)` é ignorado pelos navegadores modernos, então usamos
 * uma URL com parâmetro extra — os assets têm nomes com hash a cada build.
 */
function recarregarIgnorandoCache(): void {
  if (recarregando) return
  recarregando = true

  const url = new URL(window.location.href)
  url.searchParams.set('v', String(Date.now()))
  window.location.replace(url.toString())
}

async function verificarAtualizacao(): Promise<void> {
  if (recarregando) return

  const versaoPublicada = await buscarVersaoPublicada()
  if (!versaoPublicada || versaoPublicada === __BUILD_VERSION__) return

  logger.info('Nova versão detectada', {
    emExecucao: __BUILD_VERSION__,
    publicada: versaoPublicada,
  })
  toast.info('Nova versão disponível. Atualizando...')
  window.setTimeout(recarregarIgnorandoCache, 800)
}

/**
 * Inicia a verificação periódica de novas versões.
 * Verifica ao carregar, ao voltar o foco para a aba e em intervalo fixo.
 */
export function iniciarVerificacaoDeAtualizacoes(): void {
  void verificarAtualizacao()

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void verificarAtualizacao()
    }
  })

  window.setInterval(() => {
    void verificarAtualizacao()
  }, INTERVALO_VERIFICACAO_MS)
}
