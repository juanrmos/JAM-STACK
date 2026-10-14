/**
 * Capa de borde — re-verifica el JWT de Cloudflare Access dentro del Worker.
 * Cloudflare Access controla el acceso interactivo en el borde. El Worker
 * verifica firma, emisor y audiencia del JWT sin asumir que la regla de borde
 * cubre correctamente todas las rutas privadas.
 */
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Env } from "../types";

export async function verificarAccessJwt(
  request: Request,
  env: Env,
): Promise<boolean> {
  const teamDomain = env.CF_ACCESS_TEAM;
  const hostname = new URL(request.url).hostname;
  // La excepción solo existe en Wrangler local y con un host de loopback.
  if (env.LOCAL_MEDIA === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    return true;
  }
  const audiences = [env.CF_ACCESS_AUD, env.CF_ACCESS_AUD_FRONTEND].filter(
    (audience): audience is string => Boolean(audience),
  );
  if (!teamDomain || audiences.length === 0) return false;

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;

  try {
    const JWKS = createRemoteJWKSet(
      new URL(
        `https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`,
      ),
    );

    await jwtVerify(token, JWKS, {
      issuer: `https://${teamDomain}.cloudflareaccess.com`,
      audience: audiences,
    });
    return true;
  } catch {
    return false;
  }
}
