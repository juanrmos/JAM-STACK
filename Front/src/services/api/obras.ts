import { apiJson } from './client';
import type { ObrasPage } from './types';
export function listarObras(categoria: string, offset = 0, limit = 5) {
  const query = new URLSearchParams({ servicio_id: categoria, offset: String(offset), limit: String(limit) });
  return apiJson<ObrasPage>(`/api/obras?${query}`);
}
