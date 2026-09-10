/**
 * Rate limiting — wrapper del binding nativo de Workers.
 * 30 peticiones por minuto por identidad (configurable en wrangler.toml).
 * Referencia: skill deep-security, principio 7.
 */
import type { Env } from "../types";

/**
 * Verifica si la identidad ha excedido el límite de peticiones.
 * @returns true si la petición está permitida, false si excedió el límite (responder 429).
 */
export async function verificarLimite(
  env: Env,
  identidad: string,
): Promise<boolean> {
  try {
    const { success } = await env.RATE_LIMITER.limit({ key: identidad });
    return success;
  } catch {
    // Si el rate limiter falla (ej: desarrollo local sin binding), permitir
    return true;
  }
}
