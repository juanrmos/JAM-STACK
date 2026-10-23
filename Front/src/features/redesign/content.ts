import defaults from '../../../../Shared/contracts/textos.json';
import { actualizarNombresServicios } from './service-names';
import { apiJson } from '../../services/api/client';
import { actualizarFuenteImagen } from '../media/image-source';
import { fuentesPortada, tamanosPortada, tipografiaPortadaInicial, type TipografiaPortada } from '../../../../Shared/contracts/typografia-portada';

type Content = { textos: Record<string, string>; imagenes: Record<string, string | null> };
type ServiceCatalog = {
  servicios: import('../../../../Shared/contracts/servicios').ServicioPresentacion[];
  grupo_complementario?: { id: string; nombre_publico: string };
};
type PublicSnapshot = {
  version: 1;
  textos: Record<string, string>;
  imagenes: Record<string, string | null>;
  servicios: ServiceCatalog['servicios'];
  nombreGrupo: string;
  tipografia: TipografiaPortada;
};

const CACHE_KEY = 'corporacion-artistica:public-content:v1';
const fallbackText = Object.fromEntries(Object.entries(defaults).map(([key, item]) => [key, item.valor]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizarTipografia(value: unknown): TipografiaPortada {
  if (!isRecord(value)) return tipografiaPortadaInicial;
  const font = value.fuente;
  const size = value.escala_porcentaje;
  return {
    fuente: typeof font === 'string' && fuentesPortada.some((item) => item.id === font)
      ? font as TipografiaPortada['fuente']
      : tipografiaPortadaInicial.fuente,
    escala_porcentaje: typeof size === 'number' && tamanosPortada.some((item) => item === size)
      ? size as TipografiaPortada['escala_porcentaje']
      : tipografiaPortadaInicial.escala_porcentaje,
  };
}

function leerCache(): PublicSnapshot | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!isRecord(value) || value.version !== 1 || !isRecord(value.textos) || !isRecord(value.imagenes)) return null;
    return {
      version: 1,
      textos: Object.fromEntries(Object.entries(value.textos).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      imagenes: Object.fromEntries(Object.entries(value.imagenes).filter((entry): entry is [string, string | null] => entry[1] === null || typeof entry[1] === 'string')),
      servicios: Array.isArray(value.servicios) ? value.servicios as ServiceCatalog['servicios'] : [],
      nombreGrupo: typeof value.nombreGrupo === 'string' ? value.nombreGrupo : 'Servicios Complementarios',
      tipografia: normalizarTipografia(value.tipografia),
    };
  } catch {
    return null;
  }
}

function guardarCache(snapshot: PublicSnapshot): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // El sitio funciona aunque el navegador no permita guardar caché local.
  }
}

function renderStyled(group: string, data: Record<string, string>): void {
  const element = document.querySelector<HTMLElement>('[data-styled-title="' + group + '"]');
  if (!element) return;
  const title = data[group + '.title'];
  const accent = data[group + '.titleAccent'];
  if (!title) return;
  element.replaceChildren();
  const index = accent ? title.indexOf(accent) : -1;
  if (index < 0) {
    element.textContent = title;
    return;
  }
  element.append(document.createTextNode(title.slice(0, index)));
  const emphasis = document.createElement('em');
  emphasis.textContent = accent;
  element.append(emphasis, document.createTextNode(title.slice(index + accent.length)));
}

function aplicarImagenes(content: Content): void {
  const homeCover = content.imagenes['home.cover'];
  const homeImage = document.querySelector<HTMLImageElement>('[data-home-cover]');
  if (homeCover && homeImage) void actualizarFuenteImagen(homeImage, homeCover);

  document.querySelectorAll<HTMLImageElement>('[data-service-cover]').forEach((image) => {
    const id = image.dataset.serviceCover;
    const cover = id ? content.imagenes['service.' + id + '.cover'] : null;
    if (cover) void actualizarFuenteImagen(image, cover);
  });

  document.querySelectorAll<HTMLImageElement>('[data-service-cover-fallback]').forEach((image) => {
    const id = image.dataset.serviceCoverFallback;
    const cover = id ? content.imagenes['service.' + id + '.cover'] : null;
    if (cover) image.dataset.coverUrl = cover;
  });

  const profilePhoto = content.imagenes['profile.photo'];
  if (profilePhoto) {
    document.querySelectorAll<HTMLImageElement>('[data-profile-photo]').forEach((image) => {
      const frame = image.closest<HTMLElement>('[data-profile-avatar]');
      const fallback = frame?.querySelector<HTMLElement>('[data-profile-fallback]');
      void actualizarFuenteImagen(image, profilePhoto).then((loaded) => {
        if (!loaded) return;
        image.hidden = false;
        if (fallback) fallback.hidden = true;
      });
    });
    document.querySelectorAll<HTMLImageElement>('[data-profile-backdrop]').forEach((image) => {
      void actualizarFuenteImagen(image, profilePhoto).then((loaded) => {
        if (loaded) image.hidden = false;
      });
    });
  }

  document.dispatchEvent(new CustomEvent('app:service-covers-updated'));
}

