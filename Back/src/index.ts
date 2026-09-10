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
} from "./handlers/obras";

// ---- Utilidad de respuesta JSON (exportada para handlers) ----

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---- CORS ----
// TODO: restringir Access-Control-Allow-Origin al dominio real del frontend en producción.

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret, Cf-Access-Jwt-Assertion",
    "Access-Control-Max-Age": "86400",
  };
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders())) {
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

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    try {
      // ---- Rutas públicas ----

      // GET /api/obras — lectura pública, sin auth
      if (method === "GET" && pathname === "/api/obras") {
        return withCors(await listarObras(request, env));
      }

      // POST /api/auth/login — solo rate limiting, sin auth de capas
      if (method === "POST" && pathname === "/api/auth/login") {
        return withCors(await handleLogin(request, env));
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
