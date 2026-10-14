import { prepararVideoPermitido } from '../../../../Shared/contracts/video.ts';

export const prepararVideo = prepararVideoPermitido;

export function iniciarVideo(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>('#video-modal')!;
  const iframe = dialog.querySelector('iframe')!;
  dialog.addEventListener('close', () => iframe.removeAttribute('src'));
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  const open = (target: EventTarget | null) => {
    const card = target instanceof Element ? target.closest<HTMLElement>('[data-video-url]') : null;
    const video = card?.dataset.videoUrl && prepararVideo(card.dataset.videoUrl);
    if (!video) return;
    if (video.tipo === 'tiktok') { window.open(video.url, '_blank', 'noopener,noreferrer'); return; }
    iframe.src = video.url;
    dialog.showModal();
  };
  root.addEventListener('click', event => open(event.target));
  root.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && (event.target as Element).matches('[data-video-url]')) {
      event.preventDefault(); open(event.target);
    }
  });
}
