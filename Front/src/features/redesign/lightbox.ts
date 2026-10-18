import type { Obra } from '../../services/api/types';
import { servicios } from '../../config/servicios';
import { prepararVideoPermitido } from '../../../../Shared/contracts/video';

type LightboxState = {
  kind: 'image';
  index: number;
};

let list: Obra[] = [];
let index = 0;
let returnFocus: HTMLElement | null = null;
let closing = false;

const get = (id: string) => document.getElementById(id);

function isLightboxState(state: unknown): state is { view?: string; lightbox: LightboxState } {
  if (!state || typeof state !== 'object') return false;
  const candidate = state as { lightbox?: Partial<LightboxState> };
  return candidate.lightbox?.kind === 'image' && Number.isInteger(candidate.lightbox.index);
}

function lightboxVisible() {
  return get('lightbox')?.hidden === false;
}

function show() {
  get('lightbox-overlay')!.hidden = false;
  get('lightbox')!.hidden = false;
  document.body.classList.add('no-scroll');
  document.querySelector<HTMLElement>('[data-close-lightbox]')?.focus();
}

function hide() {
  get('lightbox-overlay')!.hidden = true;
  get('lightbox')!.hidden = true;
  document.body.classList.remove('no-scroll');
  if (returnFocus?.isConnected && !returnFocus.closest('[hidden]')) returnFocus.focus();
}

function updateHistoryIndex() {
  const state = window.history.state;
  if (!isLightboxState(state)) return;
  window.history.replaceState(
    { ...state, lightbox: { ...state.lightbox, index } },
    '',
    window.location.href,
  );
}

function render() {
  const obra = list[index];
  if (!obra) return;
  const img = get('lightbox-img') as HTMLImageElement;
  img.src = obra.imagenUrl;
  img.alt = obra.titulo;
  get('lightbox-category')!.textContent = servicios.find((service) => service.id === obra.servicio_id)?.titulo || obra.servicio_id;
  get('lightbox-title')!.textContent = obra.titulo;
  get('lightbox-meta')!.textContent = [obra.ubicacion, obra.anio].filter(Boolean).join(' · ');
  const videoLink = get('lightbox-video') as HTMLAnchorElement | null;
  const video = obra.videoUrl ? prepararVideoPermitido(obra.videoUrl) : null;
  if (videoLink) {
    videoLink.hidden = !video;
    if (video) videoLink.href = video.url;
    else videoLink.removeAttribute('href');
  }
  updateHistoryIndex();
}

export function abrirLightbox(obras: Obra[], position: number, opener: HTMLElement) {
  if (!obras.length) return;
  const alreadyOpen = lightboxVisible();
  list = obras;
  index = ((position % list.length) + list.length) % list.length;
  returnFocus = opener;
  closing = false;
  render();

  const state = window.history.state;
  if (alreadyOpen && isLightboxState(state)) {
    updateHistoryIndex();
  } else {
    const routeView = new URL(window.location.href).searchParams.get('vista') || 'inicio';
    const baseState = state && typeof state === 'object' ? state as Record<string, unknown> : {};
    window.history.pushState(
      { ...baseState, view: routeView, lightbox: { kind: 'image', index } },
      '',
      window.location.href,
    );
  }
  show();
}

export function cerrarLightbox() {
  if (!lightboxVisible() || closing) return;
  if (isLightboxState(window.history.state)) {
    closing = true;
    window.history.back();
    return;
  }
  hide();
}

function sincronizarHistorial(event: PopStateEvent) {
  closing = false;
  if (isLightboxState(event.state)) {
    if (!list.length) {
      window.history.back();
      return;
    }
    index = ((event.state.lightbox.index % list.length) + list.length) % list.length;
    render();
    show();
    return;
  }
  if (lightboxVisible()) hide();
}

export function iniciarLightbox() {
  document.querySelector('[data-close-lightbox]')?.addEventListener('click', cerrarLightbox);
  get('lightbox-overlay')?.addEventListener('click', cerrarLightbox);
  document.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => {
    index = (index - 1 + list.length) % list.length;
    render();
  });
  document.querySelector('[data-lightbox-next]')?.addEventListener('click', () => {
    index = (index + 1) % list.length;
    render();
  });
  window.addEventListener('popstate', sincronizarHistorial);
  document.addEventListener('keydown', (event) => {
    if (!lightboxVisible()) return;
    if (event.key === 'Escape') cerrarLightbox();
    if (event.key === 'ArrowLeft') {
      index = (index - 1 + list.length) % list.length;
      render();
    }
    if (event.key === 'ArrowRight') {
      index = (index + 1) % list.length;
      render();
    }
  });
}
