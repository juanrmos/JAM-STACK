/**
 * Capa de borde — re-verifica el JWT de Cloudflare Access dentro del Worker.
 * Cloudflare Access ya bloquea en el borde si el Service Token es inválido,
 * pero re-verificamos aquí para no depender ciegamente de la configuración de Access.
 * Referencia: skill deep-security, principio 2 + implementación de referencia.
 */
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Env } from "../types";

export async function verificarAccessJwt(
  request: Request,
  env: Env,
): Promise<boolean> {
  const teamDomain = env.CF_ACCESS_TEAM;
  
  // Si no hay equipo configurado, asumimos que Access está apagado (bypass temporal)
  if (!teamDomain) return true;

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
    });
    return true;
  } catch {
    return false;
  }
}
