import { obtenerLogoActivo } from '../../services/api/logos';
import { actualizarFavicon } from './favicon';

export function iniciarFavicon(): void {
  void obtenerLogoActivo()
    .then((logo) => {
      if (!logo) return;

      const image = new Image();
      image.addEventListener('load', () => actualizarFavicon(logo.imagenUrl), { once: true });
      image.src = logo.imagenUrl;
    })
    .catch(() => {
      // Conserva los iconos estáticos si la API o el logo activo no están disponibles.
    });
}
