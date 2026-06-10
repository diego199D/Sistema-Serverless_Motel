const CACHE_NAME = 'motel-v4';

const IMAGENES_ESTATICAS = [
  './icon-192.png',
  './icon-512.png',
  './photo.jpg',
];

// Instala y pre-cachea solo imágenes (no HTML/JS/CSS para que siempre vengan frescos)
self.addEventListener('install', e => {
  self.skipWaiting(); // activa el nuevo SW inmediatamente, sin esperar a que se cierren tabs
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(IMAGENES_ESTATICAS)));
});

// Limpia cachés viejas y toma control de todos los tabs abiertos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // toma control sin recargar la página
  );
});

self.addEventListener('fetch', e => {
  // Solo interceptar peticiones del mismo origen (no Supabase, no CDNs)
  if (!e.request.url.startsWith(self.location.origin)) return;

  const url = new URL(e.request.url);
  const esImagen = /\.(png|jpg|jpeg|gif|ico|svg|webp)$/.test(url.pathname);

  if (esImagen) {
    // Cache First para imágenes: rápido y no cambian seguido
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  } else {
    // Network First para HTML, JS, CSS: siempre trae la versión nueva si hay internet
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clon = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clon));
          return res;
        })
        .catch(() => caches.match(e.request)) // fallback a caché si no hay internet
    );
  }
});
