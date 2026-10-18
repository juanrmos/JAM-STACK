import type { Categoria } from '../../../Shared/contracts/categorias';
export interface Servicio { id: Categoria; numero: string; imagen: string }
export const servicios: readonly Servicio[] = [
  {
    "id": "mural",
    "numero": "01",
    "imagen": "/images/servicio-murales.jpg"
  },
  {
    "id": "escultura",
    "numero": "02",
    "imagen": "/images/servicio-esculturas.jpg"
  },
  {
    "id": "cuadro",
    "numero": "03",
    "imagen": "/images/servicio-cuadros.jpg"
  },
  {
    "id": "restauracion",
    "numero": "04",
    "imagen": "/images/servicio-restauracion.jpg"
  },
  {
    "id": "logo",
    "numero": "05",
    "imagen": "/images/servicio-logos.jpg"
  },
  {
    "id": "fachada",
    "numero": "06",
    "imagen": "/images/servicio-fachadas.jpg"
  }
];
