const CACHE = 'shopstudio-23-ocr-pro-v1';
const CORE = ['./', './index.html', './shopstudio.bundle.js', './shopstudio.bundle.css', './studio-interactions-fix.js', './studio-interactions-fix.css', './a4-print.js', './a4-print.css', './manifest.webmanifest', './assets/icon.svg', './ocr-pro.js', './ocr-pro.css'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {}); }
    return response;
  }).catch(async () => (await caches.match(event.request)) || Response.error()));
});
