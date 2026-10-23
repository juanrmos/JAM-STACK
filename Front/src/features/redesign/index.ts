import { iniciarNavegacion } from './navigation';
import { iniciarContenido } from './content';
import { iniciarGalerias } from './gallery';
import { iniciarLightbox } from './lightbox';
import { iniciarCotizadorNuevo } from './quote';
import { obtenerLogoActivo } from '../../services/api/logos';
import { iniciarGaleriaSobreNosotros } from './about-gallery';
import { iniciarServiciosComplementarios } from './complementary';

export function iniciarPublico() {
  iniciarServiciosComplementarios();
  iniciarNavegacion();
  iniciarLightbox();
  iniciarCotizadorNuevo();
  void iniciarContenido();
  void iniciarGalerias();
  void iniciarGaleriaSobreNosotros();

  void obtenerLogoActivo()
    .then((logo) => {
      if (!logo) return;

      const target = document.querySelector<HTMLElement>('.brand__mark');
      if (!target) return;

      const img = document.createElement('img');
      img.alt = 'Logo activo';
      img.width = 42;
      img.height = 42;
      img.src = logo.imagenUrl;
      target.replaceChildren(img);
    })
    .catch(() => {
      // Conserva el monograma si la API del logo no está disponible.
    });
}
