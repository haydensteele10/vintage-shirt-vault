const CACHE = 'tag-charting-v1';
const IMAGE_CACHE = 'tag-charting-images-v1';
const IMAGE_CACHE_MAX = 100;

// App shell: resources we cache immediately on install
const SHELL = [
  '/',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.svg',
];

// ── Install: pre-cache the shell ────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(SHELL.map((url) => c.add(url)))
    )
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== IMAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Evict oldest entries when the image cache exceeds max entries.
async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length > IMAGE_CACHE_MAX) {
    await Promise.all(keys.slice(0, keys.length - IMAGE_CACHE_MAX).map((k) => cache.delete(k)));
  }
}

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Images (own-origin + cross-origin Supabase Storage): cache-first.
  // Cross-origin image requests from <img> arrive as mode:'no-cors' so the
  // response is opaque (status 0). We cache it anyway — the browser can still
  // render opaque blobs in <img> elements.
  if (request.destination === 'image') {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async (imgCache) => {
        const cached = await imgCache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          // Cache both normal (ok) and opaque (cross-origin no-cors) responses.
          if (response.ok || response.type === 'opaque') {
            trimImageCache(imgCache);
            imgCache.put(request, response.clone());
          }
          return response;
        } catch {
          // Offline with no cached version — return a transparent 1×1 gif
          return new Response(
            atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
            { headers: { 'Content-Type': 'image/gif' } }
          );
        }
      })
    );
    return;
  }

  // Pass through: non-GET cross-origin (Supabase API, auth, etc.)
  if (url.origin !== location.origin) return;

  // Navigation requests (HTML): network-first, fall back to cached '/'
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r ?? new Response('', { status: 503 })))
    );
    return;
  }

  // Static assets (JS/CSS): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(request).then((cached) => {
        const fetched = fetch(request).then((res) => {
          if (res.ok) c.put(request, res.clone());
          return res;
        }).catch(() => cached ?? new Response('', { status: 503 }));
        return cached ?? fetched;
      })
    )
  );
});
