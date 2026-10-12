import type { Obra } from '../../services/api/types';
import { prepararVideo } from './video';
export function renderObras(container: HTMLElement, template: HTMLTemplateElement, obras: Obra[], categoria: string) {
  for (const obra of obras) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const card = fragment.querySelector<HTMLElement>('.riel-tarjeta')!;
    card.classList.add(`riel-tarjeta--${['mural', 'cuadro'].includes(categoria) ? categoria : 'default'}`);
    const image = fragment.querySelector('img')!;
    image.src = obra.imagenUrl;
    image.alt = obra.titulo;
    fragment.querySelector('.riel-tarjeta__titulo')!.textContent = obra.titulo;
    if (obra.videoUrl && prepararVideo(obra.videoUrl)) {
      fragment.querySelector<HTMLElement>('.riel-tarjeta__video-badge')!.hidden = false;
      card.dataset.videoUrl = obra.videoUrl;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Ver video: ${obra.titulo}`);
    }
    container.append(fragment);
  }
}
