/**
 * Storage — URLs firmadas de R2 (pre-signed upload) y URLs públicas.
 * Usa aws4fetch ya que R2 es S3-compatible.
 * Referencia: skill deep-security, principio 4 (mínimo privilegio).
 */
import type { Env } from "../types";
import { generarUrlSubidaLocal, generarUrlSubidaFirmada } from "../storage/local";

/**
 * Genera una URL firmada de subida a R2 (PUT, 5 min de expiración).
 * En producción usa un token JWT firmado con el secreto permanente JWT_SECRET
 * y el binding nativo permanente env.BUCKET de Cloudflare R2, evitando tokens
 * S3 temporales sujetos a expiración.
 */
export async function generarUrlSubida(
  request: Request,
  env: Env,
  clave: string,
  tipoMime: string,
): Promise<string> {
  if (env.LOCAL_UPLOAD === 'true') {
    return generarUrlSubidaLocal(request, env, clave, tipoMime);
  }
  return generarUrlSubidaFirmada(request, env, clave, tipoMime);
}

/**
 * Genera la URL pública de lectura de un objeto en R2.
 * Requiere que el bucket tenga acceso público habilitado (dominio custom o .r2.dev).
 */
export function generarUrlPublica(env: Env, clave: string): string {
  const publicUrl = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  if (!publicUrl) throw new Error("Falta R2_PUBLIC_URL");
  const url = new URL(publicUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("R2_PUBLIC_URL inválida");
  return `${publicUrl}/${clave}`;
}
