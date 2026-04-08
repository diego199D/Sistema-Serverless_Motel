const CACHE_NAME = 'motel-v2';
const assets = [
  './',
  './index.html',
  './consultar-dia.html',
  './gestion.html',
  './pago.html',
  './reportes.html',
  './estilo.css',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './photo.jpg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});