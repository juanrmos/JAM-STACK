import { registrarServiceWorker } from './registerServiceWorker';
import { notificarActualizaciones } from './updateNotifier';
export function iniciarPwa() {
  // Local tests must never reuse a cached production build on this origin.
  if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) return;
  registrarServiceWorker();
  notificarActualizaciones(() => {
    const banner = document.querySelector<HTMLElement>('#pwa-update-banner');
    if (banner) banner.hidden = false;
  });
  document.querySelector('[data-pwa-reload]')?.addEventListener('click', () => location.reload());
}
