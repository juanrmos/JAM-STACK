import { categorias, type Categoria } from '../../../Shared/contracts/categorias';
import { nombreGrupoComplementarioInicial, nombresPublicosIniciales, type ServicioPresentacion } from '../../../Shared/contracts/servicios';
import type { Env } from '../types';
import { jsonResponse } from '../routes/response';

const invalid = (mensaje: string) => jsonResponse({ error: { mensaje } }, 400);

export async function listarServicios(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT id, nombre_publico FROM servicios').all<ServicioPresentacion>();
  const grupo = await env.DB.prepare("SELECT nombre_publico FROM grupos_servicios WHERE id='complementarios'").first<{ nombre_publico: string }>();
  const names = new Map(results.map((service) => [service.id, service.nombre_publico]));
  const servicios = categorias.map((id) => ({
    id,
    nombre_publico: names.get(id) || nombresPublicosIniciales[id],
  }));
  return jsonResponse({
    servicios,
    grupo_complementario: { id: 'complementarios', nombre_publico: grupo?.nombre_publico || nombreGrupoComplementarioInicial },
  });
}

export async function guardarNombresServicios(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { servicios?: unknown; grupo_complementario?: unknown } | null;
  if (!body || Object.keys(body).some((key) => !['servicios', 'grupo_complementario'].includes(key))
    || (!Array.isArray(body.servicios) && body.grupo_complementario === undefined)
    || (Array.isArray(body.servicios) && body.servicios.length === 0 && body.grupo_complementario === undefined)) {
    return invalid('Envía nombres de servicios o el nombre del grupo complementario.');
  }

  const updates: ServicioPresentacion[] = [];
  const seen = new Set<Categoria>();
  for (const item of Array.isArray(body.servicios) ? body.servicios : []) {
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

  const batch: D1PreparedStatement[] = [];
  if (updates.length) {
    const placeholders = updates.map(() => '?').join(',');
    const existing = await env.DB.prepare(`SELECT id FROM servicios WHERE id IN (${placeholders})`)
      .bind(...updates.map(({ id }) => id)).all<{ id: Categoria }>();
    const existingIds = new Set(existing.results.map(({ id }) => id));
    if (updates.some(({ id }) => !existingIds.has(id))) {
      return jsonResponse({ error: { mensaje: 'El catálogo local de servicios está incompleto.' } }, 409);
    }
    batch.push(...updates.map(({ id, nombre_publico }) =>
      env.DB.prepare('UPDATE servicios SET nombre_publico=? WHERE id=?').bind(nombre_publico, id),
    ));
  }
  if (body.grupo_complementario !== undefined) {
    if (!body.grupo_complementario || typeof body.grupo_complementario !== 'object' || Array.isArray(body.grupo_complementario)) return invalid('Grupo complementario inválido.');
    const group = body.grupo_complementario as Record<string, unknown>;
    if (Object.keys(group).length !== 2 || group.id !== 'complementarios' || typeof group.nombre_publico !== 'string') return invalid('El grupo complementario no está permitido.');
    const nombre = group.nombre_publico.trim();
    if (!nombre || nombre.length > 60) return invalid('El nombre del grupo debe tener entre 1 y 60 caracteres.');
    const exists = await env.DB.prepare("SELECT id FROM grupos_servicios WHERE id='complementarios'").first<{ id: string }>();
    if (!exists) return jsonResponse({ error: { mensaje: 'No existe el grupo complementario en la base de datos.' } }, 409);
    batch.push(env.DB.prepare("UPDATE grupos_servicios SET nombre_publico=? WHERE id='complementarios'").bind(nombre));
  }
  if (batch.length) await env.DB.batch(batch);
  return jsonResponse({ actualizado: true, cantidad: updates.length, grupo_actualizado: body.grupo_complementario !== undefined });
}
