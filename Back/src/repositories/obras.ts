import type { Env } from '../types';
export async function consultarObras(env: Env, categoria: string | null, buscar: string | null, ordenFiltro: string | null, limit: number, offset: number) {
  let queryCount = "SELECT COUNT(*) as total FROM obras";
  let query = "SELECT * FROM obras";
  const condiciones: string[] = [];
  const params: unknown[] = [];

  if (categoria) {
    condiciones.push("categoria = ?");
    params.push(categoria);
  }

  if (buscar) {
    condiciones.push("titulo LIKE ? COLLATE NOCASE");
    params.push(`%${buscar}%`);
  }

  if (ordenFiltro === "1-5") {
    condiciones.push("orden >= 1 AND orden <= 5");
  }

  if (condiciones.length > 0) {
    const where = " WHERE " + condiciones.join(" AND ");
    query += where;
    queryCount += where;
  }

  // Ordenar de modo que orden=0 quede al final, y luego por orden ASC y fecha_creacion DESC
  query += " ORDER BY CASE WHEN orden = 0 THEN 1 ELSE 0 END ASC, orden ASC, fecha_creacion DESC LIMIT ? OFFSET ?";

  const countResult = await env.DB.prepare(queryCount)
    .bind(...params)
    .first<{ total: number }>();
  const total = countResult?.total || 0;

  const { results } = await env.DB.prepare(query)
    .bind(...params, limit, offset)
    .all();

  return { results, total };
}
