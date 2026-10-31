// J.A.R.V.I.S. Institutional Quant Terminal - Android WebAPK & PWA Service Worker
// Version: jarvis-quant-v3.0.0-android-pwa

const CACHE_NAME = 'jarvis-quant-v3.0.0-android-pwa';
const OFFLINE_URL = '/';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-maskable-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
];

// Install event: precache core icons/manifest and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const assetUrl of PRECACHE_ASSETS) {
        try {
          const req = new Request(assetUrl, { credentials: 'same-origin' });
          const res = await fetch(req);
          if (res && res.status === 200) {
            await cache.put(assetUrl, res);
          }
        } catch (err) {
          // Continue precaching remaining assets even if one fails
        }
      }
    })
  );
});

// Activate event: purge old caches and immediately claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Allow client pages to trigger immediate skipWaiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event: required by Android Chrome WebAPK installability criteria
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Only handle http/https requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Do not intercept WebSocket or Vite internal dev modules
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/ws')
  ) {
    return;
  }

  // API requests: Network-first with graceful JSON offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() => {
        return new Response(
          JSON.stringify({
            success: true,
            offline: true,
            provider: 'OFFLINE_CACHE_FALLBACK',
            timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Navigation requests (HTML pages): Network-first with cached app shell fallback
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cachedRoot = await caches.match(OFFLINE_URL);
          if (cachedRoot) return cachedRoot;
          return new Response(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JARVIS Quant</title></head><body style="background:#060913;color:#e2e8f0;font-family:sans-serif;padding:24px;"><h2>JARVIS Quant Terminal</h2><p>Reconnecting to live NSE/BSE feed...</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Same-origin static assets (icons, manifest, bundles): Network-first for manifest, Cache-first for icons
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => cached || new Response('', { status: 408 }));

        return cached || networkFetch;
      })
    );
  }
});
