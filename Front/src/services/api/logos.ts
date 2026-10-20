import { apiJson } from './client';
import type { LogosPage } from './types';
let logoActivoRequest: Promise<LogosPage['logos'][number] | null> | undefined;

export async function obtenerLogoActivo() {
  logoActivoRequest ??= apiJson<LogosPage>('/api/logos?activo=1').then((page) => page.logos[0] ?? null);
  return logoActivoRequest;
}
