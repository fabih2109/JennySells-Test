const CACHE='jennysells-test-v2';
const ASSETS=[
  '/JennySells-Test/',
  '/JennySells-Test/index.html',
  '/JennySells-Test/manifest.webmanifest',
  '/JennySells-Test/icon-192.png',
  '/JennySells-Test/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(r => r || caches.match('/JennySells-Test/'))
    )
  );
});
