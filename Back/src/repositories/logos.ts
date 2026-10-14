import type { Env } from '../types';
export async function consultarLogos(env: Env, activo: string | null, limit: number, offset: number) {
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

  return { results, total };
}
