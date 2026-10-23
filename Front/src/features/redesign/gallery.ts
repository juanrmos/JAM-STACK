import { servicios } from '../../config/servicios';
import type { Obra, ObrasPage } from '../../services/api/types';
import { apiJson } from '../../services/api/client';
import { abrirLightbox } from './lightbox';
import { nombreServicio } from './service-names';

const obrasPorServicio = new Map<string, Obra[]>();
const totalObrasPorServicio = new Map<string, number>();
const indiceActivo = new Map<string, number>();
const erroresServicio = new Set<string>();
const masObrasDisponibles = new Map<string, boolean>();
const cargasPendientes = new Map<string, Promise<void>>();
let archivo: Obra[] | null = null;
let filtro = 'all';
let offsetArchivo = 0;
let cargandoArchivo = false;
let hayMasObras = true;

const get = (id: string) => document.getElementById(id);
const cargarServicio = (id: string, offset = 0, limite = 5) =>
  apiJson<ObrasPage>(`/api/obras?servicio_id=${id}&limit=${limite}&offset=${offset}`);

function actualizarControlesCinta(id: string): void {
  const ribbon = document.querySelector<HTMLElement>(`[data-service-ribbon="${id}"]`);
  const viewport = ribbon?.querySelector<HTMLElement>(`[data-ribbon-viewport="${id}"]`);
  const thumbs = ribbon?.querySelector<HTMLElement>(`[data-thumbs="${id}"]`);
  if (!ribbon || !viewport || !thumbs) return;

  const puedeAnterior = viewport.scrollLeft > 1;
  const puedeSiguiente = viewport.scrollLeft + viewport.clientWidth < viewport.scrollWidth - 1;
  viewport.dataset.overflowEnd = String(puedeSiguiente);
  ribbon.querySelector<HTMLButtonElement>('[data-ribbon-scroll="prev"]')!.disabled = !puedeAnterior;
  ribbon.querySelector<HTMLButtonElement>('[data-ribbon-scroll="next"]')!.disabled = !puedeSiguiente;

  const total = totalObrasPorServicio.get(id) || 0;
  const indice = obrasPorServicio.get(id)?.length ? (indiceActivo.get(id) || 0) + 1 : 0;
  ribbon.querySelector<HTMLElement>(`[data-ribbon-count="${id}"]`)!.textContent = `OBRAS · ${indice} / ${total}`;
}

function desplazarCinta(id: string, direccion: 'prev' | 'next'): void {
  const viewport = document.querySelector<HTMLElement>(`[data-ribbon-viewport="${id}"]`);
  if (!viewport) return;
  const firstThumb = viewport.querySelector<HTMLElement>('button');
  const salto = firstThumb ? firstThumb.getBoundingClientRect().width + 10 : viewport.clientWidth * .8;
  viewport.scrollBy({ left: (direccion === 'next' ? 1 : -1) * salto * 3, behavior: 'smooth' });
}

