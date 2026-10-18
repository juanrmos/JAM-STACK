const CACHE_STATICOS = "estaticos-v3";
const CACHE_PAGINAS = "paginas-v3";
const PREFIXES_API = ["/api/", "/admin/api/"];
const HASHED_ASSET = /\.[a-z\d_-]{8,}\.(?:m?js|css|woff2?|svg|png|jpe?g|webp|avif)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("estaticos-v") || key.startsWith("paginas-v")) &&
              key !== CACHE_STATICOS &&
              key !== CACHE_PAGINAS
          )
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || request.method !== "GET") return;

  if (
    PREFIXES_API.some((prefix) => url.pathname.startsWith(prefix)) ||
    request.headers.get("X-PWA-Version-Check") === "1"
  ) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_PAGINAS);
        try {
          const response = await fetch(request, { cache: "no-cache" });
          if (response.ok && (response.type === "basic" || response.type === "default")) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (await cache.match(request)) || Response.error();
        }
      })()
    );
    return;
  }

  const isHashedAsset = url.pathname.startsWith("/_astro/") && HASHED_ASSET.test(url.pathname);
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_STATICOS);
      const cachedResponse = await cache.match(request);
      if (isHashedAsset && cachedResponse) return cachedResponse;

      try {
        const response = await fetch(request);
        if (response.ok && (response.type === "basic" || response.type === "default")) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cachedResponse || Response.error();
      }
    })()
  );
});
