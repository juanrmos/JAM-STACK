import { camposCotizadorFijos, type CampoCotizador, type CampoCotizadorId } from '../../../Shared/contracts/cotizador';
import type { Env } from '../types';
import { jsonResponse } from '../routes/response';

const invalid = (mensaje: string) => jsonResponse({ error: { mensaje } }, 400);

export async function listarCamposCotizador(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT id,etiqueta,tipo,paso,requerido,habilitado,orden,opciones_json,limite FROM campos_cotizador ORDER BY paso,orden').all<Record<string, unknown>>();
  const map = new Map(results.map((row) => [String(row.id), row]));
  const campos = camposCotizadorFijos.map((fallback) => {
    const row = map.get(fallback.id);
    return row ? { id: fallback.id, etiqueta: String(row.etiqueta), tipo: fallback.tipo, paso: fallback.paso, requerido: Number(row.requerido) === 1, habilitado: Number(row.habilitado) === 1, orden: Number(row.orden), limite: fallback.limite, opciones: fallback.id === 'entorno' ? ['Interior', 'Exterior'] : [] } : { ...fallback, opciones: 'opciones' in fallback ? fallback.opciones : [] };
  });
  return jsonResponse({ campos });
}

export async function guardarCamposCotizador(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as { campos?: unknown } | null;
  if (!body || Object.keys(body).length !== 1 || !Array.isArray(body.campos) || body.campos.length !== camposCotizadorFijos.length) return invalid('Envía los ocho campos permitidos del cotizador.');
  const seen = new Set<string>();
  const updates: Array<{ id: CampoCotizadorId; etiqueta: string; requerido: number; habilitado: number }> = [];
  for (const value of body.campos) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Configuración de campo inválida.');
    const item = value as Record<string, unknown>;
    const def = camposCotizadorFijos.find((field) => field.id === item.id);
    if (!def || seen.has(def.id) || Object.keys(item).some((key) => !['id', 'etiqueta', 'requerido', 'habilitado'].includes(key))) return invalid('No se permiten campos ni claves personalizadas.');
    const etiqueta = typeof item.etiqueta === 'string' ? item.etiqueta.trim() : '';
    if (etiqueta.length < 1 || etiqueta.length > 60 || typeof item.requerido !== 'boolean' || typeof item.habilitado !== 'boolean') return invalid('Cada campo requiere un nombre válido y estados permitidos.');
    seen.add(def.id);
    updates.push({ id: def.id, etiqueta, requerido: Number(item.requerido), habilitado: Number(item.habilitado) });
  }
  if (updates.some((field) => !seen.has(field.id)) || updates.filter((field) => field.habilitado && field.requerido).length === 0) return invalid('Mantén al menos un campo obligatorio habilitado.');
  await env.DB.batch(updates.map((field) => env.DB.prepare('UPDATE campos_cotizador SET etiqueta=?,requerido=?,habilitado=? WHERE id=?').bind(field.etiqueta, field.requerido, field.habilitado, field.id)));
  return jsonResponse({ actualizado: true });
}
