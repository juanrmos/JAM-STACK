# 04 — Stack Tecnológico y Parametrización

## 1. Stack elegido

| Capa | Tecnología | Justificación breve |
|---|---|---|
| Framework de frontend | **Astro** | Genera HTML estático en build time, arquitectura de islas (mínimo JS enviado al navegador), ideal para sitios con muchas imágenes donde el rendimiento importa |
| Lenguaje | **TypeScript** | Tipado estático reduce errores de integración con el contrato de API definido en `03` |
| Estilos | CSS con variables (design tokens) — evaluar Tailwind si se requiere velocidad de desarrollo, pero no es obligatorio para este alcance | Los tokens de color de `01` deben implementarse como variables CSS, no valores sueltos |
| Hosting | **Cloudflare Pages** | Gratis, CDN global incluido, deploy automático vía Git |
| Backend mínimo | **Cloudflare Workers** | Gratis en el tier necesario, mismo ecosistema que Pages/R2/D1 |
| Base de datos | **Cloudflare D1** | Gratis, SQL, suficiente para el volumen de este proyecto |
| Almacenamiento de archivos | **Cloudflare R2** | Gratis hasta 10GB, sin cargos de egress |
| Interfaz de subida del cliente | **PWA** (recomendado) o app nativa (React Native/Flutter) — decisión pendiente de confirmar, ver `02` sección 6 | PWA evita costos de tienda de aplicaciones |
| Video | **YouTube** (no listado) | Gratis, sin límites de cuota, streaming adaptativo incluido |

## 2. Estructura de carpetas del proyecto Astro

```
portafolio-arte/
├── src/
│   ├── pages/
│   │   ├── index.astro              ← página principal (hero + galería + contacto)
│   ├── components/
│   │   ├── Galeria.astro            ← consume /api/obras del Worker
│   │   ├── TarjetaObra.astro
│   │   ├── BotonWhatsapp.astro
│   │   └── VideoEmbed.astro         ← recibe video_url, arma el iframe de YouTube
│   │   // Nota: ListaPrecios.astro y Testimonios.astro están fuera de alcance para v1. Se agregarán en el futuro si se activa la sección.
│   ├── layouts/
│   │   └── LayoutBase.astro
│   └── config/
│       └── site.ts                  ← configuración central, ver sección 3
├── public/
├── astro.config.mjs
└── package.json

worker/                              ← proyecto separado del Worker API (no vive dentro de Astro)
├── src/
│   ├── index.ts                     ← router principal
│   ├── auth.ts                      ← verificación de JWT
│   ├── obras.ts                     ← handlers de /api/obras/*
│   │   // Nota: precios.ts y testimonios.ts están fuera de alcance para v1. Se agregarán en el futuro si se activa la sección.
├── schema.sql                       ← definición de tablas D1 (ver 03)
└── wrangler.toml                    ← configuración de bindings a D1 y R2
```

## 3. Configuración central (parametrización)

Todo lo que pueda cambiar sin requerir lógica nueva debe vivir en un único archivo de configuración, no repartido entre componentes:

```typescript
// src/config/site.ts
export const siteConfig = {
  artista: {
    nombreEstudio: "Corporacion Antony Rodriguez", // nombre comercial confirmado
    estilo: ["Exclusividad", "Excelencia plástica", "Rigor profesional"],
  },
  contacto: {
    whatsapp: "", // pendiente: número real del cliente
    mensajeCotizacion:
      "Hola, quiero cotizar un mural. Te comparto: [foto del lugar], [m² aprox], [interior o exterior], [piso/altura]",
  },
  secciones: {
    galeria: true,
    biografia: false,       // confirmado: sin biografía
    listaPrecios: false,    // fuera de alcance v1
    testimonios: false,     // fuera de alcance v1
  },
  colores: {
    fondo: "#F9F9F7",
    texto: "#2F4F4F",
    primario: "#DAA520",
    acentoSecundario: "#B0C4DE",
  },
  api: {
    baseUrl: "", // pendiente: URL del Worker desplegado
  },
};
```

**Regla de implementación:** ningún componente debe importar valores de color, texto de contacto, o toggles de sección de otra fuente que no sea `siteConfig`. Si un componente necesita un dato de este archivo, lo importa explícitamente — no se duplica el valor en el componente.

## 4. i18n — preparado pero no implementado

Decisión confirmada en la sesión de requisitos: **no se implementa multi-idioma en esta versión**, ya que no hay evidencia de que los clientes del estudio requieran otro idioma que español.

Para no bloquear una expansión futura, la estructura de páginas debe evitar acoplar texto directamente en los componentes de layout — los textos de UI (no el contenido dinámico de D1) deben pasar por un diccionario simple desde el inicio:

```typescript
// src/i18n/es.ts
export default {
  hero: { titulo: "..." },
  galeria: { titulo: "Obras" },
  precios: { titulo: "Precios" },
  testimonios: { titulo: "Lo que dicen nuestros clientes" },
};
```

Si en el futuro se requiere un segundo idioma, se agrega `src/i18n/en.ts` y las rutas `src/pages/en/*` siguiendo el soporte nativo de i18n de Astro — sin necesidad de reescribir componentes existentes.

## 5. Pendientes a confirmar antes de iniciar implementación

- [ ] Número de WhatsApp real del cliente (`siteConfig.contacto.whatsapp`).
- [x] Nombre comercial definitivo: «Corporacion Antony Rodriguez» (`siteConfig.artista.nombreEstudio`).
- [ ] Decisión final: app nativa vs. PWA (ver `02`, sección 6).
- [ ] Copy final del mensaje de WhatsApp prellenado (aprobar redacción con el cliente).
- [ ] Confirmar si los testimonios requieren consentimiento explícito del cliente citado antes de publicarse.