function aplicarSnapshot(snapshot: PublicSnapshot): void {
  const values = { ...fallbackText, ...snapshot.textos };
  actualizarNombresServicios(snapshot.servicios);

  document.querySelectorAll<HTMLElement>('[data-service-group-display="complementarios"]').forEach((element) => {
    element.textContent = snapshot.nombreGrupo || 'Servicios Complementarios';
  });
  document.querySelectorAll<HTMLElement>('[data-service-group-aria="complementarios"]').forEach((element) => {
    element.setAttribute('aria-label', snapshot.nombreGrupo || 'Servicios Complementarios');
  });
  document.querySelectorAll<HTMLElement>('[data-text-key]').forEach((element) => {
    const key = element.dataset.textKey || '';
    if (values[key] !== undefined) element.textContent = values[key];
  });

  const aboutDescription = document.querySelector<HTMLElement>('[data-text-key="about.description"]');
  if (aboutDescription && values['about.description'].toLowerCase().includes('podrá editarse con información confirmada')) {
    aboutDescription.hidden = true;
    aboutDescription.textContent = '';
  }

  for (const group of ['home', 'archive', 'profile', 'about']) renderStyled(group, values);
  const homeTitle = document.querySelector<HTMLElement>('[data-styled-title="home"]');
  if (homeTitle) {
    homeTitle.dataset.titleFont = snapshot.tipografia.fuente;
    homeTitle.dataset.titleScale = String(snapshot.tipografia.escala_porcentaje);
  }

  aplicarImagenes({ textos: values, imagenes: snapshot.imagenes });
}

async function cargarSnapshot(base: PublicSnapshot | null): Promise<PublicSnapshot> {
  const options = { signal: AbortSignal.timeout(4500) };
  const results = await Promise.allSettled([
    apiJson<ServiceCatalog>('/api/servicios', options),
    apiJson<Content>('/api/contenido', options),
    apiJson<{ tipografia: TipografiaPortada }>('/api/tipografia-portada', options),
  ]);

  const services = results[0].status === 'fulfilled' && Array.isArray(results[0].value.servicios)
    ? results[0].value.servicios
    : base?.servicios || [];
  const content = results[1].status === 'fulfilled' && isRecord(results[1].value)
    ? results[1].value
    : { textos: base?.textos || {}, imagenes: base?.imagenes || {} };
  const typography = results[2].status === 'fulfilled' && isRecord(results[2].value.tipografia)
    ? results[2].value.tipografia
    : base?.tipografia || tipografiaPortadaInicial;
  const group = results[0].status === 'fulfilled'
    ? results[0].value.grupo_complementario?.nombre_publico?.trim()
    : base?.nombreGrupo;
  const snapshot: PublicSnapshot = {
    version: 1,
    textos: isRecord(content.textos) ? Object.fromEntries(Object.entries(content.textos).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : base?.textos || {},
    imagenes: isRecord(content.imagenes) ? Object.fromEntries(Object.entries(content.imagenes).filter((entry): entry is [string, string | null] => entry[1] === null || typeof entry[1] === 'string')) : base?.imagenes || {},
    servicios: services,
    nombreGrupo: group || 'Servicios Complementarios',
    tipografia: normalizarTipografia(typography),
  };

  if (results.every((result) => result.status === 'fulfilled')) guardarCache(snapshot);
  return snapshot;
}

export async function iniciarContenido(): Promise<void> {
  const cached = leerCache();
  if (cached) {
    aplicarSnapshot(cached);
    void cargarSnapshot(cached).then((fresh) => {
      if (JSON.stringify(fresh) === JSON.stringify(cached)) return;
      aplicarSnapshot(fresh);
    }).catch(() => {});
    return;
  }

  const fresh = await cargarSnapshot(null);
  aplicarSnapshot(fresh);
}
