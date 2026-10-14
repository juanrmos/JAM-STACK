import type { Env } from '../types';
import { generarUrlPublica } from '../lib/storage';
import { jsonResponse } from './response';
import { consultarObras } from '../repositories/obras';
export async function listarObras(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const categoria = url.searchParams.get("categoria");
  const buscar = url.searchParams.get("buscar");
  const ordenFiltro = url.searchParams.get("orden"); // ej: "1-5"

  const limitStr = url.searchParams.get("limit");
  const offsetStr = url.searchParams.get("offset");

  const limit = limitStr ? parseInt(limitStr, 10) : 50;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  const { results, total } = await consultarObras(env, categoria, buscar, ordenFiltro, limit, offset);
  const obras = (results ?? []).map((obra: Record<string, unknown>) => ({
    id: obra.id,
    titulo: obra.titulo,
    descripcion: obra.descripcion,
    categoria: obra.categoria,
    imagenUrl: generarUrlPublica(env, obra.imagen_key as string),
    videoUrl: obra.video_url,
    orden: obra.orden,
    destacado: Boolean(obra.destacado),
  }));

  const hasMore = offset + obras.length < total;

  return jsonResponse({ obras, hasMore, total });
}
