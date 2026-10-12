/**
 * Handlers de obras — CRUD completo.
 * Referencia: doc 03, sección 3 (contrato de API).
 */
import type { Env } from "../types";
import {
  crearObraSchema,
  actualizarObraSchema,
  uploadUrlSchema,
} from "../schemas";
import { generarUrlSubida, generarUrlPublica } from "../lib/storage";
import { jsonResponse } from "../routes/response";

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

/** GET /api/obras — lectura pública con filtros opcionales */
export { listarObras } from '../routes/obras-lectura';

/** GET /api/obras/:id — obtiene una obra por ID */
export async function obtenerObra(
  request: Request,
  env: Env,
  obraId: string
): Promise<Response> {
  const obra = await env.DB.prepare("SELECT * FROM obras WHERE id = ?").bind(obraId).first();
  if (!obra) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Obra no encontrada." } }, 404);
  }
  
  return jsonResponse({
    id: obra.id,
    titulo: obra.titulo,
    descripcion: obra.descripcion,
    categoria: obra.categoria,
    imagenUrl: generarUrlPublica(env, obra.imagen_key as string),
    videoUrl: obra.video_url,
    orden: obra.orden,
    destacado: Boolean(obra.destacado),
  });
}

/** POST /api/obras/upload-url */
export async function obtenerUrlSubida(
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

  const imagenKey = `obras/${id}/${timestamp}-${nombreSanitizado}.${extension}`;
  const uploadUrl = await generarUrlSubida(request, env, imagenKey, tipoMime);

  return jsonResponse({ uploadUrl, imagenKey, expiraEn: 300 });
}

/** POST /api/obras */
export async function crearObra(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON válido." } }, 400);
  }

  const resultado = crearObraSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos inválidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const { titulo, descripcion, categoria, imagenKey, videoUrl, orden, destacado } = resultado.data;
  const id = generarId();
  const fechaCreacion = new Date().toISOString();

  const statements: D1PreparedStatement[] = [];

  // Caso 2: Crear con slot X
  if (orden >= 1 && orden <= 5) {
    statements.push(
      env.DB.prepare("UPDATE obras SET orden = orden + 1 WHERE categoria = ? AND orden >= ? AND orden <= 5")
        .bind(categoria, orden)
    );
    statements.push(
      env.DB.prepare("UPDATE obras SET orden = 0 WHERE categoria = ? AND orden > 5")
        .bind(categoria)
    );
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO obras (id, titulo, descripcion, categoria, imagen_key, video_url, orden, destacado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, titulo, descripcion ?? null, categoria ?? null, imagenKey, videoUrl ?? null,
      orden >= 1 && orden <= 5 ? orden : 0, destacado ? 1 : 0, fechaCreacion
    )
  );

  await env.DB.batch(statements);

  return jsonResponse({ id }, 201);
}

