import { categorias, type Categoria } from '../../../Shared/contracts/categorias';
import { nombresPublicosIniciales, type ServicioPresentacion } from '../../../Shared/contracts/servicios';
import type { Env } from '../types';
import { jsonResponse } from '../routes/response';

const invalid = (mensaje: string) => jsonResponse({ error: { mensaje } }, 400);

export async function listarServicios(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT id, nombre_publico FROM servicios').all<ServicioPresentacion>();
  const names = new Map(results.map((service) => [service.id, service.nombre_publico]));
  const servicios = categorias.map((id) => ({
    id,
    nombre_publico: names.get(id) || nombresPublicosIniciales[id],
  }));
  return jsonResponse({ servicios });
}

export async function guardarNombresServicios(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { servicios?: unknown } | null;
  if (!body || Object.keys(body).length !== 1 || !Array.isArray(body.servicios) || body.servicios.length === 0) {
    return invalid('Envía una lista de nombres de servicios.');
  }

  const updates: ServicioPresentacion[] = [];
  const seen = new Set<Categoria>();
  for (const item of body.servicios) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return invalid('Servicio inválido.');
    const value = item as Record<string, unknown>;
    if (Object.keys(value).length !== 2 || typeof value.id !== 'string' || !categorias.includes(value.id as Categoria)) {
      return invalid('El ID del servicio no está permitido.');
    }
    const id = value.id as Categoria;
    if (seen.has(id)) return invalid('No repitas el mismo servicio.');
    if (typeof value.nombre_publico !== 'string') return invalid('El nombre público debe ser texto.');
    const nombre_publico = value.nombre_publico.trim();
    if (!nombre_publico || nombre_publico.length > 40) return invalid('El nombre debe tener entre 1 y 40 caracteres.');
    seen.add(id);
    updates.push({ id, nombre_publico });
  }

  const placeholders = updates.map(() => '?').join(',');
  const existing = await env.DB.prepare(`SELECT id FROM servicios WHERE id IN (${placeholders})`)
    .bind(...updates.map(({ id }) => id)).all<{ id: Categoria }>();
  const existingIds = new Set(existing.results.map(({ id }) => id));
  if (updates.some(({ id }) => !existingIds.has(id))) {
    return jsonResponse({ error: { mensaje: 'El catálogo local de servicios está incompleto.' } }, 409);
  }
  await env.DB.batch(updates.map(({ id, nombre_publico }) =>
    env.DB.prepare('UPDATE servicios SET nombre_publico=? WHERE id=?').bind(nombre_publico, id),
  ));
  return jsonResponse({ actualizado: true, cantidad: updates.length });
}
