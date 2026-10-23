import { iniciarNavegacion } from './navigation';
import { iniciarContenido } from './content';
import { iniciarGalerias } from './gallery';
import { iniciarLightbox } from './lightbox';
import { iniciarCotizadorNuevo } from './quote';
import { obtenerLogoActivo } from '../../services/api/logos';
import { iniciarGaleriaSobreNosotros } from './about-gallery';
import { iniciarServiciosComplementarios } from './complementary';
import { actualizarFuenteImagen } from '../media/image-source';
import { actualizarFavicon } from '../brand/favicon';

export async function iniciarPublico(): Promise<void> {
  iniciarServiciosComplementarios();
  void iniciarGalerias();
  iniciarNavegacion();
  iniciarLightbox();
  iniciarCotizadorNuevo();
  void iniciarGaleriaSobreNosotros();

  const [logoResult] = await Promise.allSettled([obtenerLogoActivo(), iniciarContenido()]);
  if (logoResult.status === 'fulfilled' && logoResult.value) {
    const logo = logoResult.value;
    actualizarFavicon(logo.imagenUrl);
    const target = document.querySelector<HTMLElement>('.brand__mark');
    if (target) {
      const img = document.createElement('img');
      img.alt = 'Logo activo';
      img.width = 42;
      img.height = 42;
      void actualizarFuenteImagen(img, logo.imagenUrl).then((loaded) => {
        if (loaded) target.replaceChildren(img);
      });
    }
  }

  document.documentElement.dataset.publicState = 'ready';
}
