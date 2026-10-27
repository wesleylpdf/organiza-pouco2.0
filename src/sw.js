const CACHE_NAME = 'organiza-pouco-v1'
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
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  )
})
