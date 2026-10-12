/**
 * Tipos del entorno del Worker — bindings y secretos.
 * Cada binding se configura en wrangler.toml, cada secreto en .dev.vars (local)
 * o con `wrangler secret put` (producción).
 */

/** Rate limiter binding (unsafe binding en wrangler.toml) */
interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  LOCAL_MEDIA?: string;
  LOCAL_UPLOAD?: string;
  PREVIEW_MEDIA?: string;
  API_PUBLIC_ONLY?: string;
  // --- Bindings de infraestructura ---
  /** D1 Database — metadata de obras */
  DB: D1Database;
  /** R2 Bucket — fotos de obras */
  BUCKET: R2Bucket;
  /** Rate limiter nativo de Workers */
  RATE_LIMITER: RateLimiter;

  // --- Secretos ---
  /** Clave para firmar/verificar JWT propios (HS256) */
  JWT_SECRET: string;
  /** Secreto compartido de alta entropía para el login del admin */
  ADMIN_SECRET: string;
  /** Credenciales S3-compatible para generar URLs firmadas de R2 */
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  /** Endpoint público del bucket R2 (dominio custom o .r2.dev) */
  R2_BUCKET_ENDPOINT: string;
  /** Nombre del bucket usado al firmar subidas; debe coincidir con BUCKET */
  R2_BUCKET_NAME: string;
  /** URL pública de lectura (.r2.dev) */
  R2_PUBLIC_URL: string;
  /** Nombre del equipo de Cloudflare Access (ej: "mi-equipo") */
  CF_ACCESS_TEAM: string;
  /** AUD de la aplicación Access que protege el administrador y la API privada */
  CF_ACCESS_AUD: string;
  /** Origen HTTPS exacto del Front permitido por CORS en producción */
  FRONTEND_ORIGIN: string;
}
