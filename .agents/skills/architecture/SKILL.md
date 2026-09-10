---
nombre: tokens-diseno-componentes-parametrizables
descripcion: Práctica reutilizable para estructurar cualquier proyecto frontend de forma que cambiar colores, textos, tipografía o qué secciones existen no requiera tocar componentes. Aplica sin importar el framework — no es específico de un proyecto.
---

# Skill: Tokens de diseño y componentes parametrizables

## Cuándo usar este skill

Úsalo en cualquier proyecto frontend donde se espere que el diseño (colores, tipografía, textos) o la composición de secciones cambien con el tiempo — que es prácticamente todo proyecto real. No depende del framework (Astro, React, Vue, HTML plano) — el principio es estructural, no de sintaxis.

## Principio 1 — Todo valor visual vive en un único archivo de tokens

Ningún componente debe tener un color, tamaño de fuente, espaciado, o radio de borde escrito directo en su código. Todo valor visual se define **una sola vez**, en un archivo central de tokens, agrupado por categoría:

```
tokens = {
  color: { fondo, texto, primario, acentoSecundario, ... },
  tipografia: { display, cuerpo, escala: { h1, h2, cuerpo } },
  espaciado: { seccion, tarjeta, ... },
  radio: valor,
}
```

**Por qué:** cambiar la identidad visual completa del proyecto se reduce a editar un archivo y reconstruir — nunca a buscar y reemplazar valores repetidos por todos los componentes, con el riesgo de olvidar alguno.

## Principio 2 — Los tokens se inyectan, no se importan sueltos

En el punto de entrada/layout base del proyecto, los tokens se convierten en variables consumibles globalmente (variables CSS, tema de un sistema de diseño, o el mecanismo equivalente del framework usado). Cada componente los consume por referencia (`var(--nombre-token)` o equivalente), nunca copiando el valor literal.

## Principio 3 — Nomenclatura semántica, no descriptiva del valor

Nombra los tokens por su **rol** (`primario`, `acentoSecundario`, `fondo`) nunca por su valor visual literal (`amarillo`, `azul`). Si mañana el color primario cambia de ocre a verde, un token llamado `primario` sigue teniendo sentido; uno llamado `ocre` ya no.

## Principio 4 — Ningún componente busca ni hardcodea sus propios datos

Todo componente de presentación recibe sus datos por parámetros/props — nunca importa directamente una fuente de datos, ni tiene contenido de negocio escrito en su código. Esto aplica tanto a datos que vienen de una API/base de datos como a textos de configuración general del sitio.

Esto separa dos preguntas que no deben mezclarse:
- **"¿Cómo se ve esto?"** → responsabilidad del componente.
- **"¿De dónde viene el dato?"** → responsabilidad de quien llama al componente, no del componente mismo.

## Principio 5 — Configuración de sitio separada de contenido dinámico

Distingue explícitamente dos tipos de fuente de datos, y no las mezcles en el mismo archivo:

- **Configuración del sitio** (nombre del negocio, número de contacto, textos fijos, colores, qué secciones existen) → vive en un archivo de configuración central, versionado junto al código.
- **Contenido dinámico** (lo que un cliente/usuario sube o edita con frecuencia) → vive en una base de datos o CMS, nunca en el mismo archivo que la configuración.

## Principio 6 — Secciones activables mediante flags de configuración

Cuando un proyecto tiene secciones/módulos que pueden existir o no según el cliente o la fase del proyecto, represéntalos como banderas booleanas en el archivo de configuración central, y condiciona su renderizado en el punto de composición de la página — nunca comentando/descomentando código, ni borrando y reescribiendo componentes.

```
secciones: { galeria: true, biografia: false, listaPrecios: true }
```

```
{secciones.galeria && <Galeria />}
{secciones.biografia && <Biografia />}
```

**Por qué:** activar o desactivar una sección completa se vuelve una sola línea de configuración, sin riesgo de romper el resto del layout ni dejar código muerto a medio comentar.

## Principio 7 — Evitar el look genérico por defecto

Antes de fijar una paleta y tipografía, verificar que la combinación elegida no coincida con los patrones más repetidos y reconocibles como "plantilla genérica" del momento (ej. ciertas combinaciones de fuente serif + acento cálido que se volvieron el default de facto en diseños automatizados). Si la paleta ya está definida por otra razón (aprobación de cliente, identidad de marca previa), compensar la diferenciación en tipografía y layout, no en el color.

## Checklist rápido antes de dar por bien estructurado un proyecto frontend

