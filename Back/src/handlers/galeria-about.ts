import type { Env } from '../types';
import { generarUrlPublica } from '../lib/storage';
import { limpiarImagen } from '../storage/cleanup';
import { jsonResponse } from '../routes/response';

const invalid = (mensaje: string) => jsonResponse({ error: { mensaje } }, 400);
const photoKey = (value: unknown): value is string => typeof value === 'string' && /^sitio\/[a-f0-9-]+\.(jpg|png|webp)$/.test(value);

export async function listarFotosSobreNosotros(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT id,imagen_key,texto_alternativo,orden FROM fotos_sobre_nosotros WHERE orden>0 ORDER BY orden,id').all<{ id: string; imagen_key: string; texto_alternativo: string; orden: number }>();
  return jsonResponse({ fotos: results.map((photo) => ({ id: photo.id, imagenUrl: generarUrlPublica(env, photo.imagen_key), texto_alternativo: photo.texto_alternativo, orden: photo.orden })), limite: 20 });
}

export async function agregarFotoSobreNosotros(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { imagenKey?: unknown; textoAlternativo?: unknown } | null;
  if (!body || Object.keys(body).some((key) => !['imagenKey', 'textoAlternativo'].includes(key)) || !photoKey(body.imagenKey)) return invalid('Imagen inválida.');
  const altIngresado = typeof body.textoAlternativo === 'string' ? body.textoAlternativo.trim() : '';
  const alt = altIngresado || 'Fotografía de la Corporación Artística Antony Rodríguez';
  if (!alt || alt.length > 160) return invalid('El texto alternativo debe tener entre 1 y 160 caracteres.');
  if (!await env.BUCKET.head(body.imagenKey)) return invalid('Sube la imagen antes de guardarla.');
  const count = await env.DB.prepare('SELECT COUNT(*) cantidad FROM fotos_sobre_nosotros WHERE orden>0').first<{ cantidad: number }>();
  if (Number(count?.cantidad || 0) >= 20) return invalid('La galería admite hasta 20 fotografías.');
  const id = crypto.randomUUID();
  const orden = Number(count?.cantidad || 0) + 1;
  await env.DB.prepare('INSERT INTO fotos_sobre_nosotros(id,imagen_key,texto_alternativo,orden,fecha_creacion) VALUES(?,?,?,?,?)').bind(id, body.imagenKey, alt, orden, new Date().toISOString()).run();
  return jsonResponse({ agregado: true, id }, 201);
}

export async function ordenarFotosSobreNosotros(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  if (!body || Object.keys(body).length !== 1 || !Array.isArray(body.ids) || body.ids.length > 20 || body.ids.some((id) => typeof id !== 'string') || new Set(body.ids).size !== body.ids.length) return invalid('La lista de fotografías es inválida.');
  const { results } = await env.DB.prepare('SELECT id FROM fotos_sobre_nosotros WHERE orden>0 ORDER BY orden').all<{ id: string }>();
  const ids = body.ids as string[];
  if (ids.length !== results.length || results.some(({ id }) => !ids.includes(id))) return invalid('La lista debe incluir todas las fotografías existentes.');
  const statements = ids.map((id, index) => env.DB.prepare('UPDATE fotos_sobre_nosotros SET orden=? WHERE id=?').bind(-(index + 1), id));
  statements.push(...ids.map((id, index) => env.DB.prepare('UPDATE fotos_sobre_nosotros SET orden=? WHERE id=?').bind(index + 1, id)));
  await env.DB.batch(statements);
  return jsonResponse({ actualizado: true });
}

export async function eliminarFotoSobreNosotros(_request: Request, env: Env, id: string): Promise<Response> {
  const old = await env.DB.prepare('SELECT imagen_key FROM fotos_sobre_nosotros WHERE id=? AND orden>0').bind(id).first<{ imagen_key: string }>();
  if (!old) return jsonResponse({ error: { mensaje: 'Fotografía no encontrada.' } }, 404);
  const { results } = await env.DB.prepare('SELECT id FROM fotos_sobre_nosotros WHERE orden>0 AND id<>? ORDER BY orden,id').bind(id).all<{ id: string }>();
  const statements = [env.DB.prepare('DELETE FROM fotos_sobre_nosotros WHERE id=?').bind(id)];
  statements.push(...results.map((photo, index) => env.DB.prepare('UPDATE fotos_sobre_nosotros SET orden=? WHERE id=?').bind(-(index + 1), photo.id)));
  statements.push(...results.map((photo, index) => env.DB.prepare('UPDATE fotos_sobre_nosotros SET orden=? WHERE id=?').bind(index + 1, photo.id)));
  await env.DB.batch(statements);
  await limpiarImagen(env, old.imagen_key);
  return jsonResponse({ eliminado: true });
}
