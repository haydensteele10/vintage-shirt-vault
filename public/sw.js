const CACHE = 'tag-charting-v1';

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
      // addAll fails silently for individual resources; use allSettled pattern
      Promise.allSettled(SHELL.map((url) => c.add(url)))
    )
  );
  // Take over immediately, don't wait for existing tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Pass through: non-GET, cross-origin (Supabase API, fonts, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Navigation requests (HTML): network-first, fall back to cached '/'
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets (JS/CSS/images): stale-while-revalidate
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(request).then((cached) => {
        const fetched = fetch(request).then((res) => {
          if (res.ok) c.put(request, res.clone());
          return res;
        }).catch(() => cached); // offline fallback to whatever we have
        return cached || fetched;
      })
    )
  );
});
