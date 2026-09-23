const CACHE_NAME = 'finance-app-v21';
const ASSETS = [
  './',
  './index.html',
  './assets/app.css',
  './assets/app.js',
  './src/constants/data.js',
  './src/services/ocr/ocr-engine.js',
  './src/services/firebase/firebase-sync.js',
  './src/services/ai/ai-schema.js',
  './src/services/ai/ai-validator.js',
  './src/services/ai/ai-provider.js',
  './src/services/ai/expense-parser.js',
  './src/services/ai/financial-insights.js',
  './src/services/ai/receipt-parser.js',
  './src/services/ai/ai-agent.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        if (k !== CACHE_NAME) {
          return caches.delete(k);
        }
      }))
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
