---
nombre: estructura-proyecto-jamstack-worker
descripcion: Práctica reutilizable para organizar un proyecto donde el frontend estático (ej. Astro) y el backend serverless (ej. Cloudflare Worker) son piezas separadas que se despliegan de forma independiente. Aplica a cualquier proyecto que elija este stack, sin importar el dominio de negocio.
---

# Skill: Estructura de proyecto Jamstack + Worker

## Cuándo usar este skill

Úsalo cuando un proyecto combina un frontend estático (generado en build time, servido por un CDN) con un backend serverless mínimo (funciones que responden JSON, sin servidor persistente). No es específico de ningún dominio de negocio — aplica igual a un blog, una tienda pequeña, o un panel administrativo.

## Principio 1 — Frontend y backend son proyectos separados, no un monolito

Aunque vivan en el mismo repositorio, el frontend (Astro u otro generador estático) y el backend (Worker) deben tratarse como **dos unidades desplegables independientes**, cada una con su propio ciclo de build y su propio archivo de configuración de despliegue. Nunca mezclar código de Worker dentro de la carpeta de páginas del frontend, ni al revés.

```
proyecto/
├── frontend/                 ← proyecto del generador estático
│   ├── src/
│   ├── astro.config.mjs (o equivalente)
│   └── package.json
├── backend/                  ← proyecto del Worker
│   ├── src/
│   ├── wrangler.toml (o equivalente de configuración serverless)
│   └── package.json
└── README.md
```

**Por qué:** permite desplegar un cambio de diseño sin tocar el backend, y viceversa — reduce el radio de impacto de cada cambio y evita builds innecesariamente lentos.

## Principio 2 — El contrato de API es la única frontera entre ambos

Frontend y backend nunca comparten código de implementación directamente. Lo único que los conecta es un **contrato de API documentado** (rutas, formas de request/response, códigos de error) — ver el documento de especificación del proyecto para el contrato real. Si ambos proyectos viven en el mismo repositorio, es válido compartir únicamente **tipos/interfaces** de las formas de datos (no lógica), para que el frontend no pueda mandar payloads mal formados por error de tipeo.

## Principio 3 — Nunca credenciales ni secretos dentro del código versionado

- Los secretos del backend (claves de firma, credenciales de terceros) se configuran mediante el mecanismo de secretos del proveedor serverless (ej. `wrangler secret put`), nunca escritos en un archivo que se sube al repositorio.
- Los valores públicos que el frontend sí necesita en build time (ej. la URL base de la API) se manejan como variables de entorno de build, documentadas en un archivo de ejemplo (`.env.example`) sin valores reales.
- Un archivo `.gitignore` debe excluir explícitamente cualquier archivo de variables de entorno con valores reales.

## Principio 4 — Entorno de desarrollo local espeja la separación de producción

Al desarrollar localmente, ambos proyectos corren como procesos separados (el generador estático en modo desarrollo, el Worker en su propio servidor de desarrollo local), y el frontend apunta al backend local mediante una variable de entorno configurable — nunca una URL de backend hardcodeada que solo funcione en un entorno.

## Principio 5 — Los despliegues son independientes y no bloqueantes entre sí

Un cambio en el frontend no debe requerir redesplegar el backend, y viceversa, salvo que el contrato de API haya cambiado. Si el proveedor de hosting del frontend soporta despliegue automático por push a un repositorio, debe configurarse apuntando únicamente a la carpeta del frontend — un cambio en la carpeta del backend no debe disparar un rebuild innecesario del frontend, ni viceversa.

## Principio 6 — Cambios al contrato de API son intencionales y versionados en la conversación del equipo

Si un cambio al backend modifica la forma de una respuesta o requiere un nuevo campo obligatorio, debe tratarse como un cambio de contrato explícito (documentado, no silencioso) — el frontend que ya está desplegado no debe romperse por un cambio de backend no coordinado. Preferir agregar campos opcionales antes que modificar o eliminar campos existentes sin una transición.

## Checklist rápido antes de dar por bien estructurado un proyecto Jamstack + Worker