async function moverObra(id: string, direccion: 'prev' | 'next'): Promise<void> {
  const obras = obrasPorServicio.get(id) || [];
  const seleccionado = Math.min(indiceActivo.get(id) || 0, obras.length - 1);
  if (direccion === 'prev') {
    if (seleccionado > 0) indiceActivo.set(id, seleccionado - 1);
    else if (obras.length > 1) indiceActivo.set(id, obras.length - 1);
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
  if (actual.length >= 50 || !masObrasDisponibles.get(id)) return;
  const pending = cargasPendientes.get(id);
  if (pending) return pending;
  const request = (async () => {
    try {
      const page = await cargarServicio(id, actual.length, Math.min(5, 50 - actual.length));
      obrasPorServicio.set(id, [...actual, ...page.obras].slice(0, 50));
      totalObrasPorServicio.set(id, page.total);
      masObrasDisponibles.set(id, page.hasMore && actual.length + page.obras.length < 50);
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

function renderizarGaleriaServicio(id: string, obras: Obra[]) {
  const servicio = servicios.find((item) => item.id === id);
  const miniaturas = document.querySelector<HTMLElement>(`[data-thumbs="${id}"]`);
  const principal = document.querySelector<HTMLButtonElement>(`[data-active-image="${id}"]`);
  if (!servicio || !miniaturas || !principal) return;

  miniaturas.replaceChildren();
  if (erroresServicio.has(id)) {
    const estado = document.createElement('p');
    estado.className = 'collection-status';
    estado.setAttribute('role', 'status');
    estado.textContent = 'No se pudieron cargar los proyectos. Vuelve a esta vista para reintentar.';
    miniaturas.append(estado);
    principal.disabled = true;
    principal.querySelector('small')!.textContent = 'Error al cargar las obras';
    principal.closest<HTMLElement>('[data-gallery-panel], .service-view')?.querySelectorAll<HTMLButtonElement>('[data-slide]')
      .forEach((button) => { button.disabled = true; });
    actualizarControlesCinta(id);
    return;
  }

  const seleccionado = Math.min(indiceActivo.get(id) || 0, obras.length - 1);
  indiceActivo.set(id, Math.max(0, seleccionado));

  obras.forEach((obra, index) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.setAttribute('aria-label', `Mostrar ${obra.titulo}`);
    boton.setAttribute('aria-pressed', String(seleccionado === index));
    const imagen = document.createElement('img');
    imagen.src = obra.imagenUrl;
    imagen.alt = '';
    imagen.loading = 'lazy';
    boton.append(imagen);
    boton.addEventListener('click', () => {
      indiceActivo.set(id, index);
      renderizarServicio(id);
      if (index >= obras.length - 2) void cargarSiguienteTanda(id);
    });
    miniaturas.append(boton);
  });

  const ribbon = miniaturas.closest<HTMLElement>('.service-ribbon');
  const ribbonViewport = ribbon?.querySelector<HTMLElement>(`[data-ribbon-viewport="${id}"]`);
  if (ribbonViewport && !ribbonViewport.dataset.controlsReady) {
    ribbonViewport.dataset.controlsReady = 'true';
    ribbonViewport.addEventListener('scroll', () => actualizarControlesCinta(id), { passive: true });
    ribbon?.querySelectorAll<HTMLButtonElement>('[data-ribbon-scroll]').forEach((button) => {
      button.addEventListener('click', () => desplazarCinta(id, button.dataset.ribbonScroll as 'prev' | 'next'));
    });
  }

  const obra = obras[seleccionado];
  actualizarControlesCinta(id);
  const miniaturaActiva = miniaturas.querySelector<HTMLButtonElement>(`button:nth-child(${seleccionado + 1})`);
  if (miniaturaActiva && ribbon) {
    window.requestAnimationFrame(() => miniaturaActiva.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
  }
  const imagenPrincipal = principal.querySelector('img')!;
  const imagenPortada = document.querySelector<HTMLImageElement>(`[data-service-cover-fallback="${id}"]`);
  const srcRespaldo = imagenPortada?.dataset.coverUrl || imagenPortada?.src || servicio.imagen;
  imagenPrincipal.style.opacity = '0';
  window.setTimeout(() => {
    imagenPrincipal.src = obra?.imagenUrl || srcRespaldo;
    imagenPrincipal.alt = obra?.titulo || 'Imagen de referencia del servicio';
    imagenPrincipal.style.opacity = '1';
  }, 130);
  principal.querySelector('strong')!.textContent = obra?.titulo || nombreServicio(id);
  principal.querySelector('small')!.textContent = obra
    ? [obra.ubicacion, obra.anio].filter(Boolean).join(' · ') || 'Ampliar obra'
    : 'Sin obras cargadas todavía';
  principal.disabled = !obra;
  principal.onclick = () => {
    if (obra) abrirLightbox(obras, seleccionado, principal);
  };

  const panel = principal.closest<HTMLElement>('[data-gallery-panel], .service-view');
  if (!panel) return;
  if (!miniaturas.dataset.pagingReady) {
    miniaturas.dataset.pagingReady = 'true';
    const scrollArea = ribbonViewport || miniaturas;
    scrollArea.addEventListener('scroll', () => {
      if (scrollArea.scrollLeft + scrollArea.clientWidth >= scrollArea.scrollWidth - 100) void cargarSiguienteTanda(id);
    }, { passive: true });
  }
  panel.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach((boton) => {
    boton.disabled = boton.dataset.slide === 'prev' ? obras.length < 2 : obras.length < 2 && !masObrasDisponibles.get(id);
    boton.onclick = () => void moverObra(id, boton.dataset.slide as 'prev' | 'next');
  });
}

function renderizarServicio(id: string) {
  const obras = obrasPorServicio.get(id) || [];
  renderizarGaleriaServicio(id, obras);
}

function obrasVisibles() {
  return (archivo || [...obrasPorServicio.values()].flat())
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

export async function iniciarGalerias() {
  document.addEventListener('app:service-covers-updated', () => {
    servicios.forEach((service) => {
      if (!obrasPorServicio.get(service.id)?.length) renderizarServicio(service.id);
    });
  });
  document.addEventListener('app:service-names-updated', () => {
    servicios.forEach((service) => renderizarServicio(service.id));
    renderizarArchivo();
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

  const tasks = servicios.map(async (servicio) => {
    try {
      const page = await cargarServicio(servicio.id);
      obrasPorServicio.set(servicio.id, page.obras);
      totalObrasPorServicio.set(servicio.id, page.total);
      masObrasDisponibles.set(servicio.id, page.hasMore && page.obras.length < 50);
      erroresServicio.delete(servicio.id);
    } catch {
      obrasPorServicio.set(servicio.id, []);
      totalObrasPorServicio.set(servicio.id, 0);
      masObrasDisponibles.set(servicio.id, false);
      erroresServicio.add(servicio.id);
    }
    renderizarServicio(servicio.id);
    renderizarArchivo();
  });
  await Promise.all(tasks);

  document.addEventListener('app:view', async (event) => {
    const id = (event as CustomEvent).detail as string;
    if (!servicios.some((servicio) => servicio.id === id) || obrasPorServicio.get(id)?.length) return;
    try {
      const page = await cargarServicio(id);
      obrasPorServicio.set(id, page.obras);
      totalObrasPorServicio.set(id, page.total);
      masObrasDisponibles.set(id, page.hasMore && page.obras.length < 50);
      erroresServicio.delete(id);
      renderizarServicio(id);
    } catch {
      erroresServicio.add(id);
      renderizarServicio(id);
    }
  });
}
