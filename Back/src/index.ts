import { leerContenido,guardarTextos,subirFoto,guardarFoto } from './handlers/contenido';
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
import { listarServicios, guardarNombresServicios } from "./handlers/servicios";
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
import { crearRespuestaAccessInicio } from "./routes/accessBootstrap";
import { servirMedia, recibirSubidaLocal } from "./storage/local";
import { corsHeaders } from "./http/cors";
import { clavesImagenesSitio, type ImagenSitioClave } from "../../Shared/contracts/imagenes-sitio";

// ---- CORS ----
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

      if (method === "GET" && pathname === "/api/servicios") {
        return withCors(await listarServicios(request, env));
      }

      if (method === "GET" && pathname === "/api/contenido") {
        return withCors(await leerContenido(request, env));
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

        // Navegación de nivel superior para completar el login interactivo de Access.
        // Access redirige aquí después de autenticar y el navegador conserva su cookie
        // para que las llamadas fetch posteriores al Worker puedan incluirla.
        if (method === "GET" && pathname === "/api/auth/access/start") {
          return withCors(crearRespuestaAccessInicio(
            request,
            env.FRONTEND_ORIGIN,
            env.LOCAL_MEDIA === "true",
          ));
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
        if(method==='PUT' && pathname==='/api/textos')return withCors(await guardarTextos(request,env));
        if(method==='PUT' && pathname==='/api/servicios/nombres')return withCors(await guardarNombresServicios(request,env));
        if(method==='POST' && pathname==='/api/imagenes-sitio/upload-url')return withCors(await subirFoto(request,env));
        const imagenSitioMatch=pathname.match(/^\/api\/imagenes-sitio\/(.+)$/);
        if(method==='PUT' && imagenSitioMatch && (clavesImagenesSitio as readonly string[]).includes(imagenSitioMatch[1]))return withCors(await guardarFoto(request,env,imagenSitioMatch[1] as ImagenSitioClave));

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
