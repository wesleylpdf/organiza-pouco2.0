import { defineConfig } from 'vite'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const raizProjeto = dirname(fileURLToPath(import.meta.url))

// Identificador único por build: embutido no bundle e publicado em version.json.
const BUILD_VERSION = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Publica dist/version.json para que o app em execução detecte builds novas.
 */
function versionJsonPlugin() {
  return {
    name: 'gerar-version-json',
    apply: 'build' as const,
    closeBundle() {
      writeFileSync(
        resolve(raizProjeto, 'dist', 'version.json'),
        JSON.stringify({ version: BUILD_VERSION, builtAt: new Date().toISOString() })
      )
    },
  }
}

export default defineConfig({
  base: '/organiza-pouco2.0/',
  plugins: [versionJsonPlugin()],
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
