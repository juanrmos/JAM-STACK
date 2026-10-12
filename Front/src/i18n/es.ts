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
    eyebrow: "Servicios que ofrecemos",
    titulo: "Hecho para perdurar.",
    subtitulo:
      "Del primer boceto al barniz final, cada encargo se construye con intención.",
  },
  galeria: {
    cargando: 'Cargando obras…',
    vacia: 'Aún no hay obras publicadas en el portafolio.',
    errorCategoria: 'Error al cargar las obras de esta categoría.',
    errorGeneral: 'No se pudieron cargar todas las categorías.',
    reintentar: 'Reintentar',
    eyebrow: "Obras y Referencias de nuestro Trabajo",
    titulo: "Colección de Obras.",
    subtitulo: "",
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
    eyebrow: '01',
    commissions: 'Private commissions',
    descripcion: 'Por favor comparte los detalles de tu proyecto. Nos pondremos en contacto contigo a la brevedad.',
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
