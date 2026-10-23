import type { Categoria } from '../../../../Shared/contracts/categorias';
export interface Obra { id:string; titulo:string; descripcion:string|null; servicio_id:Categoria; imagenUrl:string; videoUrl:string|null; ubicacion:string|null; anio:number|null }
export interface Logo { id:string; nombre:string; imagenUrl:string; activo:boolean }
export interface ObrasPage { obras:Obra[]; total:number; hasMore:boolean }
export interface LogosPage { logos:Logo[]; total:number; hasMore:boolean }
