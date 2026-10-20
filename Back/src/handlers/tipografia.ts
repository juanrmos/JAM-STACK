import { fuentesPortada, tamanosPortada, tipografiaPortadaInicial, type TipografiaPortada } from '../../../Shared/contracts/typografia-portada';
import type { Env } from '../types';
import { jsonResponse } from '../routes/response';

const invalid = (mensaje: string) => jsonResponse({ error: { mensaje } }, 400);

export async function leerTipografiaPortada(_request: Request, env: Env): Promise<Response> {
  const configuracion = await env.DB.prepare(
    'SELECT fuente, escala_porcentaje FROM configuracion_tipografia_portada WHERE id=1',
  ).first<TipografiaPortada>();

  return jsonResponse({ tipografia: configuracion ?? tipografiaPortadaInicial });
}

export async function guardarTipografiaPortada(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || Object.keys(body).length !== 1 || !body.tipografia || typeof body.tipografia !== 'object' || Array.isArray(body.tipografia)) {
    return invalid('Envía la configuración de tipografía.');
  }

  const value = body.tipografia as Record<string, unknown>;
  if (
    Object.keys(value).length !== 2
    || typeof value.fuente !== 'string'
    || !fuentesPortada.some(({ id }) => id === value.fuente)
    || typeof value.escala_porcentaje !== 'number'
    || !tamanosPortada.some((size) => size === value.escala_porcentaje)
  ) {
    return invalid('La fuente o el tamaño no están permitidos.');
  }

  const configuracion: TipografiaPortada = {
    fuente: value.fuente as TipografiaPortada['fuente'],
    escala_porcentaje: value.escala_porcentaje as TipografiaPortada['escala_porcentaje'],
  };
  await env.DB.prepare(`
    INSERT INTO configuracion_tipografia_portada (id, fuente, escala_porcentaje)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      fuente=excluded.fuente,
      escala_porcentaje=excluded.escala_porcentaje
  `).bind(configuracion.fuente, configuracion.escala_porcentaje).run();

  return jsonResponse({ actualizado: true, tipografia: configuracion });
}
