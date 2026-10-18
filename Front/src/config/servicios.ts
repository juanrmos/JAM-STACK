import type { Categoria } from '../../../Shared/contracts/categorias';
export interface Servicio { id: Categoria; numero: string; titulo: string; corto: string; imagen: string }
export const servicios: readonly Servicio[] = [
  {
    "id": "mural",
    "numero": "01",
    "titulo": "Murales monumentales",
    "corto": "Murales",
    "imagen": "/images/servicio-murales.jpg"
  },
  {
    "id": "escultura",
    "numero": "02",
    "titulo": "Esculturas",
    "corto": "Esculturas",
    "imagen": "/images/servicio-esculturas.jpg"
  },
  {
    "id": "cuadro",
    "numero": "03",
    "titulo": "Cuadros personalizados",
    "corto": "Cuadros",
    "imagen": "/images/servicio-cuadros.jpg"
  },
  {
    "id": "restauracion",
    "numero": "04",
    "titulo": "Restauración",
    "corto": "Restauración",
    "imagen": "/images/servicio-restauracion.jpg"
  },
  {
    "id": "logo",
    "numero": "05",
    "titulo": "Letras y logotipos",
    "corto": "Letras",
    "imagen": "/images/servicio-logos.jpg"
  },
  {
    "id": "fachada",
    "numero": "06",
    "titulo": "Pintado de fachadas",
    "corto": "Fachadas",
    "imagen": "/images/servicio-fachadas.jpg"
  }
];
