import { servicios } from '../../config/servicios';
import type { Obra, ObrasPage } from '../../services/api/types';
import { apiJson } from '../../services/api/client';
import { abrirLightbox } from './lightbox';
import { nombreServicio } from './service-names';
import { actualizarFuenteImagen } from '../media/image-source';

const obrasPorServicio = new Map<string, Obra[]>();
const totalObrasPorServicio = new Map<string, number>();
const indiceActivo = new Map<string, number>();
const erroresServicio = new Set<string>();
const masObrasDisponibles = new Map<string, boolean>();
const cargasPendientes = new Map<string, Promise<void>>();
const cargasIniciales = new Map<string, Promise<void>>();
const cargasCompletas = new Map<string, Promise<Obra[]>>();
const TAMANO_PAGINA_CINTA = 5;
const MAX_OBRAS_CINTA = 100;
let archivo: Obra[] | null = null;
let filtro = 'all';
let offsetArchivo = 0;
let cargandoArchivo = false;
let hayMasObras = true;

const get = (id: string) => document.getElementById(id);
const cargarServicio = (id: string, offset = 0, limite = TAMANO_PAGINA_CINTA) =>
  apiJson<ObrasPage>(`/api/obras?servicio_id=${id}&limit=${limite}&offset=${offset}`);

function actualizarControlesCinta(id: string): void {
  const ribbon = document.querySelector<HTMLElement>(`[data-service-ribbon="${id}"]`);
  if (!ribbon) return;

  const obras = obrasPorServicio.get(id) || [];
  const total = Math.min(totalObrasPorServicio.get(id) || obras.length, MAX_OBRAS_CINTA);
  const indice = obras.length ? Math.min(indiceActivo.get(id) || 0, obras.length - 1) : 0;
  const paginaInicio = obras.length ? Math.floor(indice / TAMANO_PAGINA_CINTA) * TAMANO_PAGINA_CINTA : 0;
  const desde = obras.length ? paginaInicio + 1 : 0;
  const hasta = obras.length ? Math.min(paginaInicio + TAMANO_PAGINA_CINTA, total) : 0;
  const counter = ribbon.querySelector<HTMLElement>(`[data-ribbon-count="${id}"]`);
  if (counter) counter.textContent = `OBRAS · ${desde}–${hasta} / ${total}`;

  const previous = ribbon.querySelector<HTMLButtonElement>('[data-ribbon-page="prev"]');
  const next = ribbon.querySelector<HTMLButtonElement>('[data-ribbon-page="next"]');
  if (previous) previous.disabled = paginaInicio === 0;
  if (next) next.disabled = paginaInicio + TAMANO_PAGINA_CINTA >= total;
}

async function cambiarPaginaCinta(id: string, direccion: 'prev' | 'next'): Promise<void> {
  const obras = obrasPorServicio.get(id) || [];
  const indice = indiceActivo.get(id) || 0;
  const inicioPagina = Math.floor(indice / TAMANO_PAGINA_CINTA) * TAMANO_PAGINA_CINTA;
  const destino = direccion === 'next' ? inicioPagina + TAMANO_PAGINA_CINTA : Math.max(0, inicioPagina - TAMANO_PAGINA_CINTA);

  if (destino >= obras.length && direccion === 'next' && masObrasDisponibles.get(id)) {
    await cargarSiguienteTanda(id);
  }

  const actualizadas = obrasPorServicio.get(id) || [];
  if (destino < actualizadas.length) {
    indiceActivo.set(id, destino);
    renderizarServicio(id);
  }
}

async function moverObra(id: string, direccion: 'prev' | 'next'): Promise<void> {
  const obras = obrasPorServicio.get(id) || [];
  const seleccionado = Math.min(indiceActivo.get(id) || 0, obras.length - 1);
  if (direccion === 'prev') {
    if (seleccionado > 0) indiceActivo.set(id, seleccionado - 1);
  } else if (seleccionado + 1 < obras.length) {
    indiceActivo.set(id, seleccionado + 1);
  } else {
    await cargarSiguienteTanda(id);
    if ((obrasPorServicio.get(id)?.length || 0) > obras.length) indiceActivo.set(id, obras.length);
  }
  renderizarServicio(id);
}

