const CACHE_NAME = 'organiza-pouco-__BUILD_VERSION__'
const ASSETS = [
  '/organiza-pouco2.0/',
  '/organiza-pouco2.0/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('organiza-pouco-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Nunca intercepta chamadas externas (ex.: Supabase) nem o controle de versão
  if (url.origin !== self.location.origin || url.pathname.endsWith('/version.json')) {
    return
  }

  // Navegação HTML: Network-First (sempre busca a versão mais nova quando online)
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match('/organiza-pouco2.0/'))
        )
    )
    return
  }

  // Demais assets locais: Cache-First com fallback para rede
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  )
})
