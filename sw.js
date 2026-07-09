// Service worker - handover checklist PWA light v4
const CACHE_NAME = 'il-rail-handover-light-root-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const isNavigation = req.mode === 'navigate';
  const isIcon = (/\/(favicon-16|favicon-32|apple-touch-icon|icon-192|icon-512|icon-maskable-512)\.png($|\?)/).test(req.url);
  if (isIcon) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    })));
    return;
  }
  event.respondWith(fetch(req).then(res => {
    const copy = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
    return res;
  }).catch(() => caches.match(req).then(cached => cached || (isNavigation ? caches.match('./index.html') : undefined))));
});