/** PUT /api/obras/:id */
export async function actualizarObra(
  request: Request,
  env: Env,
  obraId: string,
): Promise<Response> {
  const existente = await env.DB.prepare("SELECT id, categoria, orden, imagen_key FROM obras WHERE id = ?").bind(obraId).first<{id: string, categoria: string, orden: number, imagen_key: string}>();

  if (!existente) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Obra no encontrada." } }, 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { codigo: "PAYLOAD_INVALIDO", mensaje: "El cuerpo debe ser JSON válido." } }, 400);
  }

  const resultado = actualizarObraSchema.safeParse(body);
  if (!resultado.success) {
    return jsonResponse({ error: { codigo: "VALIDACION_FALLIDA", mensaje: "Datos inválidos.", detalles: resultado.error.flatten().fieldErrors } }, 400);
  }

  const campos = resultado.data;
  const oldCat = existente.categoria;
  const oldOrden = existente.orden;
  const newCat = campos.categoria !== undefined && campos.categoria !== null ? campos.categoria : oldCat;
  // Si cambia de categoría y no se especifica un nuevo slot explícito,
  // el número de slot anterior no tiene significado en la nueva categoría — default a 0 (sin slot).
  const cambiaCategoria = campos.categoria !== undefined && campos.categoria !== oldCat;
  let newOrden: number;
  if (campos.orden !== undefined) {
    newOrden = campos.orden;
  } else if (cambiaCategoria) {
    newOrden = 0;
  } else {
    newOrden = oldOrden;
  }

  const statements: D1PreparedStatement[] = [];

  // Si cambia de categoría (Caso 5)
  if (newCat !== oldCat) {
    // 1. Reindexar origen
    if (oldOrden >= 1 && oldOrden <= 5) {
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > ? AND orden <= 5").bind(oldCat, oldOrden)
      );
      // Rellenar con orden=0 más nueva
      const candidato = await env.DB.prepare("SELECT id FROM obras WHERE categoria = ? AND orden = 0 ORDER BY fecha_creacion DESC LIMIT 1").bind(oldCat).first<{id: string}>();
      if (candidato) {
        statements.push(env.DB.prepare("UPDATE obras SET orden = 5 WHERE id = ?").bind(candidato.id));
      }
    }
    // 2. Insertar en destino
    if (newOrden >= 1 && newOrden <= 5) {
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = orden + 1 WHERE categoria = ? AND orden >= ? AND orden <= 5").bind(newCat, newOrden)
      );
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = 0 WHERE categoria = ? AND orden > 5").bind(newCat)
      );
    }
  }
  // Si mantiene categoría pero cambia slot (Caso 4)
  else if (newOrden !== oldOrden) {
    if (oldOrden === 0 && newOrden >= 1 && newOrden <= 5) {
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = orden + 1 WHERE categoria = ? AND orden >= ? AND orden <= 5").bind(newCat, newOrden)
      );
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = 0 WHERE categoria = ? AND orden > 5").bind(newCat)
      );
    } else if (oldOrden >= 1 && oldOrden <= 5 && newOrden === 0) {
      statements.push(
        env.DB.prepare("UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > ? AND orden <= 5").bind(newCat, oldOrden)
      );
      const candidato = await env.DB.prepare("SELECT id FROM obras WHERE categoria = ? AND orden = 0 AND id != ? ORDER BY fecha_creacion DESC LIMIT 1").bind(newCat, obraId).first<{id: string}>();
      if (candidato) {
        statements.push(env.DB.prepare("UPDATE obras SET orden = 5 WHERE id = ?").bind(candidato.id));
      }
    } else if (oldOrden >= 1 && oldOrden <= 5 && newOrden >= 1 && newOrden <= 5) {
      if (oldOrden < newOrden) {
        statements.push(
          env.DB.prepare("UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > ? AND orden <= ?").bind(newCat, oldOrden, newOrden)
        );
      } else {
        statements.push(
          env.DB.prepare("UPDATE obras SET orden = orden + 1 WHERE categoria = ? AND orden >= ? AND orden < ?").bind(newCat, newOrden, oldOrden)
        );
      }
    }
  }

  // Preparar UPDATE campos de la obra
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
  if (campos.imagenKey !== undefined) {
    updates.push("imagen_key = ?");
    values.push(campos.imagenKey);
  }
  if (campos.videoUrl !== undefined) {
    updates.push("video_url = ?");
    values.push(campos.videoUrl);
  }
  if (newOrden !== oldOrden) {
    updates.push("orden = ?");
    values.push(newOrden);
  }
  if (campos.destacado !== undefined) {
    updates.push("destacado = ?");
    values.push(campos.destacado ? 1 : 0);
  }

  if (updates.length > 0) {
    statements.push(
      env.DB.prepare(`UPDATE obras SET ${updates.join(", ")} WHERE id = ?`).bind(...values, obraId)
    );
  }

  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  // Solo después de confirmar que D1 se actualizó, limpiar la imagen vieja de R2
  if (campos.imagenKey !== undefined && existente.imagen_key && existente.imagen_key !== campos.imagenKey) {
    try {
      await env.BUCKET.delete(existente.imagen_key);
    } catch (err) {
      console.error(`Error eliminando objeto viejo R2 ${existente.imagen_key}:`, err);
    }
  }

  return jsonResponse({ actualizado: true });
}

/** DELETE /api/obras/:id */
export async function eliminarObra(
  _request: Request,
  env: Env,
  obraId: string,
): Promise<Response> {
  const obra = await env.DB.prepare("SELECT imagen_key, categoria, orden FROM obras WHERE id = ?").bind(obraId).first<{ imagen_key: string, categoria: string, orden: number }>();

  if (!obra) {
    return jsonResponse({ error: { codigo: "NO_ENCONTRADO", mensaje: "Obra no encontrada." } }, 404);
  }

  const statements: D1PreparedStatement[] = [];
  statements.push(env.DB.prepare("DELETE FROM obras WHERE id = ?").bind(obraId));

  // Reindexar (Caso 6)
  if (obra.orden >= 1 && obra.orden <= 5) {
    statements.push(
      env.DB.prepare("UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > ? AND orden <= 5").bind(obra.categoria, obra.orden)
    );
    const candidato = await env.DB.prepare("SELECT id FROM obras WHERE categoria = ? AND orden = 0 ORDER BY fecha_creacion DESC LIMIT 1").bind(obra.categoria).first<{id: string}>();
    if (candidato) {
      statements.push(env.DB.prepare("UPDATE obras SET orden = 5 WHERE id = ?").bind(candidato.id));
    }
  }

  await env.DB.batch(statements);

  // Borrar el objeto solo tras confirmar el cambio de D1. Si el batch falla,
  // la obra y su imagen siguen disponibles para un nuevo intento.
  try {
    await env.BUCKET.delete(obra.imagen_key);
  } catch (err) {
    console.error(`Error eliminando objeto R2 ${obra.imagen_key}:`, err);
  }

  return jsonResponse({ eliminado: true });
}
