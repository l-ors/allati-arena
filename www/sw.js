// Service Worker for Állati Aréna (Animal Clash)
const CACHE_NAME = 'allati-arena-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/shop.css',
  './css/challenges.css',
  './js/icons.js',
  './js/cards.js',
  './js/save.js',
  './js/arena.js',
  './js/arenas.js',
  './js/draw.js',
  './js/preview.js',
  './js/battle.js',
  './js/deck.js',
  './js/shop.js',
  './js/members.js',
  './js/challenges.js',
  './js/chest-animation.js',
  './js/multiplayer.js',
  './js/ui.js',
  './icon.png',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests and skip websocket requests
  if (e.request.method !== 'GET' || e.request.url.startsWith('ws')) return;
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
