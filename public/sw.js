/**
 * Sidequest's service worker.
 *
 * The app already keeps your library on the device, so needing a network
 * to look at it was the odd part. This makes the shell and the last
 * answers RAWG gave available offline, which is the state an app about
 * your backlog should survive in — on a train, on a plane, in a flat with
 * bad signal.
 *
 * Written by hand rather than generated. A precache manifest would need a
 * build step to learn the hashed bundle names; runtime caching learns
 * them by watching what the page actually asks for, which costs one extra
 * visit and no tooling.
 *
 * Bump CACHE_VERSION to retire every cache from an older shape.
 */
const CACHE_VERSION = 'v1';
const SHELL = `sidequest-shell-${CACHE_VERSION}`;
const STATIC = `sidequest-static-${CACHE_VERSION}`;
const DATA = `sidequest-data-${CACHE_VERSION}`;
const MEDIA = `sidequest-media-${CACHE_VERSION}`;
const OURS = [SHELL, STATIC, DATA, MEDIA];

/** Artwork is the one cache that could grow without limit. */
const MEDIA_MAX_ENTRIES = 180;

/**
 * Every statically rendered route.
 *
 * These are precached so an offline navigation gets *its own* shell.
 * Serving the home document for /plan renders the right thing but throws
 * a hydration mismatch, because the markup React is handed belongs to a
 * different route — the same class of bug e2e/hydration.mjs exists to
 * catch, and it would have shipped disguised as "offline support".
 */
const ROUTES = ['/', '/plan', '/library', '/about', '/terms', '/privacy'];

/**
 * Game pages are dynamic, but their pre-rendered HTML is not: the export
 * writes one shell for /game/[id] and the id only matters once the app is
 * running. So any cached game document is the correct offline answer for
 * every game, and is kept under a synthetic key to be found by path.
 */
const GAME_SHELL = '/game/__shell';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then(async (cache) => {
        // Individually, not addAll: one route failing to precache should
        // cost that route's offline support, not the whole install.
        await Promise.all(
          [...ROUTES, '/manifest.webmanifest'].map((path) =>
            cache.add(path).catch(() => {})
          )
        );
        const shell = await fetch('/game/0').catch(() => null);
        if (shell?.ok) await cache.put(GAME_SHELL, shell);
      })
      .finally(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !OURS.includes(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Keep a cache from growing forever, oldest request first. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(
    keys.slice(0, keys.length - max).map((key) => cache.delete(key))
  );
}

/** Immutable, content-hashed assets: serve from disk, fetch once. */
async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (max) trim(cacheName, max);
  }
  return response;
}

/** Answers that change: show what we have, replace it in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit ?? fresh;
}

/** Documents: always prefer the network, so a deploy lands immediately. */
async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match('/')) ??
      Response.error()
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Serverless routes are side effects and crawler output — never cached.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }
  if (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (url.pathname.startsWith('/media/')) {
    event.respondWith(cacheFirst(request, MEDIA, MEDIA_MAX_ENTRIES));
    return;
  }
  if (url.pathname.startsWith('/rawg/')) {
    event.respondWith(staleWhileRevalidate(request, DATA));
  }
});
