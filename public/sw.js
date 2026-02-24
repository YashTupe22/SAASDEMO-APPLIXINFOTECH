/**
 * Synplix Service Worker
 * Strategy:
 *   /_next/static/*  → Cache-first  (hashed assets never change)
 *   /manifest.json, /logo.png, icons → Cache-first
 *   Navigation (HTML pages) → Network-first, fallback to cache
 *   Everything else → Network only (Firebase SDK calls, etc.)
 */

const CACHE_NAME = 'synplix-v2';

// App shell: pages + assets we always want available offline
const SHELL_URLS = [
  '/',
  '/dashboard',
  '/invoices',
  '/transactions',
  '/attendance',
  '/inventory',
  '/expenses',
  '/settings',
  '/manifest.json',
  '/icon.svg',
];

// ─── Install: pre-cache the shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + https requests
  if (url.origin !== self.location.origin) return;

  // ── Static Next.js assets → cache-first ────────────────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ── Public assets (logo, icons, manifest) → cache-first ────────────────
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|json|woff2?)$/) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // ── Navigation (HTML) → network-first, fallback to cache ───────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Everything else (Firebase, API calls) → network only, no caching
});

// ─── Background Sync ─────────────────────────────────────────────────────────
// When the browser fires the 'sync' event (registered by SwRegister.tsx),
// we post a message to all open clients so the app can flush pending writes.
self.addEventListener('sync', (event) => {
  if (event.tag === 'synplix-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'SW_SYNC_REQUESTED' })
        );
      })
    );
  }
});

// ─── Push notifications (future) ─────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'New notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: data.url || '/dashboard' },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Synplix', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data?.url || '/dashboard')
  );
});
