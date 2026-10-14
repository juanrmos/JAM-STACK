import { escapeHtml, imageSrc } from './html';

interface LogoResumen {
  id: string;
  nombre: string;
  imagenUrl: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export function renderLogoActivo(logo?: LogoResumen): string {
  if (!logo) return `
    <div class="logo-activo-card logo-activo-card--empty">
      <img src="/logo-default.png" alt="Default" class="logo-activo-card__img logo-activo-card__img--placeholder" />
      <div class="logo-activo-card__info">
        <strong>No hay logo activo</strong>
        <span>Se mostrará el logo por defecto en el sitio público.</span>
      </div>
    </div>
  `;
  const fecha = new Date(logo.fechaActualizacion || logo.fechaCreacion || '').toLocaleDateString();
  return `
    <div class="logo-activo-card">
      <img src="${imageSrc(logo.imagenUrl)}" alt="${escapeHtml(logo.nombre)}" class="logo-activo-card__img" />
      <div class="logo-activo-card__info">
        <strong>${escapeHtml(logo.nombre)}</strong>
        <span class="logo-activo-card__badge">ACTIVO DESDE: ${escapeHtml(fecha)}</span>
      </div>
    </div>
  `;
}

export function renderAlmacenLogos(logos: LogoResumen[]): string {
  if (logos.length === 0) return '<p class="almacen-bloque__empty">El almacén está vacío. Sube tu primer logo.</p>';
  return logos.map(logo => `
    <div class="almacen-card ${logo.activo ? 'almacen-card--activo' : ''}">
      <div class="almacen-card__img-wrapper">
        <img src="${imageSrc(logo.imagenUrl)}" alt="${escapeHtml(logo.nombre)}" loading="lazy" />
      </div>
      <div class="almacen-card__body">
        <div class="almacen-card__header">
          <strong>${escapeHtml(logo.nombre)}</strong>
          ${logo.activo ? '<span class="badge badge--activo">ACTIVO</span>' : '<span class="badge">INACTIVO</span>'}
        </div>
        <div class="almacen-card__actions">
          ${!logo.activo ? `<button class="btn-accion btn-activar" data-id="${escapeHtml(logo.id)}">Activar</button>` : ''}
          <button class="btn-accion btn-editar" data-id="${escapeHtml(logo.id)}">Editar</button>
          <button class="btn-accion btn-borrar" data-id="${escapeHtml(logo.id)}">Borrar</button>
        </div>
      </div>
    </div>
  `).join('');
}
