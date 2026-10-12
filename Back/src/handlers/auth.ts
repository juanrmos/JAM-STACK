/**
 * Handler: POST /api/auth/login
 * Recibe { secreto: string }, compara con env.ADMIN_SECRET.
 * Si coincide, emite JWT de 1h. Rate limiting por IP.
 * Referencia: doc 03 §POST /api/auth/login.
 */
import type { Env } from "../types";
import { loginSchema } from "../schemas";
import { emitirToken } from "../middleware/verificarJwt";
import { verificarLimite } from "../lib/rateLimiter";
import { jsonResponse } from "../routes/response";

export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  // Rate limiting por IP — protección contra fuerza bruta
  const ip = request.headers.get("CF-Connecting-IP") ?? "desconocido";
  if (!(await verificarLimite(env, `login:${ip}`))) {
    return jsonResponse(
      {
        error: {
          codigo: "LIMITE_EXCEDIDO",
          mensaje: "Demasiados intentos. Intenta más tarde.",
        },
      },
      429,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        error: {
          codigo: "PAYLOAD_INVALIDO",
          mensaje: "El cuerpo debe ser JSON válido.",
        },
      },
      400,
    );
  }

  // Validar con Zod
  const resultado = loginSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse(
      {
        error: {
          codigo: "VALIDACION_FALLIDA",
          mensaje: "Datos inválidos.",
          detalles: resultado.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  // Comparar con el secreto del admin
  if (resultado.data.secreto !== env.ADMIN_SECRET) {
    console.warn(`Intento de login fallido desde IP: ${ip}`);
    return jsonResponse(
      {
        error: {
          codigo: "CREDENCIALES_INVALIDAS",
          mensaje: "Secreto incorrecto.",
        },
      },
      401,
    );
  }

  // Emitir JWT
  const token = await emitirToken(env, "admin");
  return jsonResponse({ token, expiraEn: 3600 });
}
