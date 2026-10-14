/**
 * Configuración central del sitio — datos de negocio.
 * Ningún componente debe importar valores de contacto, toggles de sección,
 * o datos del artista de otra fuente que no sea este archivo.
 * Referencia: doc 04, sección 3.
 */
export const siteConfig = {
  artista: {
    nombreEstudio: "Corporacion Antony Rodriguez",
    estilo: ["Exclusividad", "Excelencia plástica", "Rigor profesional"],
  },
  contacto: {
    whatsapp: "51949772875", // Número oficial del cliente para wa.me
    mensajeCotizacion:
      "Hola, quiero cotizar un mural de [obra] de [m² aprox], [interior o exterior], [piso/altura]. Te comparto mi direccion: [Direccion], [Referencia].",
  },
  secciones: {
    galeria: true,
    biografia: false,       // confirmado: sin biografía
    listaPrecios: false,    // fuera de alcance v1
    testimonios: false,     // fuera de alcance v1
  },
} as const;
