import type { Categoria } from './categorias';

export const clavesImagenesSitio = [
  'home.cover',
  'about.photo',
  'profile.photo',
  'service.mural.cover',
  'service.escultura.cover',
  'service.cuadro.cover',
  'service.restauracion.cover',
  'service.logo.cover',
  'service.fachada.cover',
] as const;

export type ImagenSitioClave = typeof clavesImagenesSitio[number];

export const clavePortadaServicio: Record<Categoria, ImagenSitioClave> = {
  mural: 'service.mural.cover',
  escultura: 'service.escultura.cover',
  cuadro: 'service.cuadro.cover',
  restauracion: 'service.restauracion.cover',
  logo: 'service.logo.cover',
  fachada: 'service.fachada.cover',
};
