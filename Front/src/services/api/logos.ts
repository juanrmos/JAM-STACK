import { apiJson } from './client';
import type { LogosPage } from './types';
export async function obtenerLogoActivo() {
  return (await apiJson<LogosPage>('/api/logos?activo=1')).logos[0] ?? null;
}
