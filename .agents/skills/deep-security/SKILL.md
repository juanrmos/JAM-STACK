---
nombre: seguridad-defensa-en-profundidad
descripcion: Práctica reutilizable para diseñar autenticación y almacenamiento en cualquier API que sirva a un cliente propio (app, PWA, o sitio con panel privado). Aplica sin importar el proveedor de nube — no es específico de un proyecto.
---

# Skill: Defensa en profundidad para APIs propias

## Cuándo usar este skill

Úsalo cada vez que un proyecto necesite exponer un endpoint propio que reciba escrituras autenticadas (subir contenido, editar datos, borrar registros) desde un cliente (app móvil, PWA, o cualquier frontend). No depende de qué proveedor de nube se use — los principios son los mismos en Cloudflare, Oracle, AWS, o cualquier combinación.

## Principio 1 — Ningún endpoint es "privado" por estar escondido

Un endpoint expuesto a internet es alcanzable por cualquiera que conozca (o descubra) su URL, sin importar cuán "privada" sea la distribución del cliente que lo llama (app no publicada en tienda, link no compartido públicamente, nombre de ruta poco obvio). Nunca diseñes la seguridad asumiendo que el endpoint no será encontrado. La única protección real es que el servidor valide correctamente cada petición, sin importar quién la mande.

## Principio 2 — Nunca una sola capa de autenticación

Combina siempre al menos dos capas independientes:

1. **Capa de borde de red:** un mecanismo que rechace tráfico no autorizado antes de que llegue al código de la aplicación (evita que ataques automatizados/oportunistas siquiera ejecuten tu lógica).
2. **Capa de aplicación:** verificación propia (token de sesión de vida corta) dentro del código que procesa la petición, específica del usuario autenticado.

Ninguna de las dos capas es infalible sola — juntas, elevan significativamente el costo de un ataque dirigido, que es el objetivo realista para proyectos de este tamaño.

**Ejemplo de referencia (Cloudflare):** Cloudflare Access con Service Tokens como capa de borde (gratis hasta 50 usuarios) + JWT propio verificado dentro del Worker como capa de aplicación.

**Ejemplo de referencia (Oracle/OCI):** un API Gateway o WAF de OCI restringiendo el tráfico de entrada como capa de borde + verificación de token propia dentro de la función/servicio (ej. ORDS con autenticación OAuth2 client credentials) como capa de aplicación.

## Principio 3 — Separar el almacenamiento de archivos binarios del almacenamiento de metadata

Nunca guardes archivos pesados (imágenes, video, documentos) en la misma base de datos que guarda texto/metadata. Usa:
- Un servicio de almacenamiento de objetos (blob storage) para binarios.
- Una base de datos relacional o de documentos para texto/metadata, incluyendo referencias (no copias) a los binarios almacenados aparte.

**Ejemplo de referencia (Cloudflare):** R2 para binarios, D1 para metadata.
**Ejemplo de referencia (Oracle/OCI):** OCI Object Storage para binarios, Autonomous Database para metadata.

## Principio 4 — Principio de mínimo privilegio en credenciales de almacenamiento

El cliente (app/PWA) nunca debe poseer una credencial permanente de acceso al almacenamiento de binarios. El flujo correcto:

1. El cliente pide autorización al backend para subir un archivo.
2. El backend genera una **URL de subida firmada, de un solo uso, con expiración corta** (minutos, no horas).
3. El cliente sube el archivo directo a esa URL — el backend nunca ve pasar el binario por sí mismo, pero tampoco entregó nunca una clave reutilizable.

Este patrón se llama *pre-signed upload URL* y es soportado por prácticamente todo proveedor de almacenamiento de objetos moderno (R2, S3, OCI Object Storage, GCS).

## Principio 5 — Autenticación proporcional al riesgo real, no por defecto al estándar más complejo

Para un solo usuario administrador (o un número reducido y conocido de usuarios), un JWT simple de vida corta, emitido por tu propio backend, es suficiente — no es necesario adoptar un proveedor de identidad completo (Auth0, Firebase Auth) salvo que el número de usuarios o los requisitos de cumplimiento normativo lo justifiquen. Sobre-diseñar la autenticación agrega complejidad de mantenimiento sin beneficio de seguridad proporcional para casos de bajo riesgo.

## Principio 6 — Validación estricta de cada payload de escritura

Nunca confíes en que el cliente mande datos bien formados — cualquiera puede mandar un payload manual (`curl`, Postman) sin pasar por tu app. Valida tipo, presencia, y rango de cada campo en el backend, usando una librería de schema validation, antes de tocar cualquier almacenamiento.

