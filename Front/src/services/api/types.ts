export interface Obra {
  id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  imagenUrl: string;
  videoUrl: string | null;
  orden: number;
  destacado: boolean;
}
export interface Logo { id: string; nombre: string; imagenUrl: string; activo: boolean }
export interface ObrasPage { obras: Obra[]; total: number; hasMore: boolean }
export interface LogosPage { logos: Logo[]; total: number; hasMore: boolean }
