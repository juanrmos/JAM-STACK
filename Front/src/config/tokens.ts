/**
 * Tokens de diseño — fuente única de verdad para valores visuales.
 * Ningún componente debe tener un color, tamaño, o espaciado hardcodeado.
 * Referencia: doc 05, sección 2.
 */
export const tokens = {
  color: {
    fondo: "#F9F9F7",
    texto: "#2F4F4F",
    primario: "#DAA520",
    acentoSecundario: "#B0C4DE",
  },
  tipografia: {
    display: "'Newsreader', serif",
    // General Sans requiere licencia y self-hosting — DM Sans (Google Fonts) como fallback libre.
    cuerpo: "'General Sans', 'DM Sans', sans-serif",
    escala: {
      h1: "clamp(2.5rem, 5vw, 4rem)",
      h2: "2rem",
      cuerpo: "1rem",
    },
  },
  espaciado: {
    seccion: "6rem",
    tarjeta: "1.5rem",
  },
  radio: "4px",
} as const;
