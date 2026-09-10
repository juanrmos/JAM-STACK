/**
 * Capa de aplicación — JWT propio de vida corta (1h, HS256).
 * Emitido tras login exitoso, verificado en cada ruta protegida.
 * Referencia: skill deep-security, principio 5 + implementación de referencia.
 */
import { jwtVerify, SignJWT } from "jose";
import type { Env } from "../types";

function obtenerSecreto(env: Env): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

/** Emite un JWT de vida corta (1 hora) para el usuario administrador. */
export async function emitirToken(
  env: Env,
  usuarioId: string,
): Promise<string> {
  return new SignJWT({ sub: usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(obtenerSecreto(env));
}

/** Extrae y valida el Bearer token del header Authorization. Retorna el sub del JWT o null. */
export async function verificarToken(
  request: Request,
  env: Env,
): Promise<string | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), obtenerSecreto(env));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
