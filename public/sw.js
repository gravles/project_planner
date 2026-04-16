// Network-first service worker.
// Serves fresh content when online; falls back to cache when offline.
const CACHE = 'project-planner-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Only handle GET requests; skip API and Supabase calls
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE).then(cache => cache.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