async function cargarSiguienteTanda(id: string): Promise<void> {
  const actual = obrasPorServicio.get(id) || [];
  if (actual.length >= MAX_OBRAS_CINTA || !masObrasDisponibles.get(id)) return;
  const pending = cargasPendientes.get(id);
  if (pending) return pending;
  const request = (async () => {
    try {
      const page = await cargarServicio(id, actual.length, Math.min(TAMANO_PAGINA_CINTA, MAX_OBRAS_CINTA - actual.length));
      obrasPorServicio.set(id, [...actual, ...page.obras].slice(0, MAX_OBRAS_CINTA));
      totalObrasPorServicio.set(id, page.total);
      masObrasDisponibles.set(id, page.hasMore && actual.length + page.obras.length < MAX_OBRAS_CINTA);
      renderizarServicio(id);
    } catch {
      masObrasDisponibles.set(id, false);
    } finally {
      cargasPendientes.delete(id);
    }
  })();
  cargasPendientes.set(id, request);
  return request;
}

async function cargarObrasParaLightbox(id: string): Promise<Obra[]> {
  const actual = obrasPorServicio.get(id) || [];
  if (actual.length >= MAX_OBRAS_CINTA || actual.length >= (totalObrasPorServicio.get(id) || 0)) return actual;
  const pending = cargasCompletas.get(id);
  if (pending) return pending;

  const request = (async () => {
    try {
      const page = await cargarServicio(id, 0, MAX_OBRAS_CINTA);
      const obras = page.obras.slice(0, MAX_OBRAS_CINTA);
      obrasPorServicio.set(id, obras);
      totalObrasPorServicio.set(id, page.total);
      masObrasDisponibles.set(id, page.hasMore && obras.length < MAX_OBRAS_CINTA);
      actualizarControlesCinta(id);
      return obras;
    } catch {
      return obrasPorServicio.get(id) || [];
    } finally {
      cargasCompletas.delete(id);
    }
  })();
  cargasCompletas.set(id, request);
  return request;
}