- [ ] ¿Existe un único archivo de tokens de diseño, o los valores están repetidos en varios componentes?
- [ ] ¿Los nombres de los tokens son semánticos (por rol) o descriptivos del valor literal?
- [ ] ¿Algún componente importa datos de negocio directamente, en vez de recibirlos por props?
- [ ] ¿La configuración del sitio y el contenido dinámico están mezclados en el mismo archivo?
- [ ] ¿Activar/desactivar una sección requiere comentar código, o es un cambio de configuración?
- [ ] ¿Se revisó la paleta/tipografía elegida contra los patrones de diseño genérico más comunes del momento?

---

## Implementación de referencia (Astro + TypeScript)

Estructura de archivos exacta:

```
src/
├── config/
│   ├── tokens.ts
│   └── site.ts
├── layouts/
│   └── LayoutBase.astro
├── components/
│   ├── Hero.astro
│   ├── SeccionCondicional.astro
│   └── TarjetaGenerica.astro
└── pages/
    └── index.astro
```

### Principio 1 y 3 aplicados — `src/config/tokens.ts`

```typescript
export const tokens = {
  color: {
    fondo: "#F9F9F7",
    texto: "#2F4F4F",
    primario: "#DAA520",
    acentoSecundario: "#B0C4DE",
  },
  tipografia: {
    display: "'NombreDisplay', serif",
    cuerpo: "'NombreCuerpo', sans-serif",
    escala: {
      h1: "clamp(2.5rem, 5vw, 4rem)",
      h2: "2rem",
      cuerpo: "1rem",
    },
  },
  espaciado: {
    seccion: "6rem",
    tarjeta: "1.5rem",
  },
  radio: "4px",
} as const;
```

### Principio 5 aplicado — `src/config/site.ts` (separado de `tokens.ts`)

```typescript
export const siteConfig = {
  contacto: {
    whatsapp: "",
    mensajePredeterminado: "",
  },
  secciones: {
    galeria: true,
    biografia: false,
    listaPrecios: true,
    testimonios: true,
  },
} as const;
```

### Principio 2 aplicado — inyección de tokens como variables CSS en el layout base

```astro
---
// src/layouts/LayoutBase.astro
import { tokens } from "../config/tokens";
---
<html lang="es">
  <head>
    <style define:vars={{
      colorFondo: tokens.color.fondo,
      colorTexto: tokens.color.texto,
      colorPrimario: tokens.color.primario,
      colorAcento: tokens.color.acentoSecundario,
      fontDisplay: tokens.tipografia.display,
      fontCuerpo: tokens.tipografia.cuerpo,
      espaciadoSeccion: tokens.espaciado.seccion,
      radioBase: tokens.radio,
    }}>
      :root {
        --color-fondo: var(--colorFondo);
        --color-texto: var(--colorTexto);
        --color-primario: var(--colorPrimario);
        --color-acento: var(--colorAcento);
        --font-display: var(--fontDisplay);
        --font-cuerpo: var(--fontCuerpo);
        --espaciado-seccion: var(--espaciadoSeccion);
        --radio-base: var(--radioBase);
      }
      body {
        background: var(--color-fondo);
        color: var(--color-texto);
        font-family: var(--font-cuerpo);
      }
    </style>
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Principio 4 aplicado — componente que solo recibe props, nunca busca sus datos

```astro
---
// src/components/TarjetaGenerica.astro
interface Props {
  titulo: string;
  descripcion?: string;
  imagenUrl: string;
  destacado?: boolean;
}
const { titulo, descripcion, imagenUrl, destacado = false } = Astro.props;
---
<article class:list={["tarjeta", { "tarjeta--destacada": destacado }]}>
  <img src={imagenUrl} alt={titulo} />
  <h3>{titulo}</h3>
  {descripcion && <p>{descripcion}</p>}
</article>

<style>
  .tarjeta {
    border-radius: var(--radio-base);
    padding: 1rem;
  }
  .tarjeta--destacada {
    grid-column: span 2;
    grid-row: span 2;
  }
</style>
```

Quien use este componente (ej. una lista que itera sobre resultados de una API) le pasa los datos por atributo — el componente en sí no sabe ni le importa de dónde vinieron:

```astro
{items.map((item) => (
  <TarjetaGenerica
    titulo={item.titulo}
    imagenUrl={item.imagenUrl}
    destacado={item.destacado}
  />
))}
```

### Principio 6 aplicado — `src/pages/index.astro`

```astro
---
import { siteConfig } from "../config/site";
import LayoutBase from "../layouts/LayoutBase.astro";
import Hero from "../components/Hero.astro";
---
<LayoutBase>
  <Hero />
  {siteConfig.secciones.galeria && <Galeria />}
  {siteConfig.secciones.listaPrecios && <ListaPrecios />}
  {siteConfig.secciones.testimonios && <Testimonios />}
</LayoutBase>
```

