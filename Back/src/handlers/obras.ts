/**
 * Handlers de obras — CRUD completo.
 * Referencia: doc 03, sección 3 (contrato de API).
 *
 * GET /api/obras           — lectura pública (sin auth)
 * POST /api/obras/upload-url — URL firmada de subida a R2 (auth requerida)
 * POST /api/obras          — crear obra en D1 (auth requerida)
 * PUT /api/obras/:id       — actualizar obra (auth requerida)
 * DELETE /api/obras/:id    — eliminar obra + cleanup R2 (auth requerida)
 */
import type { Env } from "../types";
import {
  crearObraSchema,
  actualizarObraSchema,
  uploadUrlSchema,
} from "../schemas";
import { generarUrlSubida, generarUrlPublica } from "../lib/storage";
import { jsonResponse } from "../index";

// ---- Utilidades ----

function generarId(): string {
  return crypto.randomUUID();
}

/** Sanitiza un nombre de archivo para usar como parte del key de R2 (doc 03, §2). */
function sanitizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---- Handlers ----

/** GET /api/obras — lectura pública con filtros opcionales (?categoria=, ?destacado=true) */
export async function listarObras(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const categoria = url.searchParams.get("categoria");
  const destacado = url.searchParams.get("destacado");

  let query = "SELECT * FROM obras";
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (categoria) {
    condiciones.push("categoria = ?");
    params.push(categoria);
  }
  if (destacado === "true") {
    condiciones.push("destacado = 1");
  }

  if (condiciones.length > 0) {
    query += " WHERE " + condiciones.join(" AND ");
  }
  query += " ORDER BY fecha_creacion DESC";

  const { results } = await env.DB.prepare(query)
    .bind(...params)
    .all();

  // Resolver imagen_key a URL pública (doc 03: "el Worker convierte imagen_key en una URL")
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

  return jsonResponse(obras);
}

/** POST /api/obras/upload-url — genera URL firmada de subida a R2 */
export async function obtenerUrlSubida(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        error: {
          codigo: "PAYLOAD_INVALIDO",
          mensaje: "El cuerpo debe ser JSON válido.",
        },
      },
      400,
    );
  }

  const resultado = uploadUrlSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse(
      {
        error: {
          codigo: "VALIDACION_FALLIDA",
          mensaje: "Datos inválidos.",
          detalles: resultado.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const { nombreArchivo, tipoMime } = resultado.data;
  const id = generarId();
  const timestamp = Date.now();
  const extension = nombreArchivo.split(".").pop() ?? "jpg";
  const nombreSanitizado = sanitizarNombre(
    nombreArchivo.replace(/\.[^.]+$/, ""),
  );

  // Convención de R2 (doc 03, §2): obras/{id}/{timestamp}-{nombre}.{ext}
  const imagenKey = `obras/${id}/${timestamp}-${nombreSanitizado}.${extension}`;

  const uploadUrl = await generarUrlSubida(env, imagenKey, tipoMime);

  return jsonResponse({
    uploadUrl,
    imagenKey,
    expiraEn: 300,
  });
}

/** POST /api/obras — crea el registro de metadata en D1 */
export async function crearObra(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        error: {
          codigo: "PAYLOAD_INVALIDO",
          mensaje: "El cuerpo debe ser JSON válido.",
        },
      },
      400,
    );
  }

  const resultado = crearObraSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse(
      {
        error: {
          codigo: "VALIDACION_FALLIDA",
          mensaje: "Datos inválidos.",
          detalles: resultado.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const {
    titulo,
    descripcion,
    categoria,
    imagenKey,
    videoUrl,
    orden,
    destacado,
  } = resultado.data;
  const id = generarId();
  // Fecha generada por el Worker, no por el cliente (doc 03, §1)
  const fechaCreacion = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO obras (id, titulo, descripcion, categoria, imagen_key, video_url, orden, destacado, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      titulo,
      descripcion ?? null,
      categoria ?? null,
      imagenKey,
      videoUrl ?? null,
      orden,
      destacado ? 1 : 0,
      fechaCreacion,
    )
    .run();

  return jsonResponse({ id }, 201);
}

/** PUT /api/obras/:id — actualiza campos parciales */
export async function actualizarObra(
  request: Request,
  env: Env,
  obraId: string,
): Promise<Response> {
  // Verificar que la obra existe
  const existente = await env.DB.prepare(
    "SELECT id FROM obras WHERE id = ?",
  )
    .bind(obraId)
    .first();

  if (!existente) {
    return jsonResponse(
      {
        error: {
          codigo: "NO_ENCONTRADO",
          mensaje: "Obra no encontrada.",
        },
      },
      404,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        error: {
          codigo: "PAYLOAD_INVALIDO",
          mensaje: "El cuerpo debe ser JSON válido.",
        },
      },
      400,
    );
  }

  const resultado = actualizarObraSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse(
      {
        error: {
          codigo: "VALIDACION_FALLIDA",
          mensaje: "Datos inválidos.",
          detalles: resultado.error.flatten().fieldErrors,
        },
      },
      400,
    );
  }

  const campos = resultado.data;
  const updates: string[] = [];
  const values: unknown[] = [];

  if (campos.titulo !== undefined) {
    updates.push("titulo = ?");
    values.push(campos.titulo);
  }
  if (campos.descripcion !== undefined) {
    updates.push("descripcion = ?");
    values.push(campos.descripcion);
  }
  if (campos.categoria !== undefined) {
    updates.push("categoria = ?");
    values.push(campos.categoria);
  }
  if (campos.videoUrl !== undefined) {
    updates.push("video_url = ?");
    values.push(campos.videoUrl);
  }
  if (campos.orden !== undefined) {
    updates.push("orden = ?");
    values.push(campos.orden);
  }
  if (campos.destacado !== undefined) {
    updates.push("destacado = ?");
    values.push(campos.destacado ? 1 : 0);
  }

  if (updates.length === 0) {
    return jsonResponse(
      {
        error: {
          codigo: "SIN_CAMBIOS",
          mensaje: "No se enviaron campos para actualizar.",
        },
      },
      400,
    );
  }

  await env.DB.prepare(
    `UPDATE obras SET ${updates.join(", ")} WHERE id = ?`,
  )
    .bind(...values, obraId)
    .run();

  return jsonResponse({ actualizado: true });
}

/** DELETE /api/obras/:id — elimina de D1 + cleanup de R2 (doc 03, §DELETE) */
export async function eliminarObra(
  _request: Request,
  env: Env,
  obraId: string,
): Promise<Response> {
  // Obtener el key de R2 antes de borrar el registro
  const obra = await env.DB.prepare(
    "SELECT imagen_key FROM obras WHERE id = ?",
  )
    .bind(obraId)
    .first<{ imagen_key: string }>();

  if (!obra) {
    return jsonResponse(
      {
        error: {
          codigo: "NO_ENCONTRADO",
          mensaje: "Obra no encontrada.",
        },
      },
      404,
    );
  }

  // Eliminar el objeto de R2 (no dejar archivos huérfanos — doc 03)
  try {
    await env.BUCKET.delete(obra.imagen_key);
  } catch (err) {
    console.error(`Error eliminando objeto R2 ${obra.imagen_key}:`, err);
    // No fallar — el registro de D1 se limpia de todas formas
  }

  // Eliminar de D1
  await env.DB.prepare("DELETE FROM obras WHERE id = ?")
    .bind(obraId)
    .run();

  return jsonResponse({ eliminado: true });
}
