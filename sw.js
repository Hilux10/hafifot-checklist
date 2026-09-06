// Service worker - handover checklist PWA
// v7 - מונע הגשה של index.html ישן מהמטמון של הדפדפן
const CACHE_NAME = 'il-rail-handover-cloud-v7';

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
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // reload מדלג על מטמון ה HTTP של הדפדפן ומושך מהרשת באמת
      cache.addAll(APP_SHELL.map(u => new Request(u, { cache: 'reload' })))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// מאפשר לדף לבקש החלפה מיידית של גרסה
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // קריאות לשרת הנתונים הן POST ולכן עוברות ישירות לרשת
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // בקשות לדומיין אחר, כמו סופאבייס, לא נוגעות במטמון בכלל
  if (url.origin !== self.location.origin) return;

  const isNavigation = req.mode === 'navigate';
  const isHTML = isNavigation || /\.html($|\?)/.test(url.pathname);
  const isIcon = /\/(favicon-16|favicon-32|apple-touch-icon|icon-192|icon-512|icon-maskable-512)\.png($|\?)/.test(url.pathname);

  // אייקונים: מהמטמון קודם, הם כמעט לא משתנים
  if (isIcon) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // ה HTML של האפליקציה: תמיד מהרשת, ותמיד בעקיפת מטמון הדפדפן.
  // זו הנקודה שבגללה גרסאות ישנות המשיכו לרוץ.
  if (isHTML) {
    event.respondWith(
      fetch(new Request(req.url, { cache: 'no-store', credentials: 'same-origin' }))
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // שאר הקבצים: רשת קודם, מטמון כגיבוי לעבודה במצב לא מקוון
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
