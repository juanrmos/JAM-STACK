/**
 * Router principal del Worker API.
 * Orquesta las capas de seguridad (doc 02, §2.1) y despacha a los handlers.
 *
 * Flujo de rutas protegidas:
 *   1. CORS preflight
 *   2. Cloudflare Access JWT (capa de borde)
 *   3. JWT propio (capa de aplicación)
 *   4. Rate limiting
 *   5. Handler
 *
 * El Worker NUNCA sirve HTML — solo JSON (doc 02, §2.2).
 */
import type { Env } from "./types";
import { verificarAccessJwt } from "./middleware/verificarAccess";
import { verificarToken } from "./middleware/verificarJwt";
import { verificarLimite } from "./lib/rateLimiter";
import { handleLogin } from "./handlers/auth";
import {
  listarObras,
  obtenerUrlSubida,
  crearObra,
  actualizarObra,
  eliminarObra,
  obtenerObra,
} from "./handlers/obras";
import {
  listarLogos,
  obtenerLogo,
  obtenerUrlSubidaLogo,
  crearLogo,
  actualizarLogo,
  activarLogo,
  eliminarLogo,
} from "./handlers/logos";

// ---- Utilidad de respuesta JSON (exportada para handlers) ----

import { jsonResponse } from "./routes/response";
import { servirMedia, recibirSubidaLocal } from "./storage/local";

// ---- CORS ----
function corsHeaders(request: Request, env: Env): Record<string, string> {
  if (env.API_PUBLIC_ONLY === 'true') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
  }
  const origin = request.headers.get('Origin');
  const requestHost = new URL(request.url).hostname;
  const local = env.LOCAL_MEDIA === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(requestHost);
  let permitido = false;
  if (origin) {
    try {
      const url = new URL(origin);
      permitido = local
        ? url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        : url.protocol === 'https:' && origin === env.FRONTEND_ORIGIN;
    } catch {
      permitido = false;
    }
  }
  return {
    'Vary': 'Origin',
    ...(permitido ? {
      'Access-Control-Allow-Origin': origin!,
      'Access-Control-Allow-Credentials': 'true',
    } : {}),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function withRequestCors(request: Request, env: Env, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ---- Worker fetch handler ----

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;
    const withCors = (response: Response) => withRequestCors(request, env, response);

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      // ---- Rutas públicas ----
      if (method === "GET" && pathname.startsWith("/api/media/")) {
        return withCors(await servirMedia(request, env));
      }
      if (method === "PUT" && pathname.startsWith("/api/local-upload/")) {
        return withCors(await recibirSubidaLocal(request, env));
      }

      // GET /api/obras — lectura pública, sin auth
      if (method === "GET" && pathname === "/api/obras") {
        return withCors(await listarObras(request, env));
      }

      // GET /api/logos — lectura pública, sin auth
      if (method === "GET" && pathname === "/api/logos") {
        return withCors(await listarLogos(request, env));
      }

      // El Worker público solo entrega lecturas. El panel usa otro Worker,
      // protegido por Access, que comparte los bindings D1/R2.
      if (env.API_PUBLIC_ONLY === 'true') {
        return withCors(jsonResponse({ error: { codigo: "RUTA_NO_ENCONTRADA" } }, 404));
      }

      // ---- Rutas protegidas (requieren doble autenticación) ----

      if (pathname.startsWith("/api/")) {
        // Capa 1: Cloudflare Access JWT (skill deep-security, orquestación)
        if (!(await verificarAccessJwt(request, env))) {
          return withCors(
            jsonResponse(
              {
                error: {
                  codigo: "ACCESO_DENEGADO",
                  mensaje: "Token de Access inválido o ausente.",
                },
              },
              403,
            ),
          );
        }

        // El login también requiere Access; el rate limit y secreto se validan en el handler.
        if (method === "POST" && pathname === "/api/auth/login") {
          return withCors(await handleLogin(request, env));
        }

        // Capa 2: JWT propio del Worker
        const usuarioId = await verificarToken(request, env);
        if (!usuarioId) {
          return withCors(
            jsonResponse(
              {
                error: {
                  codigo: "NO_AUTENTICADO",
                  mensaje: "Token de sesión inválido o expirado.",
                },
              },
              401,
            ),
          );
        }

        // Rate limiting por usuario autenticado
        if (!(await verificarLimite(env, `user:${usuarioId}`))) {
          return withCors(
            jsonResponse(
              {
                error: {
                  codigo: "LIMITE_EXCEDIDO",
                  mensaje: "Demasiadas peticiones. Intenta más tarde.",
                },
              },
              429,
            ),
          );
        }

        // --- Despacho de rutas protegidas ---

        // POST /api/obras/upload-url
        if (method === "POST" && pathname === "/api/obras/upload-url") {
          return withCors(await obtenerUrlSubida(request, env));
        }

        // POST /api/obras
        if (method === "POST" && pathname === "/api/obras") {
          return withCors(await crearObra(request, env));
        }

        // GET /api/obras/:id
        const obraGetMatch = pathname.match(/^\/api\/obras\/([a-f0-9-]+)$/);
        if (method === "GET" && obraGetMatch) {
          return withCors(await obtenerObra(request, env, obraGetMatch[1]));
        }

        // PUT/DELETE /api/obras/:id
        const obraMatch = pathname.match(/^\/api\/obras\/([a-f0-9-]+)$/);
        if (obraMatch) {
          const obraId = obraMatch[1];
          if (method === "PUT") {
            return withCors(await actualizarObra(request, env, obraId));
          }
          if (method === "DELETE") {
            return withCors(await eliminarObra(request, env, obraId));
          }
        }

        // --- Despacho de rutas protegidas de LOGOS ---

        // GET /api/logos/:id
        const logoGetMatch = pathname.match(/^\/api\/logos\/([a-f0-9-]+)$/);
        if (method === "GET" && logoGetMatch) {
          return withCors(await obtenerLogo(request, env, logoGetMatch[1]));
        }

        // POST /api/logos/upload-url
        if (method === "POST" && pathname === "/api/logos/upload-url") {
          return withCors(await obtenerUrlSubidaLogo(request, env));
        }

        // POST /api/logos
        if (method === "POST" && pathname === "/api/logos") {
          return withCors(await crearLogo(request, env));
        }

        // PUT/DELETE /api/logos/:id o /api/logos/:id/activar
        const logoMatch = pathname.match(/^\/api\/logos\/([a-f0-9-]+)(?:\/(activar))?$/);
        if (logoMatch) {
          const logoId = logoMatch[1];
          const accion = logoMatch[2];
          if (method === "PUT") {
            if (accion === "activar") {
              return withCors(await activarLogo(request, env, logoId));
            } else {
              return withCors(await actualizarLogo(request, env, logoId));
            }
          }
          if (method === "DELETE" && !accion) {
            return withCors(await eliminarLogo(request, env, logoId));
          }
        }
      }

      // 404 para todo lo demás
      return withCors(
        jsonResponse(
          {
            error: {
              codigo: "RUTA_NO_ENCONTRADA",
              mensaje: "Endpoint no existe.",
            },
          },
          404,
        ),
      );
    } catch (err) {
      console.error("Error no manejado:", err);
      return withCors(
        jsonResponse(
          {
            error: {
              codigo: "ERROR_INTERNO",
              mensaje: "Error interno del servidor.",
            },
          },
          500,
        ),
      );
    }
  },
};