- [ ] ¿El código del frontend y del backend están claramente separados en carpetas/proyectos distintos?
- [ ] ¿Existe un contrato de API documentado como única frontera entre ambos?
- [ ] ¿Hay algún secreto o credencial escrito directamente en un archivo versionado?
- [ ] ¿El entorno local permite correr ambos proyectos por separado, apuntando el uno al otro mediante configuración, no hardcodeo?
- [ ] ¿Un cambio en un proyecto obliga a redesplegar el otro innecesariamente?
- [ ] ¿Los cambios al contrato de API se documentan explícitamente antes de implementarse?

---

## Implementación de referencia (Astro + Cloudflare Worker, monorepo con npm workspaces)

Estructura de archivos exacta:

```
proyecto/
├── frontend/
│   ├── src/
│   ├── astro.config.mjs
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.toml
│   ├── .dev.vars.example
│   └── package.json
├── tipos-compartidos/
│   ├── obra.ts
│   └── package.json
├── package.json
└── .gitignore
```

### Principio 1 aplicado — `package.json` raíz con workspaces

```json
{
  "name": "proyecto",
  "private": true,
  "workspaces": ["frontend", "backend", "tipos-compartidos"],
  "scripts": {
    "dev": "npm run dev --workspace=backend & npm run dev --workspace=frontend",
    "build:frontend": "npm run build --workspace=frontend",
    "deploy:backend": "npm run deploy --workspace=backend"
  }
}
```

### Principio 2 aplicado — `tipos-compartidos/obra.ts`

Solo tipos, cero lógica — lo único que ambos proyectos importan del otro lado:

```typescript
export interface Obra {
  id: string;
  titulo: string;
  descripcion?: string;
  categoria: string;
  imagenUrl: string;
  videoUrl?: string;
  orden: number;
  destacado: boolean;
}

export interface ErrorApi {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: Record<string, string>;
  };
}
```

Ambos proyectos lo referencian igual:
```typescript
import type { Obra } from "tipos-compartidos/obra";
```

### Principio 3 aplicado — variables de entorno, nunca secretos versionados

```bash
# frontend/.env.example (sí se versiona, sin valores reales)
PUBLIC_API_BASE_URL=http://localhost:8787
```

```bash
# backend/.dev.vars.example (sí se versiona, sin valores reales)
JWT_SECRET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
```

```
# .gitignore (raíz)
frontend/.env
backend/.dev.vars
node_modules/
dist/
```

En producción, los secretos del backend se cargan con:
```bash
wrangler secret put JWT_SECRET
```

### Principio 4 aplicado — desarrollo local espejando la separación real

```bash
# backend/package.json
{
  "scripts": {
    "dev": "wrangler dev --port 8787"
  }
}
```

```bash
# frontend/package.json
{
  "scripts": {
    "dev": "astro dev"
  }
}
```

El frontend nunca hardcodea `localhost:8787` — lo lee de `PUBLIC_API_BASE_URL` (ver `.env.example` arriba), de modo que el mismo código apunta al Worker local en desarrollo y al Worker real en producción sin cambiar una línea.

### Principio 5 aplicado — `wrangler.toml` con despliegue independiente

```toml
# backend/wrangler.toml
name = "proyecto-backend"
main = "src/index.ts"
compatibility_date = "2026-01-01"

[[d1_databases]]
binding = "DB"
database_name = "proyecto-db"
database_id = "<id-real-aqui>"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "proyecto-archivos"
```

El frontend se despliega vía integración Git de Cloudflare Pages configurada con **Root directory: `frontend`** — así un commit que solo toca `backend/` no dispara un rebuild del frontend, y viceversa (`npm run deploy:backend` es manual/CI separado).

### Principio 6 aplicado — ejemplo de cambio de contrato compatible hacia atrás

```typescript
// Correcto: agregar campo opcional, el frontend viejo sigue funcionando
export interface Obra {
  // ...campos existentes sin tocar
  vistas?: number; // nuevo campo, opcional
}
```

```typescript
// Incorrecto: renombrar o eliminar un campo existente sin transición
export interface Obra {
  nombreObra: string; // rompe a cualquier frontend desplegado que esperaba "titulo"
}
```
