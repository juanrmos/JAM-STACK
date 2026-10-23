import { apiJson } from '../../services/api/client';
import { abrirLightboxGaleria } from './lightbox';
type FotoSobreNosotros = { id: string; imagenUrl: string; texto_alternativo: string; orden: number };
type PhotosPage = { fotos: FotoSobreNosotros[]; limite: number };

export async function iniciarGaleriaSobreNosotros() {
  const grid = document.getElementById('about-photos-grid');
  const status = document.getElementById('about-photos-status');
  if (!grid || !status) return;
  try {
    const page = await apiJson<PhotosPage>('/api/about/photos');
    grid.replaceChildren(...page.fotos.map((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'about-gallery__item';
      button.setAttribute('aria-label', `Ampliar fotografía ${index + 1}`);
      const image = document.createElement('img');
      image.src = photo.imagenUrl;
      image.alt = photo.texto_alternativo;
      image.loading = 'lazy';
      button.append(image);
      button.addEventListener('click', () => abrirLightboxGaleria(page.fotos, index, button));
      return button;
    }));
    status.textContent = page.fotos.length ? '' : 'Aún no hay fotografías disponibles.';
  } catch {
    status.textContent = 'No se pudieron cargar las fotografías.';
  }
}
