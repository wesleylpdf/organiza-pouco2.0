import { defineConfig } from 'vite'

export default defineConfig({
  base: '/organiza-pouco2.0/',
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 5173
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  optimizeDeps: {
    include: ['chart.js']
  }
})
