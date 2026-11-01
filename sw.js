// BartBall Service Worker – network-first for HTML
const CACHE_NAME = 'bartball-v1.0.4';

const PRECACHE_URLS = [
  '/manifest.json',
  '/icon_192x192.png',
  '/icon_1_512x512.png'
  // add other static assets if needed
];

// INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE – clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // For HTML pages → always try network first
  if (request.headers.get('accept')?.includes('text/html') || 
      request.url.endsWith('/') || 
      request.url.endsWith('/download') ||
      request.url.endsWith('.html')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          // Only fall back to cache if offline
          return caches.match(request);
        })
    );
    return;
  }

  // For everything else (icons, manifest, etc.) → cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});