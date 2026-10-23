// TravelAid service worker.
// Caching policy:
//  - Precache: the app shell ('/'), the offline fallback page and the app icon. No user data.
//  - Navigations: network first, falling back to the cached shell, then offline.html.
//  - Hashed build assets (/assets/*): cache first (immutable file names).
//  - Everything else (API calls, third-party maps, WhatsApp, tel:, sms:): NOT intercepted.
// Personal, contact, trip, medical and location data lives in localStorage and is never cached here.

const VERSION = 'travelaid-v1';
const PRECACHE = ['/', '/offline.html', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave third-party requests alone

  if (req.mode === 'navigate') {
    // Offline: serve the cached app shell so client-side routes still open.
    event.respondWith(
      fetch(req).catch(() => caches.match('/').then((shell) => shell || caches.match('/offline.html'))),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      })),
    );
  }
});
