const CACHE_NAME = 'grab-app-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './ocr-engine.js',
  './firebase-sync.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first strategy so updates are immediately reflected
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && event.request.method === 'GET') {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkRes;
      })
      .catch(() => caches.match(event.request))
  );
});
