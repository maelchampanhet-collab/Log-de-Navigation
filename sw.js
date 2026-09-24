// Service worker de l'appli Log VFR : permet l'installation sur l'écran d'accueil
// et l'ouverture hors ligne (appli + bibliothèques + tuiles de carte déjà vues).
// Changer VERSION à chaque mise à jour de log-nav-vfr.html pour purger l'ancien cache.
const VERSION = 'logvfr-v1';
const APP_CACHE = VERSION + '-app';
const RUNTIME_CACHE = VERSION + '-runtime';
const TILE_CACHE = 'logvfr-tuiles';
const TILE_MAX = 1500;

const APP_SHELL = [
  './log-nav-vfr.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k !== APP_CACHE && k !== RUNTIME_CACHE && k !== TILE_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max){
  const c = await caches.open(name);
  const keys = await c.keys();
  for(let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // METAR (AVWX) et NOTAM : toujours en direct, jamais de donnée météo périmée servie depuis un cache.
  if(url.hostname.endsWith('avwx.rest') || url.hostname.endsWith('aviationweather.gov')) return;

  // Appli elle-même : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
  if(url.origin === self.location.origin){
    e.respondWith(
      fetch(req)
        .then(res => {
          if(res.ok){ const copy = res.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch:true }))
    );
    return;
  }

  // Tuiles IGN (carte OACI / Plan IGN) : cache d'abord, pour garder la carte des zones déjà consultées.
  if(url.hostname === 'data.geopf.fr' || url.hostname.endsWith('.ign.fr')){
    e.respondWith(
      caches.open(TILE_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if(res.ok || res.type === 'opaque'){ c.put(req, res.clone()); trimCache(TILE_CACHE, TILE_MAX); }
        return res;
      })))
    );
    return;
  }

  // Bibliothèques CDN (Leaflet, icônes Phosphor, polices) : cache, rafraîchi en arrière-plan.
  if(['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)){
    e.respondWith(
      caches.open(RUNTIME_CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if(res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});
