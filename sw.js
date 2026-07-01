// CACHE_NAME : a incrementer a chaque fois qu'on veut forcer un nettoyage du
// cache (ex: apres un changement important). Le nom seul ne suffit plus a
// garantir la fraicheur d'index.html — voir la strategie reseau-d'abord ci-dessous.
const CACHE_NAME = 'csps17-v4';

// Assets statiques (icones, manifest, librairies CDN) : rarement modifies,
// cache-d'abord convient bien (rapide, fonctionne hors-ligne sur chantier).
const ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/pizzip@3.1.4/dist/pizzip.min.js',
  'https://cdn.jsdelivr.net/npm/docxtemplater@3.44.0/build/docxtemplater.js',
];

const TEMPLATES = [
  'https://raw.githubusercontent.com/coordo17/csps17/main/Fiche_IC_Vierge_CSPS17_v15.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CR_Visite_Chantier_CSPS17_v2.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_CR_Reunion_Coordination_v2.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Observation_Notification_RJC_v2.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Mise_en_Demeure_DGI_v3_1.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Courrier_Transmission_IC_v2_1.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Grille_Analyse_PPSPS_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Registre_Journal_Bordereau_v3_1.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Suivi_Declaration_Prealable_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Fiche_Diffusion_PGC_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_DIUO_Trame_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_PV_Transmission_DIUO_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_PV_Passation_Consignes_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_Rapport_Fin_Mission_v2.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_CISSCT_Reglement_Interieur_v3.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_CISSCT_Convocation_v2.docx',
  'https://raw.githubusercontent.com/coordo17/csps17/main/CSPS17_CR_Coordination_Reunion_v2.docx',
];

// Installation : mettre en cache les assets statiques (plus l'app shell n'est
// PAS precache ici — voir strategie reseau-d'abord dans le fetch handler).
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS).then(function() {
        TEMPLATES.forEach(function(url) {
          fetch(url).then(function(response) {
            if (response.ok) cache.put(url, response);
          }).catch(function() {});
        });
      });
    }).catch(function(err) {
      // Ne jamais bloquer l'installation si un asset secondaire echoue a se precacher
      console.warn('SW install: precache partiel', err);
    })
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches (les noms differents de CACHE_NAME)
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch :
// - API (/api/*) : jamais intercepte, toujours reseau direct.
// - App shell (navigation, /, /index.html) : RESEAU D'ABORD, cache en secours
//   uniquement hors-ligne. C'est le point cle qui garantit que chaque mise a
//   jour deployee sur Render est bien visible immediatement, sans etre bloquee
//   par une ancienne version en cache.
// - Reste (icones, manifest, templates Word, librairies CDN) : cache d'abord,
//   reseau ensuite — ces fichiers changent rarement, et ca reste utilisable
//   hors-ligne sur un chantier sans reseau.
self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('/api/')) return;

  var url = event.request.url;
  var isAppShell = event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      return fetch(event.request).then(function(response) {
        if (response.ok && (
          url.includes('raw.githubusercontent.com') ||
          url.includes('cdnjs.cloudflare.com') ||
          url.includes('cdn.jsdelivr.net')
        )) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Message pour forcer le refresh du cache depuis la page (optionnel)
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
