// Service worker: lets tellme.mom open without a connection.
// Pages, scripts, styles: network first (always fresh online), cached copy offline.
// Fonts and images: cache first.
// The letter API is never cached — offline, the page shows a pre-written letter.
const VERSION = 'tellme-v1';
const PRECACHE = [
  '/',
  '/letters',
  '/app.js',
  '/site.js',
  '/pages.css',
  '/manifest.webmanifest',
  '/fonts/CormorantGaramond-latin.woff2',
  '/fonts/CormorantGaramond-Italic-latin.woff2',
  '/fonts/InstrumentSans-latin.woff2',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;

  // Fonts and images never change under the same name: cache first.
  if (/\.(woff2|png|jpg)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // Pages, scripts, styles: network first so updates arrive immediately,
  // cached copy when offline.
  const key = req.mode === 'navigate' ? url.pathname : req;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) =>
        hit || (req.mode === 'navigate' ? caches.match('/') : Response.error())))
  );
});
