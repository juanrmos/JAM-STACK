import { escapeHtml, imageSrc } from './html';

interface ObraResumen {
  id: string;
  titulo: string;
  servicio_id: string;
  destacado_slot: number | null;
  imagenUrl: string;
}

export function renderSlotsObras(obras: ObraResumen[]): string {
  return Array.from({length: 5}, (_, index) => {
    const slot = index + 1;
    const obra = obras.find(item => item.destacado_slot === slot);
    return obra ? `
      <div class="slot-card slot-card--ocupado" data-id="${escapeHtml(obra.id)}">
        <img src="${imageSrc(obra.imagenUrl)}" alt="${escapeHtml(obra.titulo)}" class="slot-card__img" />
        <div class="slot-card__overlay">
          <button class="btn-slot-editar" data-id="${escapeHtml(obra.id)}">Editar</button>
        </div>
      </div>
    ` : `
      <div class="slot-card slot-card--vacio">
        <span class="slot-card__num">${slot}</span>
      </div>
    `;
  }).join('');
}

export function renderTarjetasObras(obras: ObraResumen[]): string {
  if (obras.length === 0) return '<p class="obras-grilla__empty">No hay obras que coincidan con la búsqueda.</p>';
  return obras.map(obra => `
    <div class="grilla-card">
      <img src="${imageSrc(obra.imagenUrl)}" alt="${escapeHtml(obra.titulo)}" class="grilla-card__img" loading="lazy" />
      <div class="grilla-card__body">
        <strong>${escapeHtml(obra.titulo)}</strong>
        <span>${escapeHtml(obra.servicio_id)} | Slot: ${obra.destacado_slot === null ? '-' : obra.destacado_slot}</span>
        <div class="grilla-card__actions">
          <button class="btn-grilla-editar" data-id="${escapeHtml(obra.id)}">✏️ Editar</button>
          <button class="btn-grilla-borrar" data-id="${escapeHtml(obra.id)}">🗑️ Borrar</button>
        </div>
      </div>
    </div>
  `).join('');
}

export function renderSlotsFormulario(obras: ObraResumen[], idActual: string | null, ordenElegido: number): string {
  return Array.from({length: 5}, (_, index) => {
    const slot = index + 1;
    const obra = obras.find(item => item.destacado_slot === slot);
    const isSelected = ordenElegido === slot;
    const selected = isSelected ? ' f-slot-card--selected' : '';
    if (obra?.id === idActual) return `
      <button type="button" class="f-slot-card f-slot-card--current${selected}" data-slot="${slot}" aria-pressed="${isSelected}" aria-label="Posición ${slot}, actual">
      </button>
    `;
    if (obra) return `
      <button type="button" class="f-slot-card f-slot-card--ocupado${selected}" data-slot="${slot}" aria-pressed="${isSelected}" aria-label="Posición ${slot}, ocupada">
        <img src="${imageSrc(obra.imagenUrl)}" alt="Ocupado" />
        <div class="f-slot-card__overlay"><span class="f-slot-card__num">${slot}</span></div>
      </button>
    `;
    return `
      <button type="button" class="f-slot-card f-slot-card--vacio${selected}" data-slot="${slot}" aria-pressed="${isSelected}" aria-label="Posición ${slot}, vacía">
        <span class="f-slot-card__num">${slot}</span>
      </button>
    `;
  }).join('');
}
