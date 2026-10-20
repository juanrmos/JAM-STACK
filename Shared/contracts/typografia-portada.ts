export const fuentesPortada = [
  { id: 'cormorant-garamond', nombre: 'Cormorant Garamond' },
  { id: 'fraunces', nombre: 'Fraunces' },
  { id: 'lora', nombre: 'Lora' },
  { id: 'playfair', nombre: 'Playfair Display' },
  { id: 'dm-serif-display', nombre: 'DM Serif Display' },
  { id: 'young-serif', nombre: 'Young Serif' },
  { id: 'libre-baskerville', nombre: 'Libre Baskerville' },
] as const;

export type FuentePortada = (typeof fuentesPortada)[number]['id'];
export const tamanosPortada = [75, 80, 85, 90, 95, 100] as const;
export type EscalaPortada = (typeof tamanosPortada)[number];

export interface TipografiaPortada {
  fuente: FuentePortada;
  escala_porcentaje: EscalaPortada;
}

export const tipografiaPortadaInicial: TipografiaPortada = {
  fuente: 'cormorant-garamond',
  escala_porcentaje: 100,
};
