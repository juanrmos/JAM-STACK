import { obtenerLogoActivo } from '../../services/api/logos';
export async function iniciarHero() {
  const image = document.querySelector<HTMLImageElement>('#hero-img-dinamica');
  if (!image) return;
  const fallback = image.src;
  image.addEventListener('error', () => { if (image.src !== fallback) image.src = fallback; });
  try {
    const logo = await obtenerLogoActivo();
    if (logo) image.src = logo.imagenUrl;
  } catch { /* La imagen estática sigue disponible incluso sin API. */ }
}
