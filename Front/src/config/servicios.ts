import type { Categoria } from '../../../Shared/contracts/categorias';
export interface Servicio { id: Categoria; numero: string; imagen: string; dock: boolean; cotizaPorWhatsApp?: boolean }
export const servicios: readonly Servicio[] = [
  {
    "id": "mural", "dock": true,
    "numero": "01",
    "imagen": "/images/servicio-murales.jpg"
  },
  {
    "id": "escultura", "dock": true,
    "numero": "02",
    "imagen": "/images/servicio-esculturas.jpg"
  },
  {
    "id": "cuadro", "dock": true,
    "numero": "03",
    "imagen": "/images/servicio-cuadros.jpg"
  },
  {
    "id": "restauracion", "dock": true,
    "numero": "04",
    "imagen": "/images/servicio-restauracion.jpg"
  },
  {
    "id": "logo", "dock": true,
    "numero": "05",
    "imagen": "/images/servicio-logos.jpg"
  },
  {
    "id": "fachada", "dock": true,
    "numero": "06",
    "imagen": "/images/servicio-fachadas.jpg"
  },
  { id: 'materiales', numero: '08', imagen: '/images/servicio-cuadros.jpg', dock: true, cotizaPorWhatsApp: true },
  { id: 'electricos', numero: '08', imagen: '/images/servicio-fachadas.jpg', dock: false },
  { id: 'drywall', numero: '09', imagen: '/images/servicio-restauracion.jpg', dock: false }
];
