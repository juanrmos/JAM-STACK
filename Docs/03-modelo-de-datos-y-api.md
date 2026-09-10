# 03 — Modelo de Datos y Contrato de API

## 1. Esquema de D1

### Tabla `obras`

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | TEXT (UUID) | No | Identificador único de la obra |
| `titulo` | TEXT | No | Título de la obra |
| `descripcion` | TEXT | Sí | Descripción breve |
| `categoria` | TEXT | Sí | Ej: "mural", "cuadro", "escultura" — usar valores controlados, no texto libre, para permitir filtros en la galería |
| `imagen_key` | TEXT | No | Key del objeto en R2 (no la URL completa — se resuelve al servir) |
| `video_url` | TEXT | Sí | Link completo del video de YouTube (no listado), si la obra tiene uno asociado |
| `orden` | INTEGER | No | Orden de visualización en la galería (menor = primero) |
| `destacado` | BOOLEAN | No, default `false` | Si debe aparecer en una sección destacada de portada |
| `fecha_creacion` | TEXT (ISO 8601) | No | Fecha de subida, generada por el Worker, no por el cliente |

### Tabla `precios`

*(Nota: **Fuera de alcance v1 / Futuro**. Esta tabla se documenta como preparación para una versión futura, pero NO se implementa en esta v1).*

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | TEXT (UUID) | No | Identificador único |
| `concepto` | TEXT | No | Ej: "Mural exterior (por m²)" |
| `precio_desde` | TEXT | No | Texto libre (ej: "Desde S/ 150") — no numérico estricto, ya que son precios base referenciales, no un catálogo transaccional |
| `orden` | INTEGER | No | Orden de visualización |

### Tabla `testimonios`

*(Nota: **Fuera de alcance v1 / Futuro**. Esta tabla se documenta como preparación para una versión futura, pero NO se implementa en esta v1).*

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | TEXT (UUID) | No | Identificador único |
| `nombre_cliente` | TEXT | No | Nombre a mostrar (confirmar con cliente si se requiere consentimiento explícito antes de publicar) |
| `texto` | TEXT | No | Contenido del testimonio |
| `orden` | INTEGER | No | Orden de visualización |

## 2. Convención de nombres en R2

Los objetos en R2 deben seguir esta convención de key, para evitar colisiones y facilitar limpieza futura:

```
obras/{id_obra}/{timestamp}-{nombre_original_sanitizado}.{ext}
```

Ejemplo: `obras/8f1e2a3b/1725632000-atardecer-costa.jpg`

No se deben usar nombres de archivo originales sin sanitizar (evitar espacios, caracteres especiales, y colisiones de nombre entre distintas obras).

## 3. Contrato del Worker API

**Convención de rutas (confirmada):** prefijo `/api/`, seguido del nombre del recurso en plural y en español (`/api/obras`, `/api/auth`, etc.). Sin prefijo de versión para v1 — si en el futuro se necesita romper el contrato, se agrega `/api/v2/…` sin tocar las rutas existentes.

**Política de Cloudflare Access:** Los endpoints de escritura/administración deben estar protegidos por una política de Access configurada en Cloudflare. Para acceder a ellos, la aplicación cliente (PWA) debe enviar obligatoriamente los Service Tokens en los headers de cada petición:
- `CF-Access-Client-Id: <id>`
- `CF-Access-Client-Secret: <secret>`

Además de estos headers de Access (primera capa), los endpoints de escritura requieren el header `Authorization: Bearer <token>` (JWT - segunda capa).

### `POST /api/auth/login`
- **Auth:** No (endpoint de login inicial)
- **Body:** credencial del único usuario administrador (definir mecanismo exacto en implementación — recomendado: secreto compartido de alta entropía, no usuario/contraseña tradicional, dado que es un solo usuario)
- **Respuesta:** JWT de vida corta (recomendado: 1 hora, con refresh)

### `POST /api/obras/upload-url`
- **Auth:** Sí
- **Body:** `{ "nombreArchivo": string, "tipoMime": string }`
- **Respuesta:** `{ "uploadUrl": string, "imagenKey": string, "expiraEn": number }`
- **Descripción:** genera la URL firmada de un solo uso hacia R2. La app sube el archivo directo a esa URL, sin pasar el binario por el Worker.

### `POST /api/obras`
- **Auth:** Sí
- **Body:** `{ "titulo": string, "descripcion"?: string, "categoria"?: string, "imagenKey": string, "videoUrl"?: string, "orden": number, "destacado"?: boolean }`
- **Respuesta:** `{ "id": string }`
- **Descripción:** crea el registro de metadata en D1, una vez que la foto ya fue subida a R2 usando la `uploadUrl` del endpoint anterior.

### `GET /api/obras`
- **Auth:** No (lectura pública)
- **Query params opcionales:** `?categoria=`, `?destacado=true`
- **Respuesta:** lista de obras con URLs de imagen ya resueltas (el Worker convierte `imagen_key` en una URL pública servible, no expone la estructura interna de R2)

### `PUT /api/obras/:id` y `DELETE /api/obras/:id`
- **Auth:** Sí
- **Descripción:** edición y eliminación de una obra existente. El Worker debe también eliminar el objeto correspondiente en R2 al hacer `DELETE`, para no dejar archivos huérfanos.

### `GET /api/precios` y `GET /api/testimonios`

*(Nota: **Fuera de alcance v1 / Futuro**. Estos endpoints se documentan como preparación para una versión futura, pero NO se implementan en esta v1).*

- **Auth:** No (lectura pública)
- **Descripción:** análogos a `GET /api/obras`, para las secciones de lista de precios y testimonios.

### Endpoints de escritura para `precios` y `testimonios`

*(Nota: **Fuera de alcance v1 / Futuro**. Estos endpoints se documentan como preparación para una versión futura, pero NO se implementan en esta v1).*

- Mismos verbos y patrón de autenticación que `obras` (`POST`, `PUT`, `DELETE` bajo `/api/precios` y `/api/testimonios`), sin necesidad de `upload-url` ya que no involucran archivos binarios.

## 4. Validación de datos

Todo payload de escritura debe validarse en el Worker antes de tocar D1 (se recomienda usar una librería de schema validation como Zod, consistente con la validación ya usada en Astro Content Collections si se conserva esa pieza para contenido no dinámico). Ningún campo debe insertarse sin validar tipo y presencia según lo definido en las tablas de la sección 1.
