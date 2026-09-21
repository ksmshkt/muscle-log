const CACHE = 'muscle-log-v4';
const STATIC = ['./', './index.html', './style.css', './app.js', './icon-512.png'];
const CDN_HOST = 'cdn.jsdelivr.net';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

// CDN URLs are version-pinned, so a cached copy never goes stale.
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === CDN_HOST) {
    e.respondWith(cacheFirst(e.request));
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith('/_vercel/')) return;
  e.respondWith(networkFirst(e.request));
});
