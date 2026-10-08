/* Health Tracker service worker: caches the app shell for offline use. */
const CACHE = 'health-tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer from cache instantly, refresh the cache in the background.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === 'navigate';
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = isNav
        ? (await cache.match('./index.html')) || (await cache.match('./'))
        : await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(isNav ? './index.html' : req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      return res || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })
  );
});
