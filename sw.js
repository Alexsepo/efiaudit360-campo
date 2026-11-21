// Service worker: con conexión usa siempre la versión más nueva; sin conexión, la guardada.
const V = 'efiaudit360-campo-v6';
const ARCHIVOS = ['./', './index.html', './app.css', './js/app.js', './js/db.js', './js/editor.js', './js/paquete.js', './js/zip.js', './manifest.webmanifest', './icon.svg'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((n) => { const cp = n.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return n; }).catch(() => caches.match(e.request)));
});