## Principio 7 — Rate limiting y logging de intentos fallidos

Limita cuántas peticiones por minuto acepta una misma identidad/IP en los endpoints de escritura, y registra los intentos de autenticación fallidos — un patrón de muchos 401/403 seguidos desde el mismo origen es señal de un intento de fuerza bruta.

## Checklist rápido antes de dar por segura una API propia

- [ ] ¿Hay al menos dos capas de autenticación independientes?
- [ ] ¿Los archivos binarios y la metadata viven en servicios de almacenamiento separados?
- [ ] ¿El cliente tiene alguna credencial permanente de almacenamiento? (si la respuesta es sí, hay que corregirlo)
- [ ] ¿Se valida cada payload de escritura contra un schema, no solo se confía en el cliente?
- [ ] ¿Hay rate limiting en las rutas de escritura?
- [ ] ¿Se registran los intentos de autenticación fallidos?

---

## Implementación de referencia (Cloudflare Workers)

Estructura de archivos exacta para aplicar los 7 principios de arriba sobre un Worker:

```
backend/
├── src/
│   ├── middleware/
│   │   ├── verificarAccessJwt.ts
│   │   └── verificarJwtPropio.ts
│   ├── lib/
│   │   ├── storage.ts
│   │   └── rateLimiter.ts
│   └── index.ts
└── wrangler.toml
```

### Capa de borde — verificar también dentro del Worker el JWT que emite Access

Cloudflare Access ya bloquea en el borde si el Service Token es inválido (Principio 2) — pero además pasa un JWT propio en un header, que conviene re-verificar dentro del Worker para no depender ciegamente de la configuración de Access:

```typescript
// src/middleware/verificarAccessJwt.ts
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://<tu-team>.cloudflareaccess.com/cdn-cgi/access/certs")
);

export async function verificarAccessJwt(request: Request): Promise<boolean> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  try {
    await jwtVerify(token, JWKS, {
      issuer: "https://<tu-team>.cloudflareaccess.com",
    });
    return true;
  } catch {
    return false;
  }
}
```

### Capa de aplicación — JWT propio de vida corta

```typescript
// src/middleware/verificarJwtPropio.ts
import { jwtVerify, SignJWT } from "jose";

const secreto = new TextEncoder().encode(globalThis.JWT_SECRET);

export async function emitirToken(usuarioId: string): Promise<string> {
  return new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secreto);
}

export async function verificarToken(request: Request): Promise<string | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), secreto);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
```

### Principio 4 aplicado — URL de subida firmada hacia R2

R2 es compatible con la API S3, así que las URLs firmadas se generan con la librería `aws4fetch`:

```typescript
// src/lib/storage.ts
import { AwsClient } from "aws4fetch";

export async function generarUrlSubida(env: Env, clave: string): Promise<string> {
  const cliente = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });
  const url = new URL(`https://${env.R2_BUCKET_ENDPOINT}/${clave}`);
  url.searchParams.set("X-Amz-Expires", "300"); // 5 minutos

  const firmada = await cliente.sign(
    new Request(url, { method: "PUT" }),
    { aws: { signQuery: true } }
  );
  return firmada.url;
}
```

### Principio 7 aplicado — rate limiting nativo de Workers

```typescript
// src/lib/rateLimiter.ts
export async function verificarLimite(env: Env, identidad: string): Promise<boolean> {
  const { success } = await env.RATE_LIMITER.limit({ key: identidad });
  return success; // false = exceder el límite, responder 429
}
```

```toml
# wrangler.toml — binding necesario para el rate limiter de arriba
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1"
simple = { limit = 30, period = 60 } # 30 peticiones por minuto
```

### Orquestación de las dos capas en el punto de entrada

```typescript
// src/index.ts (fragmento de una ruta de escritura)
export default {
  async fetch(request: Request, env: Env) {
    if (!(await verificarAccessJwt(request))) {
      return new Response(JSON.stringify({ error: { codigo: "ACCESO_DENEGADO" } }), { status: 403 });
    }

    const usuarioId = await verificarJwtPropio(request);
    if (!usuarioId) {
      return new Response(JSON.stringify({ error: { codigo: "NO_AUTENTICADO" } }), { status: 401 });
    }

    if (!(await verificarLimite(env, usuarioId))) {
      return new Response(JSON.stringify({ error: { codigo: "LIMITE_EXCEDIDO" } }), { status: 429 });
    }

    // continúa hacia la validación de payload (ver skill validacion-y-errores-api-serverless)
  },
};
```

