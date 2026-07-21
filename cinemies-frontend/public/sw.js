/**
 * Cinemies Service Worker
 * 
 * Caching strategy:
 *   - App shell (HTML/CSS/JS bundles): Cache-first, prefetched on install
 *   - Movie poster images: Stale-while-revalidate, max 200 items, 30-day max age
 *   - API calls (/api/*): Network-first, 5s timeout fallback to cache
 *   - External fonts/assets: Cache-first with long TTL
 */

const SHELL_CACHE = 'cinemies-shell-v1';
const IMAGE_CACHE = 'cinemies-images-v1';
const API_CACHE   = 'cinemies-api-v1';

const MAX_IMAGE_ENTRIES = 200;
const MAX_IMAGE_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const API_NETWORK_TIMEOUT_MS = 5000;

// App shell assets to prefetch on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// ─── Install: Prefetch app shell ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      console.log('[SW] Prefetching app shell');
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: Clean up old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  const currentCaches = [SHELL_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !currentCaches.includes(name))
          .map(name => {
            console.log('[SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch: Route requests to appropriate strategy ─────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin (except images/fonts), and browser-extension requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls: Network-first with timeout fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, API_CACHE, API_NETWORK_TIMEOUT_MS));
    return;
  }

  // Movie poster images: Stale-while-revalidate
  if (
    url.pathname.match(/\.(jpg|jpeg|png|webp|avif)$/) ||
    url.hostname.includes('image.tmdb.org') ||
    url.hostname.includes('cloudinary') ||
    url.hostname.includes('imgix')
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES, MAX_IMAGE_AGE_SECONDS));
    return;
  }

  // App shell + everything else: Cache-first
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// ─── Strategy: Cache-first ─────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return new Response('Offline — app shell unavailable', { status: 503 });
  }
}

// ─── Strategy: Network-first with timeout ──────────────────────────────────
async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  const networkPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
  );

  try {
    return await Promise.race([networkPromise, timeoutPromise]);
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Strategy: Stale-while-revalidate with LRU eviction ───────────────────
async function staleWhileRevalidate(request, cacheName, maxEntries, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Serve stale immediately, update in background
  const networkUpdate = fetch(request).then(async response => {
    if (response.ok) {
      // LRU: evict oldest entries if over limit
      const keys = await cache.keys();
      if (keys.length >= maxEntries) {
        await cache.delete(keys[0]);
      }
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) {
    // Check if cached response is stale
    const cachedDate = cached.headers.get('date');
    if (cachedDate) {
      const ageSeconds = (Date.now() - new Date(cachedDate).getTime()) / 1000;
      if (ageSeconds > maxAgeSeconds) {
        // Too old — wait for network
        return networkUpdate || cached;
      }
    }
    return cached;
  }

  return networkUpdate || new Response('Image not available offline', { status: 503 });
}
