// config/sw.js — Service Worker BYB North
const CACHE = 'byb-north-v3';

// Activar inmediatamente sin pre-cachear (evita errores de red en install)
self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: red primero, caché como respaldo
self.addEventListener('fetch', e => {
    if (e.request.url.includes('firebase') ||
        e.request.url.includes('firebaseio') ||
        e.request.url.includes('googleapis') ||
        e.request.url.includes('gstatic') ||
        e.request.url.includes('cloudinary')) {
        return;
    }
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE).then(cache => cache.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
