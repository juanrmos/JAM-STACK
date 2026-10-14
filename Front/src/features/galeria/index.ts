import { listarObras } from '../../services/api/obras';
import { renderObras } from './render';
import { iniciarVideo } from './video';
import textos from '../../i18n/es';

export async function iniciarGaleria() {
  const root = document.querySelector<HTMLElement>('#galeria');
  if (!root) return;
  const template = root.querySelector<HTMLTemplateElement>('#riel-tarjeta-template')!;
  iniciarVideo(root);
  let refreshSummary = () => {};
  const results = await Promise.all([...root.querySelectorAll<HTMLElement>('[data-categoria]')].map(async section => {
    const categoria = section.dataset.categoria!;
    const riel = section.querySelector<HTMLElement>('.galeria__riel-scroll')!;
    const prev = section.querySelector<HTMLButtonElement>('[data-dir="-1"]')!;
    const next = section.querySelector<HTMLButtonElement>('[data-dir="1"]')!;
    const status = section.querySelector<HTMLElement>('[data-estado]')!;
    const retry = section.querySelector<HTMLButtonElement>('[data-reintentar]')!;
    const state = { offset: 0, hasMore: true, loading: false, failed: false };
    const remaining = () => riel.scrollWidth - riel.clientWidth - riel.scrollLeft;
    const update = () => {
      prev.disabled = riel.scrollLeft <= 1;
      next.disabled = remaining() <= 1 && (!state.hasMore || state.loading || state.failed);
    };
    const load = async () => {
      if (state.loading || !state.hasMore) return;
      state.loading = true; state.failed = false; retry.hidden = true;
      status.textContent = textos.galeria.cargando; update();
      try {
        const page = await listarObras(categoria, state.offset);
        renderObras(riel, template, page.obras, categoria);
        state.offset += page.obras.length;
        state.hasMore = page.hasMore && page.obras.length > 0;
        section.hidden = state.offset === 0;
        status.textContent = '';
      } catch {
        state.failed = true; section.hidden = false;
        status.textContent = textos.galeria.errorCategoria;
        retry.hidden = false;
      } finally { state.loading = false; update(); }
    };
    const maybeLoad = () => {
      update();
      if (!state.failed && remaining() < riel.clientWidth / 2) void load();
    };
    riel.addEventListener('scroll', maybeLoad, { passive: true });
    new ResizeObserver(update).observe(riel);
    prev.addEventListener('click', () => riel.scrollBy({ left: -riel.clientWidth * .8, behavior: 'smooth' }));
    next.addEventListener('click', async () => {
      if (remaining() < riel.clientWidth / 2) await load();
      riel.scrollBy({ left: riel.clientWidth * .8, behavior: 'smooth' });
    });
    retry.addEventListener('click', () => void load().then(() => refreshSummary()));
    await load();
    return state;
  }));
  refreshSummary = () => {
    root.querySelector<HTMLElement>('#galeria-estado')!.textContent = results.some(s => s.offset > 0) ? '' : results.some(s => s.failed) ? textos.galeria.errorGeneral : textos.galeria.vacia;
  };
  refreshSummary();
}
