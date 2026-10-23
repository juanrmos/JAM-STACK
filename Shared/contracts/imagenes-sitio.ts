import type { Categoria } from './categorias';

export const clavesImagenesSitio = [
  'home.cover',
  'profile.photo',
  'service.mural.cover',
  'service.escultura.cover',
  'service.cuadro.cover',
  'service.restauracion.cover',
  'service.logo.cover',
  'service.fachada.cover',
  'service.materiales.cover',
  'service.electricos.cover',
  'service.drywall.cover',
] as const;

export type ImagenSitioClave = typeof clavesImagenesSitio[number];

export const clavePortadaServicio: Record<Categoria, ImagenSitioClave> = {
  mural: 'service.mural.cover',
  escultura: 'service.escultura.cover',
  cuadro: 'service.cuadro.cover',
  restauracion: 'service.restauracion.cover',
  logo: 'service.logo.cover',
  fachada: 'service.fachada.cover',
  materiales: 'service.materiales.cover',
  electricos: 'service.electricos.cover',
  drywall: 'service.drywall.cover',
};
