const CACHE_NAME = 'csps17-v3';
const ASSETS = [
  '/',
  '/index.html',
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

// Installation : mettre en cache les assets et les templates
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cacher les assets de base
      return cache.addAll(ASSETS).then(function() {
        // Cacher les templates en arriere-plan (sans bloquer l'install)
        TEMPLATES.forEach(function(url) {
          fetch(url).then(function(response) {
            if (response.ok) cache.put(url, response);
          }).catch(function() {});
        });
      });
    })
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
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

// Fetch : cache d'abord, reseau ensuite
self.addEventListener('fetch', function(event) {
  // Ne pas intercepter les requetes API
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      
      return fetch(event.request).then(function(response) {
        // Mettre en cache les templates et CDN
        if (response.ok && (
          event.request.url.includes('raw.githubusercontent.com') ||
          event.request.url.includes('cdnjs.cloudflare.com') ||
          event.request.url.includes('cdn.jsdelivr.net')
        )) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Hors ligne : retourner l'index.html pour la navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Message pour forcer le refresh du cache
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
