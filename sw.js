// DOP Service Worker — basic offline cache + speed-up repeat visits
// Version bump na każdy redeploy żeby unieważnić stary cache
const CACHE_VERSION = 'dop-v1-2026-06-05';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sitemap.xml',
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@400;500;600;700;800;900&display=swap'
];

// Install — pre-cache shell
self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache){
      return cache.addAll(CORE_ASSETS).catch(function(e){ console.warn('[SW] precache partial:', e); });
    }).then(function(){ return self.skipWaiting(); })
  );
});

// Activate — usuwa stare cache
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch — network-first dla HTML/API, cache-first dla static assets
self.addEventListener('fetch', function(event){
  const req = event.request;
  // Tylko GET
  if (req.method !== 'GET') return;
  // Skip Brevo/Netlify Functions
  const url = new URL(req.url);
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/') || url.hostname.indexOf('brevo') >= 0) return;

  // Network-first dla HTML
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then(function(resp){
        const copy = resp.clone();
        caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        return resp;
      }).catch(function(){
        return caches.match(req).then(function(cached){ return cached || caches.match('/index.html'); });
      })
    );
    return;
  }

  // Cache-first dla static (fonts, images, CSS, JS)
  event.respondWith(
    caches.match(req).then(function(cached){
      if (cached) return cached;
      return fetch(req).then(function(resp){
        // Tylko same-origin lub allowlist
        if (resp.status === 200 && (url.origin === self.location.origin || url.hostname.indexOf('fonts.g') >= 0 || url.hostname.indexOf('unsplash') >= 0 || url.hostname.indexOf('app-sources') >= 0)) {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then(function(c){ c.put(req, copy); });
        }
        return resp;
      });
    })
  );
});
