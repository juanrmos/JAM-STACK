/**
 * Diccionario de textos de interfaz — español.
 * Los textos de UI pasan por aquí, no se escriben directo en componentes.
 * Si en el futuro se necesita otro idioma, se agrega src/i18n/en.ts
 * sin reescribir componentes.
 * Referencia: doc 04, sección 4.
 */
export default {
  nav: {
    inicio: "Inicio",
    galeria: "Galería",
    cotizar: "Cotizar",
  },
  hero: {
    titulo: "Capturando la esencia en cada trazo.",
    palabraDestacada: "esencia",
    subtitulo:
      "Murales, Retratos y Esculturas personalizadas para transformar tu espacio con la maestría del realismo.",
    cta: "Cotizar Proyecto",
  },
  galeria: {
    titulo: "Galería de Obras",
    subtitulo:
      "Una selección de trabajos recientes que exploran la luz y la forma.",
  },
  precios: { titulo: "Precios" },
  testimonios: { titulo: "Lo que dicen nuestros clientes" },
  footer: {
    derechos: "Todos los derechos reservados.",
  },
} as const;
