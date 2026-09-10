/**
 * Storage — URLs firmadas de R2 (pre-signed upload) y URLs públicas.
 * Usa aws4fetch ya que R2 es S3-compatible.
 * Referencia: skill deep-security, principio 4 (mínimo privilegio).
 */
import { AwsClient } from "aws4fetch";
import type { Env } from "../types";

/**
 * Genera una URL firmada de subida a R2 (PUT, 5 min de expiración).
 * La app cliente sube el archivo directo a esta URL — el Worker nunca ve pasar el binario.
 */
export async function generarUrlSubida(
  env: Env,
  clave: string,
  tipoMime: string,
): Promise<string> {
  const cliente = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  });

  const endpoint = env.R2_BUCKET_ENDPOINT.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = new URL(`https://${endpoint}/portafolio-archivos/${clave}`);
  url.searchParams.set("X-Amz-Expires", "300"); // 5 minutos

  const firmada = await cliente.sign(
    new Request(url, {
      method: "PUT",
      headers: { "Content-Type": tipoMime },
    }),
    { aws: { signQuery: true } },
  );

  return firmada.url;
}

/**
 * Genera la URL pública de lectura de un objeto en R2.
 * Requiere que el bucket tenga acceso público habilitado (dominio custom o .r2.dev).
 */
export function generarUrlPublica(env: Env, clave: string): string {
  const publicUrl = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${publicUrl}/${clave}`;
}
