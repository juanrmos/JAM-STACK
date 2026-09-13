/**
 * Handlers de logos — CRUD completo y operaciones activas.
 * Referencia: doc 07, sección 3 (contrato de API).
 */
import type { Env } from "../types";
import {
  crearLogoSchema,
  actualizarLogoSchema,
  uploadUrlSchema,
} from "../schemas";
import { generarUrlSubida, generarUrlPublica } from "../lib/storage";
import { jsonResponse } from "../index";

// ---- Utilidades ----

function generarId(): string {
  return crypto.randomUUID();
}

/** Sanitiza un nombre de archivo para usar como parte del key de R2 */
function sanitizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 
 * Desactiva todos los logos y activa únicamente el logo especificado.
 * Transacción unificada (Batch) para garantizar que solo un logo esté activo.
 */
async function activarLogoTransaccional(env: Env, logoId: string) {
  await env.DB.batch([
    env.DB.prepare("UPDATE logos SET activo = 0"),
    env.DB.prepare("UPDATE logos SET activo = 1, fecha_actualizacion = ? WHERE id = ?")
      .bind(new Date().toISOString(), logoId),
  ]);
}

// ---- Handlers ----

/** GET /api/logos — lista paginada de logos o logo activo (?activo=1) */
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

  let queryCount = "SELECT COUNT(*) as total FROM logos";
  let query = "SELECT * FROM logos";
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (activo === "1") {
    condiciones.push("activo = 1");
  }

  if (condiciones.length > 0) {
    const where = " WHERE " + condiciones.join(" AND ");
    query += where;
    queryCount += where;
  }
  
  query += " ORDER BY fecha_creacion DESC LIMIT ? OFFSET ?";

  const countResult = await env.DB.prepare(queryCount)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total || 0;

  const { results } = await env.DB.prepare(query)
    .bind(...params, limit, offset)
    .all();

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

/** GET /api/logos/:id — obtiene un logo por ID */
export async function obtenerLogo(
  request: Request,
  env: Env,
  logoId: string
): Promise<Response> {
  const logo = await env.DB.prepare("SELECT * FROM logos WHERE id = ?").bind(logoId).first();
  if (!logo) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Logo no encontrado." } }, 404);
  }
  
  return jsonResponse({
    id: logo.id,
    nombre: logo.nombre,
    imagenUrl: generarUrlPublica(env, logo.imagen_key as string),
    activo: Boolean(logo.activo),
    fechaCreacion: logo.fecha_creacion,
    fechaActualizacion: logo.fecha_actualizacion
  });
}

/** POST /api/logos/upload-url — genera URL firmada de subida a R2 para logos */
export async function obtenerUrlSubidaLogo(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON válido." } }, 400);
  }

  const resultado = uploadUrlSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos inválidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const { nombreArchivo, tipoMime } = resultado.data;
  const id = generarId();
  const timestamp = Date.now();
  const extension = nombreArchivo.split(".").pop() ?? "jpg";
  const nombreSanitizado = sanitizarNombre(nombreArchivo.replace(/\.[^.]+$/, ""));

  const imagenKey = `logos/${id}/${timestamp}-${nombreSanitizado}.${extension}`;
  const uploadUrl = await generarUrlSubida(env, imagenKey, tipoMime);

  return jsonResponse({ uploadUrl, imagenKey, expiraEn: 300 });
}

/** POST /api/logos — crea un nuevo logo en D1 */
export async function crearLogo(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON válido." } }, 400);
  }

  const resultado = crearLogoSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos inválidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const { nombre, imagenKey, activo } = resultado.data;
  const id = generarId();
  const fechaCreacion = new Date().toISOString();

  // 1. Insertar el logo en D1
  await env.DB.prepare(
    `INSERT INTO logos (id, nombre, imagen_key, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?)`
  ).bind(id, nombre, imagenKey, 0, fechaCreacion).run();

  // 2. Si venía marcado como activo, llamar a la transacción para activar este y desactivar el resto
  if (activo) {
    await activarLogoTransaccional(env, id);
  }

  return jsonResponse({ id }, 201);
}

/** PUT /api/logos/:id — actualiza logo */
export async function actualizarLogo(
  request: Request,
  env: Env,
  logoId: string,
): Promise<Response> {
  const existente = await env.DB.prepare("SELECT id FROM logos WHERE id = ?").bind(logoId).first();

  if (!existente) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Logo no encontrado." } }, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON válido." } }, 400);
  }

  const resultado = actualizarLogoSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos inválidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const campos = resultado.data;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (campos.nombre !== undefined) {
    updates.push("nombre = ?");
    values.push(campos.nombre);
  }
  if (campos.imagenKey !== undefined) {
    updates.push("imagen_key = ?");
    values.push(campos.imagenKey);
  }

  // 1. Si hay cambios de nombre/imagen, se actualizan
  if (updates.length > 0) {
    updates.push("fecha_actualizacion = ?");
    values.push(new Date().toISOString());

    await env.DB.prepare(
      `UPDATE logos SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values, logoId).run();
  } else if (campos.activo === undefined) {
    return jsonResponse({ error: { codigo: "SIN_CAMBIOS", mensaje: "No se enviaron campos para actualizar." } }, 400);
  }

  // 2. Si se solicitó cambio de estado
  if (campos.activo === true) {
    await activarLogoTransaccional(env, logoId);
  } else if (campos.activo === false) {
    // Si se pasa explícitamente a inactivo sin activar otro
    await env.DB.prepare(
      "UPDATE logos SET activo = 0, fecha_actualizacion = ? WHERE id = ?"
    ).bind(new Date().toISOString(), logoId).run();
  }

  return jsonResponse({ actualizado: true });
}

/** PUT /api/logos/:id/activar — activa un logo y desactiva el resto */
export async function activarLogo(
  request: Request,
  env: Env,
  logoId: string,
): Promise<Response> {
  const existente = await env.DB.prepare("SELECT id FROM logos WHERE id = ?").bind(logoId).first();

  if (!existente) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Logo no encontrado." } }, 404);
  }

  await activarLogoTransaccional(env, logoId);

  return jsonResponse({ actualizado: true });
}

/** DELETE /api/logos/:id — elimina de D1 + cleanup de R2 */
export async function eliminarLogo(
  _request: Request,
  env: Env,
  logoId: string,
): Promise<Response> {
  const logo = await env.DB.prepare("SELECT imagen_key FROM logos WHERE id = ?").bind(logoId).first<{ imagen_key: string }>();

  if (!logo) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Logo no encontrado." } }, 404);
  }

  try {
    await env.BUCKET.delete(logo.imagen_key);
  } catch (err) {
    console.error(`Error eliminando objeto R2 ${logo.imagen_key}:`, err);
  }

  await env.DB.prepare("DELETE FROM logos WHERE id = ?").bind(logoId).run();

  return jsonResponse({ eliminado: true });
}
