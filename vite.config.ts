import { defineConfig } from 'vite'
import { copyFileSync, writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const raizProjeto = dirname(fileURLToPath(import.meta.url))

// Versão semântica (2.X.X) lida do package.json: exibe Versão: 2.2.20 no Header.
const pkg = JSON.parse(readFileSync(resolve(raizProjeto, 'package.json'), 'utf-8'))
const BUILD_VERSION = pkg.version

/**
 * - Injeta a versão no index.html (guarda de atualização que roda antes do JS).
 * - Publica dist/version.json.
 * - Publica uma cópia do index como index-<versao>.html, para que apps com
 *   index.html em cache consigam carregar a build nova no GitHub Pages
 *   (onde cada deploy apaga os assets antigos).
 */
function versionamentoPlugin() {
  let baseUrl = '/'

  return {
    name: 'versionamento-deploy',
    apply: 'build' as const,
    configResolved(config: { base: string }) {
      baseUrl = config.base
    },
    transformIndexHtml(html: string) {
      return html
        .replace(/__BUILD_VERSION__/g, BUILD_VERSION)
        .replace(/__BUILD_BASE__/g, baseUrl)
    },
    closeBundle() {
      const distDir = resolve(raizProjeto, 'dist')

      writeFileSync(
        resolve(distDir, 'version.json'),
        JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() })
      )

      copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, `index-${BUILD_VERSION}.html`))

      // Garante que os cabeçalhos de cache (ex: no-cache em version.json) sejam publicados no GitHub Pages
      try {
        copyFileSync(resolve(raizProjeto, '_headers'), resolve(distDir, '_headers'))
      } catch {
        // _headers opcional
      }
    },
  }
}

export default defineConfig({
  base: '/organiza-pouco2.0/',
  plugins: [versionamentoPlugin()],
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['chart.js'],
  },
})
