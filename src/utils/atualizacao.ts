/**
 * Detecção de novas versões do app (GitHub Pages).
 *
 * Cada build gera um identificador único, que é:
 *  - embutido no bundle em execução (`__BUILD_VERSION__`);
 *  - publicado em `version.json` no servidor.
 *
 * O app consulta `version.json` periodicamente e, quando o valor diverge do
 * bundle atual, recarrega a página com cache contornado.
 *
 * No GitHub Pages o deploy substitui os arquivos antigos, então cada build
 * também mantém uma cópia de `index.html` como `index-<versao>.html`: assim um
 * app aberto consegue recarregar sem risco de pedir assets já removidos.
 */

import { logger } from '@/utils/logger'
import { toast } from '@/utils/toast'

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000
const TEMPO_EXIBICAO_TOAST_MS = 2500
const CHAVE_ULTIMA_VERSAO_VISTA = 'organiza_pouco_ultima_versao'
const BASE_URL = import.meta.env.BASE_URL
const URL_VERSAO = `${BASE_URL}version.json`

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
 * Recarrega usando o snapshot `index-<versao>.html` da build publicada.
 *
 * Necessário no GitHub Pages: cada deploy apaga os assets da build anterior,
 * então recarregar o index.html em cache pode pedir arquivos inexistentes.
 */
function recarregarIgnorandoCache(versao: string): void {
  if (recarregando) return
  recarregando = true

  window.location.replace(`${BASE_URL}index-${versao}.html?v=${versao}`)
}

async function verificarAtualizacao(): Promise<void> {
  if (recarregando) return

  const versaoPublicada = await buscarVersaoPublicada()
  if (!versaoPublicada || versaoPublicada === __BUILD_VERSION__) return

  logger.info('Nova versão detectada', {
    emExecucao: __BUILD_VERSION__,
    publicada: versaoPublicada,
  })
  try {
    localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, versaoPublicada)
  } catch {
    // Ignora erro de storage
  }
  toast.info('Nova versão disponível. Atualizando...', TEMPO_EXIBICAO_TOAST_MS)
  window.setTimeout(() => recarregarIgnorandoCache(versaoPublicada), TEMPO_EXIBICAO_TOAST_MS)
}

/**
 * Se a página já abriu direto na versão nova (ex.: via redirecionamento rápido
 * do index.html ou Service Worker Network-First), exibe o toast confirmando
 * que a nova versão foi aplicada.
 */
function notificarSeAtualizouNoCarregamento(): void {
  try {
    const versaoAnterior = localStorage.getItem(CHAVE_ULTIMA_VERSAO_VISTA)
    localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, __BUILD_VERSION__)
    if (versaoAnterior && versaoAnterior !== __BUILD_VERSION__) {
      toast.info(`Nova versão disponível. Atualizando... (${__BUILD_VERSION__})`, 3500)
    }
  } catch {
    // Ignora erro de storage
  }
}

/**
 * Inicia a verificação periódica de novas versões.
 * Verifica ao carregar, ao voltar o foco para a aba e em intervalo fixo.
 */
export function iniciarVerificacaoDeAtualizacoes(): void {
  notificarSeAtualizouNoCarregamento()
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
