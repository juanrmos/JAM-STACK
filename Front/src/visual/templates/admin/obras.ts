import { escapeHtml, imageSrc } from './html';

interface ObraResumen {
  id: string;
  titulo: string;
  servicio_id: string;
  imagenUrl: string;
}

export function renderTarjetasObras(obras: ObraResumen[]): string {
  if (obras.length === 0) return '<p class="obras-grilla__empty">No hay obras que coincidan con la búsqueda.</p>';
  return obras.map(obra => `
    <div class="grilla-card">
      <img src="${imageSrc(obra.imagenUrl)}" alt="${escapeHtml(obra.titulo)}" class="grilla-card__img" loading="lazy" />
      <div class="grilla-card__body">
        <strong>${escapeHtml(obra.titulo)}</strong>
        <span>${escapeHtml(obra.servicio_id)}</span>
        <div class="grilla-card__actions">
          <button class="btn-grilla-editar" data-id="${escapeHtml(obra.id)}">✏️ Editar</button>
          <button class="btn-grilla-borrar" data-id="${escapeHtml(obra.id)}">🗑️ Borrar</button>
        </div>
      </div>
    </div>
  `).join('');
}
