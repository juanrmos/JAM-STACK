const CACHE_STATICOS = "estaticos-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_STATICOS).map((k) => caches.delete(k))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear llamadas a la API — siempre red, sin fallback silencioso a datos viejos
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Si la ruta es POST, PUT, DELETE, tampoco cachear (solo peticiones GET)
  if (event.request.method !== "GET") {
    return;
  }

  // Estáticos: responder de caché de inmediato, actualizar en segundo plano
  event.respondWith(
    caches.open(CACHE_STATICOS).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    )
  );
});
