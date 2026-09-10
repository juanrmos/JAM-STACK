---
name: pwa-sin-friccion
description: >
  Configurar una Progressive Web App (manifest, service worker, prompt de
  instalación, actualización de versión) que se sienta equivalente a una app
  nativa. Usar cuando el proyecto requiera una interfaz instalable desde el
  celular sin publicarla en App Store/Play Store, sobre cualquier generador
  estático (Astro, Vite, Next export, etc.). No es específico de ningún
  dominio de negocio.
---

# Skill: PWA sin fricción

## Cuándo usar este skill

Cuando un proyecto necesita que un usuario instale la web en su pantalla de inicio y la use como una app, sin pasar por tiendas de aplicaciones ni sus costos de distribución. Los fragmentos de código de abajo son de referencia directa — ajustar nombres/rutas al proyecto real, pero la estructura y lógica se mantienen igual sin importar el dominio de negocio.

## Estructura de archivos exacta

```
public/
├── manifest.json
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-maskable-512.png
└── sw.js
src/
└── lib/
    └── pwa/
        ├── registerServiceWorker.ts
        ├── installPrompt.ts
        └── updateNotifier.ts
```

## Paso 1 — `public/manifest.json`

```json
{
  "name": "Nombre completo de la app",
  "short_name": "Nombre corto",
  "description": "Descripción breve de una línea",
  "start_url": "<ruta-de-la-interfaz-privada>",
  "scope": "<ruta-de-la-interfaz-privada>",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Nota:** `scope` y `start_url` deben apuntar a la ruta real de la interfaz privada del proyecto, no a la raíz del sitio público, si la PWA es solo para una sección específica.

## Paso 2 — Enlazar el manifest y los metadatos de iOS en el layout base

Safari/iOS **no lee `manifest.json` para los íconos** — necesita etiquetas propias además del link al manifest:

```html
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="theme-color" content="#ffffff" />
```

## Paso 3 — `public/sw.js` (service worker con dos estrategias de caché)

Los archivos estáticos (CSS, JS, íconos) usan *stale-while-revalidate* (responder rápido desde caché, actualizar en segundo plano). Las llamadas a la API nunca se cachean agresivamente — el contenido cambia y el usuario necesita ver datos frescos:

```javascript
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
  // Reemplazar "/api/" por el prefijo real que use el proyecto
  if (url.pathname.startsWith("<prefijo-de-la-api>")) {
    event.respondWith(fetch(event.request));
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
```

## Paso 4 — `src/lib/pwa/registerServiceWorker.ts`

```typescript
export function registrarServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js");
    });
  }
}
```

## Paso 5 — `src/lib/pwa/installPrompt.ts` (botón propio de instalación)

El navegador dispara `beforeinstallprompt` y por defecto lo maneja él solo — pero para controlar el momento y el diseño del botón, hay que interceptarlo:

```typescript
let eventoDiferido: any = null;

export function inicializarInstallPrompt(botonId: string) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    eventoDiferido = event;
    const boton = document.getElementById(botonId);
    if (boton) boton.hidden = false;
  });

  document.getElementById(botonId)?.addEventListener("click", async () => {
    if (!eventoDiferido) return;
    eventoDiferido.prompt();
    await eventoDiferido.userChoice;
    eventoDiferido = null;
  });
}
```

**Nota crítica sobre iOS:** Safari **nunca dispara** `beforeinstallprompt`. En iOS, instalar es manual: el usuario debe usar el botón de compartir → "Agregar a inicio". Si se detecta iOS (`/iPhone|iPad|iPod/.test(navigator.userAgent)` combinado con verificar que no esté ya en modo standalone), mostrar instrucciones de texto en vez de un botón que nunca se activaría.

## Paso 6 — `src/lib/pwa/updateNotifier.ts` (evitar que quede una versión vieja atascada)

Sin esto, un usuario puede quedarse usando una versión vieja de la PWA indefinidamente, porque el navegador no la actualiza sola mientras la pestaña siga abierta:

```typescript
export function notificarActualizaciones(alDetectarNueva: () => void) {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registro) => {
    registro.addEventListener("updatefound", () => {
      const nuevoWorker = registro.installing;
      nuevoWorker?.addEventListener("statechange", () => {
        if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
          alDetectarNueva(); // ej: mostrar un banner "hay una versión nueva, recarga"
        }
      });
    });
  });
}
```

## Principios que sostienen las plantillas de arriba

1. **Las llamadas a la API nunca se cachean como estáticos** — un service worker mal configurado puede hacer que el usuario vea datos viejos creyendo que están actualizados. Esto es más grave que no tener caché en absoluto.
2. **iOS se trata como un caso aparte, siempre** — no existe una sola implementación que funcione igual en Android e iOS; hay que detectar la plataforma y dar una ruta de instalación distinta.
3. **Actualizar en segundo plano no es automático** — sin el listener de `updatefound`, un usuario puede quedar atascado en una versión vieja de la app mientras no cierre y reabra el navegador por completo.
4. **El almacenamiento del token de sesión no va dentro del caché del service worker** — usar `localStorage`, `sessionStorage`, o `IndexedDB` según el nivel de persistencia necesario, nunca la Cache API (que está pensada para respuestas HTTP, no para secretos de sesión).

## Checklist rápido antes de dar por lista una PWA

- [ ] ¿El manifest tiene los 3 tamaños de ícono, incluyendo la variante `maskable`?
- [ ] ¿Están las etiquetas `apple-touch-icon` y `apple-mobile-web-app-capable` además del link al manifest?
- [ ] ¿El service worker excluye explícitamente las rutas de API de cualquier estrategia de caché agresiva?
- [ ] ¿Hay una ruta de instalación separada y documentada para iOS (ya que `beforeinstallprompt` no existe ahí)?
- [ ] ¿Existe un mecanismo que avise al usuario cuando hay una versión nueva disponible?
- [ ] ¿El token de sesión se guarda fuera de la Cache API del service worker?
