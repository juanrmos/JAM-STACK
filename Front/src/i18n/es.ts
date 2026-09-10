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
    servicios: "Servicios",
    galeria: "Galería",
    cotizar: "Cotizar",
  },
  hero: {
    eyebrow: "ARTISTA PLÁSTICO / HUÁNUCO",
    titulo: "Capturando la esencia en cada trazo.",
    palabraDestacada: "esencia",
    subtitulo:
      "Murales, esculturas y proyectos integrales que transforman espacios con la maestría del realismo.",
    cta: "COTIZAR PROYECTO →",
    obraDestacada: "OBRA DESTACADA",
  },
  servicios: {
    eyebrow: "01 / LA PRÁCTICA",
    titulo: "Hecho para perdurar.",
    subtitulo:
      "Del primer boceto al barniz final, cada encargo se construye con intención.",
    items: [
      { numero: "01", titulo: "Murales", subtitulo: "ESTILO ÚNICO MONUMENTAL", imagen: "/images/servicio-murales.jpg" },
      { numero: "02", titulo: "Esculturas", subtitulo: "ACABADOS DE LUJO A1", imagen: "/images/servicio-esculturas.jpg" },
      { numero: "03", titulo: "Restauración", subtitulo: "ESPACIOS Y MONUMENTOS", imagen: "/images/servicio-restauracion.jpg" },
      { numero: "04", titulo: "Diseños", subtitulo: "LETRAS, LOGOS Y SEÑALÉTICA", imagen: "/images/servicio-logos.jpg" },
      { numero: "05", titulo: "Fachadas", subtitulo: "INTERIORES Y EXTERIORES", imagen: "/images/servicio-fachadas.jpg" },
      { numero: "06", titulo: "Cuadros", subtitulo: "ÓLEO PERSONALIZADO", imagen: "/images/servicio-cuadros.jpg" },
    ],
  },
  galeria: {
    eyebrow: "02 / OBRAS SELECCIONADAS",
    titulo: "El archivo.",
    subtitulo:
      "Desliza para explorar encargos recientes, estudios y obras a gran escala.",
    rieles: {
      murales: "Murales Magistrales",
      cuadros: "Cuadros al Óleo",
    },
  },
  footer: {
    branding:
      "Una práctica contemporánea de pintura realista, murales y escultura. Hecho lento. Hecho para perdurar.",
    explorar: "EXPLORAR",
    estudio: "ESTUDIO",
    ubicacion: "Huánuco, Perú",
    derechos: "Todos los derechos reservados.",
    lema: "REALISMO / OFICIO / INTENCIÓN",
  },
  cotizador: {
    titulo: "COTIZADOR.",
    campos: {
      obra: "¿QUÉ OBRA TIENES EN MENTE?",
      medidas: "M² APROX.",
      ubicacion: "¿INTERIOR O EXTERIOR?",
      altura: "PISO O ALTURA",
      direccion: "DIRECCIÓN",
      referencia: "REFERENCIA",
    },
    enviar: "ENVIAR A WHATSAPP",
  },
  precios: { titulo: "Precios" },
  testimonios: { titulo: "Lo que dicen nuestros clientes" },
} as const;
