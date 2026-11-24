const CACHE_NAME = 'prime-bazaar-pwa-v4';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest?v=4',
  '/pwa-192x192.png?v=4',
  '/pwa-512x512.png?v=4',
  '/pwa-maskable-512x512.png?v=4',
  '/apple-touch-icon.png?v=4',
  '/favicon.ico?v=4',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept backend APIs or Vite dev module graph requests
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/src/')
  ) {
    return;
  }

  // Always check network first for page navigations, falling back to cache offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static PWA assets & icons: true network-first with cache fallback
  if (
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/pwa-') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
