import { tokens } from './index';

// Keep the design variables in one place for both public and admin layouts.
export const cssVars = [
  `--color-fondo: ${tokens.color.fondo}`,
  `--color-texto: ${tokens.color.texto}`,
  `--color-primario: ${tokens.color.primario}`,
  `--color-acento: ${tokens.color.acentoSecundario}`,
  `--color-texto-sec: ${tokens.color.textoSecundario}`,
  `--color-borde: ${tokens.color.bordeLinea}`,
  `--font-display: ${tokens.tipografia.display}`,
  `--font-cuerpo: ${tokens.tipografia.cuerpo}`,
  `--tam-h1: ${tokens.tipografia.escala.h1}`,
  `--tam-h2: ${tokens.tipografia.escala.h2}`,
  `--tam-cuerpo: ${tokens.tipografia.escala.cuerpo}`,
  `--espaciado-seccion: ${tokens.espaciado.seccion}`,
  `--espaciado-tarjeta: ${tokens.espaciado.tarjeta}`,
  `--radio-base: ${tokens.radio}`,
].join(';');
