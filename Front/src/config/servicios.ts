export interface Servicio { numero: string; titulo: string; subtitulo: string; imagen: string }
export const servicios: readonly Servicio[] = [
      { numero: "01", titulo: "Murales", subtitulo: "ESTILO ÚNICO MONUMENTAL", imagen: "/images/servicio-murales.jpg" },
      { numero: "02", titulo: "Esculturas", subtitulo: "ACABADOS DE LUJO A1", imagen: "/images/servicio-esculturas.jpg" },
      { numero: "03", titulo: "Restauración", subtitulo: "ESPACIOS Y MONUMENTOS", imagen: "/images/servicio-restauracion.jpg" },
      { numero: "04", titulo: "Diseños", subtitulo: "LETRAS, LOGOS Y SEÑALÉTICA", imagen: "/images/servicio-logos.jpg" },
      { numero: "05", titulo: "Fachadas", subtitulo: "INTERIORES Y EXTERIORES", imagen: "/images/servicio-fachadas.jpg" },
      { numero: "06", titulo: "Cuadros", subtitulo: "ÓLEO PERSONALIZADO", imagen: "/images/servicio-cuadros.jpg" },
    ];