function renderizarGaleriaServicio(id: string, obras: Obra[]) {
  const servicio = servicios.find((item) => item.id === id);
  const miniaturas = document.querySelector<HTMLElement>(`[data-thumbs="${id}"]`);
  const principal = document.querySelector<HTMLButtonElement>(`[data-active-image="${id}"]`);
  if (!servicio || !miniaturas || !principal) return;

  if (erroresServicio.has(id)) {
    miniaturas.replaceChildren();
    const estado = document.createElement('p');
    estado.className = 'collection-status';
    estado.setAttribute('role', 'status');
    estado.textContent = 'No se pudieron cargar los proyectos. Vuelve a esta vista para reintentar.';
    miniaturas.append(estado);
    principal.disabled = true;
    principal.dataset.galleryState = 'error';
    principal.removeAttribute('aria-busy');
    principal.querySelector('small')!.textContent = 'Error al cargar las obras';
    principal.closest<HTMLElement>('[data-gallery-panel], .service-view')?.querySelectorAll<HTMLButtonElement>('[data-slide]')
      .forEach((button) => { button.disabled = true; });
    actualizarControlesCinta(id);
    return;
  }

  const seleccionado = Math.min(indiceActivo.get(id) || 0, obras.length - 1);
  indiceActivo.set(id, Math.max(0, seleccionado));

  const paginaInicio = Math.floor(seleccionado / TAMANO_PAGINA_CINTA) * TAMANO_PAGINA_CINTA;
  const obrasPagina = obras.slice(paginaInicio, paginaInicio + TAMANO_PAGINA_CINTA);
  const buttons = [...miniaturas.querySelectorAll<HTMLButtonElement>('button[data-obra-id]')];
  const currentIds = buttons.map((button) => button.dataset.obraId);
  const expectedIds = obrasPagina.map((obra) => obra.id);
  if (currentIds.length > expectedIds.length || currentIds.some((id, index) => id !== expectedIds[index])) {
    miniaturas.replaceChildren();
    buttons.length = 0;
  }
  for (let index = buttons.length; index < obrasPagina.length; index += 1) {
    const obra = obrasPagina[index];
    const indiceObra = paginaInicio + index;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.dataset.obraId = obra.id;
    boton.setAttribute('aria-label', `Mostrar ${obra.titulo}`);
    const imagen = document.createElement('img');
    imagen.src = obra.imagenUrl;
    imagen.alt = '';
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    boton.append(imagen);
    boton.addEventListener('click', () => {
      indiceActivo.set(id, indiceObra);
      renderizarServicio(id);
    });
    miniaturas.append(boton);
    buttons.push(boton);
  }
  buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(seleccionado === paginaInicio + index)));

  const ribbon = miniaturas.closest<HTMLElement>('.service-ribbon');
  if (ribbon && !ribbon.dataset.controlsReady) {
    ribbon.dataset.controlsReady = 'true';
    ribbon.querySelectorAll<HTMLButtonElement>('[data-ribbon-page]').forEach((button) => {
      button.addEventListener('click', () => void cambiarPaginaCinta(id, button.dataset.ribbonPage as 'prev' | 'next'));
    });
  }

  const obra = obras[seleccionado];
  actualizarControlesCinta(id);
  const miniaturaActiva = miniaturas.querySelector<HTMLButtonElement>(`button:nth-child(${seleccionado - paginaInicio + 1})`);
  if (miniaturaActiva && ribbon) {
    window.requestAnimationFrame(() => miniaturaActiva.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
  }
  const imagenPrincipal = principal.querySelector('img')!;
  const imagenPortada = document.querySelector<HTMLImageElement>(`[data-service-cover-fallback="${id}"]`);
  const srcRespaldo = imagenPortada?.dataset.coverUrl || imagenPortada?.src || servicio.imagen;
  const titulo = principal.querySelector('strong')!;
  const detalle = principal.querySelector('small')!;
  const imageUrl = obra?.imagenUrl || srcRespaldo;
  const imageChanged = imagenPrincipal.src !== new URL(imageUrl, location.href).href;
  if (imageChanged && obra) {
    principal.dataset.galleryState = 'loading';
    principal.setAttribute('aria-busy', 'true');
    detalle.textContent = 'Cargando obra…';
  }
  void actualizarFuenteImagen(imagenPrincipal, imageUrl).then((loaded) => {
    if (seleccionado !== (indiceActivo.get(id) || 0)) return;
    if (obra && !loaded) {
      principal.dataset.galleryState = 'error';
      detalle.textContent = 'No se pudo cargar esta obra';
      principal.removeAttribute('aria-busy');
      return;
    }
    imagenPrincipal.alt = obra?.titulo || 'Imagen de referencia del servicio';
    principal.dataset.galleryState = 'ready';
    titulo.textContent = obra?.titulo || nombreServicio(id);
    detalle.textContent = obra
      ? [obra.ubicacion, obra.anio].filter(Boolean).join(' · ') || 'Ampliar obra'
      : 'Sin obras cargadas todavía';
    principal.removeAttribute('aria-busy');
  });
  principal.disabled = !obra;
  principal.onclick = async () => {
    if (!obra) return;
    principal.setAttribute('aria-busy', 'true');
    const obrasCompletas = await cargarObrasParaLightbox(id);
    principal.removeAttribute('aria-busy');
    const indice = Math.min(indiceActivo.get(id) || 0, obrasCompletas.length - 1);
    if (obrasCompletas.length) abrirLightbox(obrasCompletas, indice, principal);
  };

  const panel = principal.closest<HTMLElement>('[data-gallery-panel], .service-view');
  if (!panel) return;
  panel.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach((boton) => {
    const limite = Math.min(totalObrasPorServicio.get(id) || obras.length, MAX_OBRAS_CINTA);
    boton.disabled = boton.dataset.slide === 'prev'
      ? seleccionado === 0
      : seleccionado >= limite - 1;
    boton.onclick = () => void moverObra(id, boton.dataset.slide as 'prev' | 'next');
  });
}

function renderizarServicio(id: string) {
  const obras = obrasPorServicio.get(id) || [];
  renderizarGaleriaServicio(id, obras);
}

function obrasVisibles() {
  return (archivo || [])
    .filter((obra) => filtro === 'all' || obra.servicio_id === filtro);
}

