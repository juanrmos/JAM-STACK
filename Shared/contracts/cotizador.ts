export const camposCotizadorFijos = [
  { id: 'obra', etiqueta: 'Servicio o proyecto', tipo: 'text', paso: 1, requerido: true, habilitado: true, orden: 1, limite: 120 },
  { id: 'detalles', etiqueta: 'Detalles de la idea', tipo: 'textarea', paso: 1, requerido: false, habilitado: true, orden: 2, limite: 500 },
  { id: 'metros', etiqueta: 'Metros cuadrados aproximados', tipo: 'number', paso: 2, requerido: false, habilitado: true, orden: 3, limite: 8 },
  { id: 'entorno', etiqueta: 'Entorno', tipo: 'select', paso: 2, requerido: false, habilitado: true, orden: 4, limite: 40, opciones: ['Interior', 'Exterior'] },
  { id: 'altura', etiqueta: 'Piso o altura', tipo: 'text', paso: 2, requerido: false, habilitado: true, orden: 5, limite: 120 },
  { id: 'nombre', etiqueta: 'Nombre', tipo: 'text', paso: 3, requerido: false, habilitado: true, orden: 6, limite: 100 },
  { id: 'telefono', etiqueta: 'Teléfono o WhatsApp', tipo: 'tel', paso: 3, requerido: true, habilitado: true, orden: 7, limite: 30 },
  { id: 'correo', etiqueta: 'Correo electrónico', tipo: 'email', paso: 3, requerido: false, habilitado: true, orden: 8, limite: 160 },
] as const;

export type CampoCotizadorId = typeof camposCotizadorFijos[number]['id'];
export interface CampoCotizador {
  id: CampoCotizadorId;
  etiqueta: string;
  tipo: typeof camposCotizadorFijos[number]['tipo'];
  paso: 1 | 2 | 3;
  requerido: boolean;
  habilitado: boolean;
  orden: number;
  limite: number;
  opciones: string[];
}
