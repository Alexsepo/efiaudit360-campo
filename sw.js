// Service worker: guarda la aplicación para que abra sin conexión.
const V = 'efiaudit360-campo-v1';
const ARCHIVOS = ['./', './index.html', './app.css', './js/app.js', './js/db.js', './js/editor.js', './js/paquete.js', './js/zip.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((n) => { const cp = n.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return n; })));
});