function renderizarArchivo() {
  const grid = get('archive-grid');
  const status = get('archive-status');
  if (!grid || !status) return;
  const obras = obrasVisibles();
  grid.replaceChildren();
  status.textContent = obras.length ? '' : archivo ? 'No hay obras en esta categoría.' : 'Cargando obras…';

  obras.forEach((obra, index) => {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'archive-card';
    const imagen = document.createElement('img');
    imagen.src = obra.imagenUrl;
    imagen.alt = obra.titulo;
    imagen.loading = 'lazy';
    const datos = document.createElement('span');
    const categoria = document.createElement('small');
    categoria.textContent = nombreServicio(obra.servicio_id);
    const titulo = document.createElement('strong');
    titulo.textContent = obra.titulo;
    datos.append(categoria, titulo);
    tarjeta.append(imagen, datos);
    tarjeta.addEventListener('click', () => abrirLightbox(obras, index, tarjeta));
    grid.append(tarjeta);
  });
  const more = get('archive-more');
  if (more) more.hidden = !hayMasObras || !archivo;
}

async function ampliarArchivo() {
  if (cargandoArchivo || !hayMasObras) return;
  cargandoArchivo = true;
  try {
    const page = await apiJson<ObrasPage>(`/api/obras?limit=100&offset=${offsetArchivo}`);
    archivo = [...(archivo || []), ...page.obras];
    offsetArchivo += page.obras.length;
    hayMasObras = page.hasMore;
    renderizarArchivo();
  } catch {
    const status = get('archive-status');
    if (status) status.textContent = 'No se pudo cargar el archivo. Intenta de nuevo.';
    const more = get('archive-more');
    if (more) more.hidden = false;
  } finally {
    cargandoArchivo = false;
  }
}

export function iniciarGalerias(): void {
  document.addEventListener('app:service-covers-updated', () => {
    servicios.forEach((service) => {
      if (!obrasPorServicio.get(service.id)?.length) renderizarServicio(service.id);
    });
  });
  document.addEventListener('app:service-names-updated', () => {
    if (archivo) renderizarArchivo();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="button"]')) return;
    const panel = document.querySelector<HTMLElement>('.service-view--gallery:not([hidden])');
    const id = panel?.dataset.service;
    if (!id || !servicios.some((servicio) => servicio.id === id)) return;
    event.preventDefault();
    void moverObra(id, event.key === 'ArrowLeft' ? 'prev' : 'next');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((boton) => {
    boton.addEventListener('click', () => {
      filtro = boton.dataset.filter || 'all';
      document.querySelectorAll('[data-filter]').forEach((item) => {
        item.setAttribute('aria-pressed', String(item === boton));
      });
      renderizarArchivo();
    });
  });

  get('archive-more')?.addEventListener('click', ampliarArchivo);
  document.addEventListener('app:view', (event) => {
    if ((event as CustomEvent).detail === 'obras' && !archivo) void ampliarArchivo();
  });
  if (new URL(location.href).searchParams.get('vista') === 'obras') void ampliarArchivo();

  const cargarPrimeraTanda = (id: string): Promise<void> => {
    if (obrasPorServicio.has(id)) return Promise.resolve();
    const pending = cargasIniciales.get(id);
    if (pending) return pending;
    const principal = document.querySelector<HTMLButtonElement>(`[data-active-image="${id}"]`);
    principal?.setAttribute('aria-busy', 'true');
    if (principal) principal.dataset.galleryState = 'loading';
    const request = (async () => {
      try {
        const page = await cargarServicio(id);
        obrasPorServicio.set(id, page.obras);
        totalObrasPorServicio.set(id, page.total);
        masObrasDisponibles.set(id, page.hasMore && page.obras.length < MAX_OBRAS_CINTA);
        erroresServicio.delete(id);
      } catch {
        totalObrasPorServicio.set(id, 0);
        masObrasDisponibles.set(id, false);
        erroresServicio.add(id);
      } finally {
        cargasIniciales.delete(id);
      }
      renderizarServicio(id);
    })();
    cargasIniciales.set(id, request);
    return request;
  };

  const cargarVistaVisible = (event: Event) => {
    const id = (event as CustomEvent).detail as string;
    if (servicios.some((servicio) => servicio.id === id)) void cargarPrimeraTanda(id);
  };
  document.addEventListener('app:view', cargarVistaVisible);
  document.addEventListener('app:service-visible', cargarVistaVisible);
}
