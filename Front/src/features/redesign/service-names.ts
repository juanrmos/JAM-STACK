import { categorias, type Categoria } from '../../../../Shared/contracts/categorias';
import { nombresPublicosIniciales, type ServicioPresentacion } from '../../../../Shared/contracts/servicios';

const names = new Map<Categoria, string>(categorias.map((id) => [id, nombresPublicosIniciales[id]]));

export function nombreServicio(id: string | undefined): string {
  return id && categorias.includes(id as Categoria) ? names.get(id as Categoria)! : id || 'Servicio';
}

export function actualizarNombresServicios(services: ServicioPresentacion[]): void {
  for (const service of services) {
    if (!categorias.includes(service.id) || !service.nombre_publico?.trim()) continue;
    names.set(service.id, service.nombre_publico.trim());
  }
  document.querySelectorAll<HTMLElement>('[data-service-name-display]').forEach((element) => {
    element.textContent = nombreServicio(element.dataset.serviceNameDisplay);
  });
  document.querySelectorAll<HTMLElement>('[data-service-name-aria]').forEach((element) => {
    const name = nombreServicio(element.dataset.serviceNameAria);
    const template = element.dataset.serviceNameAriaTemplate;
    if (template) element.setAttribute('aria-label', template.replace('{name}', name));
  });
  document.dispatchEvent(new CustomEvent('app:service-names-updated'));
}

export function nombresServiciosActuales(): ServicioPresentacion[] {
  return categorias.map((id) => ({ id, nombre_publico: nombreServicio(id) }));
}
