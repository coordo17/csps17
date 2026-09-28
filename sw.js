// Fonctionnement hors reseau : la page et ses fichiers sont gardes en cache.
// Changer VERSION a chaque mise a jour publiee pour que la tablette la recupere.
const VERSION = '2026-09-28-enregistrer-2';
const FICHIERS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHIERS))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== VERSION).map(n => caches.delete(n)))));
  self.clients.claim();
});
// Reseau d'abord (pour recevoir les mises a jour), cache si pas de reseau.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => { const copie = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copie)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
