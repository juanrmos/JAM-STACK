import type { Env } from '../types';
import { generarUrlPublica } from '../lib/storage';
import { jsonResponse } from './response';
import { consultarLogos } from '../repositories/logos';
export async function listarLogos(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const activo = url.searchParams.get("activo");

  const limitStr = url.searchParams.get("limit");
  const offsetStr = url.searchParams.get("offset");

  const limit = limitStr ? parseInt(limitStr, 10) : 10;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  const { results, total } = await consultarLogos(env, activo, limit, offset);
  const logos = (results ?? []).map((logo: Record<string, unknown>) => ({
    id: logo.id,
    nombre: logo.nombre,
    imagenUrl: generarUrlPublica(env, logo.imagen_key as string),
    activo: Boolean(logo.activo),
    fechaCreacion: logo.fecha_creacion,
    fechaActualizacion: logo.fecha_actualizacion
  }));

  const hasMore = offset + logos.length < total;

  return jsonResponse({ logos, hasMore, total });
}
