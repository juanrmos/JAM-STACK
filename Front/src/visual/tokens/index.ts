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
    textoSecundario: "#6B7B7B",   // Gris suave para subtítulos y metadatos
    bordeLinea: "rgba(47, 79, 79, 0.12)", // Líneas divisorias finas del diseño editorial
  },
  tipografia: {
    display: "'Newsreader', serif",
    // General Sans requiere licencia y self-hosting — DM Sans (Google Fonts) como fallback libre.
    cuerpo: "'General Sans', 'DM Sans', sans-serif",
    escala: {
      h1: "clamp(3rem, 6vw, 5.5rem)",
      h2: "clamp(2rem, 4vw, 3.5rem)",
      cuerpo: "0.875rem", /* 14px default base */
    },
  },
  espaciado: {
    seccion: "6rem",
    tarjeta: "1.5rem",
  },
  radio: "4px",
} as const;
