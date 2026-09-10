# 05 — Sistema de Diseño y Componentes

**Extiende:** `04-stack-y-parametrizacion.md` (estructura de carpetas y `siteConfig` base ya definidos ahí, no se repiten aquí).

## 1. Propósito de este documento

Este documento especifica **cómo se traduce el diseño visual en código parametrizable** — los tokens de diseño, la regla de construcción de componentes, y el patrón que permite activar/desactivar secciones sin tocar código. No repite la estructura de carpetas ni el archivo `site.ts` ya definidos en `04`; los **extiende**.

## 2. Sistema de tokens de diseño

Todo valor visual (color, tipografía, espaciado, radio de bordes) vive en un único archivo de tokens — ningún componente debe tener un valor hardcodeado.

```typescript
// src/config/tokens.ts
export const tokens = {
  color: {
    fondo: "#F9F9F7",
    texto: "#2F4F4F",
    primario: "#DAA520",       // reservado para CTAs y acentos puntuales, no fondo decorativo
    acentoSecundario: "#B0C4DE",
  },
  tipografia: {
    display: "'Newsreader', serif",      // títulos, nombres de obra
    cuerpo: "'General Sans', sans-serif", // descripciones, precios, testimonios
    escala: {
      h1: "clamp(2.5rem, 5vw, 4rem)",
      h2: "2rem",
      cuerpo: "1rem",
    },
  },
  espaciado: {
    seccion: "6rem",   // separación entre secciones — generoso, evita saturación visual
    tarjeta: "1.5rem",
  },
  radio: "4px",
};
```

Estos tokens se inyectan como variables CSS en `LayoutBase.astro` en build time (vía `define:vars`), y cada componente los consume con `var(--nombreDelToken)` — nunca un valor hex o `px` suelto dentro de un componente.

## 3. Regla de construcción de componentes

Ningún componente busca sus propios datos ni los tiene escritos adentro — todo entra por `props`. Esto separa "cómo se ve" de "de dónde viene el dato", y permite reemplazar la fuente de datos sin tocar el componente visual.

| Componente | Responsabilidad | Fuente de datos |
|---|---|---|
| `LayoutBase.astro` | Dueño del `<head>`, inyecta los tokens globales, envuelve nav/footer | `tokens.ts` |
| `Hero.astro` | Título, subtítulo, tono de marca | `siteConfig` (ver `04`) |
| `Galeria.astro` | Renderiza el mosaico editorial de obras | API de lectura pública (ver `03`) |
| `TarjetaObra.astro` | Una obra individual dentro del mosaico; recibe `destacado` como prop para ajustar su tamaño | Prop recibido desde `Galeria.astro` |
| `ListaPrecios.astro` | Lista de conceptos y precios base | API de lectura pública (ver `03`) |
| `Testimonios.astro` | Lista de testimonios de clientes | API de lectura pública (ver `03`) |
| `BotonWhatsapp.astro` | Link `wa.me` con mensaje prellenado | `siteConfig` |
| `FormaGeometrica.astro` | Elemento decorativo de marca (polígono facetado), reemplaza el blob orgánico del mockup original | `tokens.ts` (usa `acentoSecundario`) |

## 4. Patrón de secciones activables

La página principal decide qué secciones existen leyendo los toggles ya definidos en `siteConfig.secciones` (ver `01` y `04`) — apagar o prender una sección completa es una sola línea de configuración, sin riesgo de romper el resto del layout:

```astro
---
import { siteConfig } from '../config/site';
import LayoutBase from '../layouts/LayoutBase.astro';
import Hero from '../components/Hero.astro';
import Galeria from '../components/Galeria.astro';
import ListaPrecios from '../components/ListaPrecios.astro';
import Testimonios from '../components/Testimonios.astro';
import BotonWhatsapp from '../components/BotonWhatsapp.astro';
---
<LayoutBase>
  <Hero />
  {siteConfig.secciones.galeria && <Galeria />}
  {siteConfig.secciones.listaPrecios && <ListaPrecios />}
  {siteConfig.secciones.testimonios && <Testimonios />}
  <BotonWhatsapp />
</LayoutBase>
```

## 5. Principios de diseño acordados

Estas son restricciones de diseño ya decididas — quien implemente no debe desviarse de ellas sin que el cliente lo apruebe explícitamente:

1. **Tipografía:** Newsreader (display) + General Sans (cuerpo). Se descartaron explícitamente los defaults genéricos (Playfair Display, Didot, Inter) por ser los más repetidos en diseños automatizados/plantillas — esta pareja refuerza "rigor profesional" por sobre "calidez artesanal genérica".
2. **Elemento decorativo de marca:** una forma geométrica/angular (tipo polígono facetado), no orgánica — reemplaza el "blob" del mockup original en Builder, para mantener consistencia con la dirección tipográfica seria/editorial.
3. **Layout de galería:** mosaico editorial, no cuadrícula uniforme de tarjetas idénticas. Las obras con `destacado: true` (ver esquema en `03`) ocupan mayor espacio visual, rompiendo la monotonía de catálogo genérico.
4. **Uso del color primario (`#DAA520`):** reservado para CTAs y acentos puntuales (botón de WhatsApp, links activos) — nunca como fondo decorativo extendido ni relleno de tarjetas.
5. **Densidad visual:** espacio generoso entre secciones y elementos (ver `tokens.espaciado.seccion`) — evita la sensación de catálogo saturado, coherente con el posicionamiento de "exclusividad".
6. **Evitar clichés de diseño genérico:** sin tarjetas con sombra + esquinas muy redondeadas tipo SaaS, sin eyebrows en mayúsculas, sin numeración de pasos (01/02/03) en contenido que no es secuencial (la lista de precios y los testimonios no lo son).

## 6. Pendientes de diseño — aún no resueltos

- [ ] **Comportamiento de la galería en móvil:** cómo se adapta el mosaico editorial (con tamaños variables por obra destacada) a una sola columna en pantallas pequeñas, sin perder la jerarquía visual que lo distingue de una cuadrícula uniforme.
- [ ] **Tratamiento de marco/borde de las fotos:** si las imágenes de las obras llevan algún borde, marco, o tratamiento visual (ej. sombra sutil, línea fina) o se muestran a sangre completa sin ningún marco — pendiente de definir junto con el cliente.
