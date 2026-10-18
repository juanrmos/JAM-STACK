import { servicios } from '../../config/servicios';
import type { Obra, ObrasPage } from '../../services/api/types';
import { apiJson } from '../../services/api/client';
import { abrirLightbox } from './lightbox';

const obrasPorServicio = new Map<string, Obra[]>();
const indiceActivo = new Map<string, number>();
const erroresServicio = new Set<string>();
let archivo: Obra[] | null = null;
let filtro = 'all';
let offsetArchivo = 0;
let cargandoArchivo = false;
let hayMasObras = true;

const get = (id: string) => document.getElementById(id);
const cargarServicio = (id: string, offset = 0, limite = 5) =>
  apiJson<ObrasPage>(`/api/obras?servicio_id=${id}&limit=${limite}&offset=${offset}`);

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
    principal.closest<HTMLElement>('.service-view')?.querySelectorAll<HTMLButtonElement>('[data-slide]')
      .forEach((button) => { button.disabled = true; });
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
    });
    miniaturas.append(boton);
  });

  const obra = obras[seleccionado];
  const imagenPrincipal = principal.querySelector('img')!;
  const imagenPortada = document.querySelector<HTMLImageElement>(`[data-service-cover-fallback="${id}"]`);
  const srcRespaldo = imagenPortada?.dataset.coverUrl || imagenPortada?.src || servicio.imagen;
  imagenPrincipal.style.opacity = '0';
  window.setTimeout(() => {
    imagenPrincipal.src = obra?.imagenUrl || srcRespaldo;
    imagenPrincipal.alt = obra?.titulo || 'Imagen de referencia del servicio';
    imagenPrincipal.style.opacity = '1';
  }, 130);
  principal.querySelector('strong')!.textContent = obra?.titulo || servicio.titulo;
  principal.querySelector('small')!.textContent = obra
    ? [obra.ubicacion, obra.anio].filter(Boolean).join(' · ') || 'Ampliar obra'
    : 'Sin obras cargadas todavía';
  principal.disabled = !obra;
  principal.onclick = () => {
    if (obra) abrirLightbox(obras, seleccionado, principal);
  };

  const panel = principal.closest<HTMLElement>('.service-view')!;
  panel.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach((boton) => {
    boton.disabled = obras.length < 2;
    boton.onclick = () => {
      indiceActivo.set(id, (seleccionado + (boton.dataset.slide === 'next' ? 1 : -1) + obras.length) % obras.length);
      renderizarServicio(id);
    };
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
    categoria.textContent = servicios.find((item) => item.id === obra.servicio_id)?.titulo || '';
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
      erroresServicio.delete(servicio.id);
    } catch {
      obrasPorServicio.set(servicio.id, []);
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
      erroresServicio.delete(id);
      renderizarServicio(id);
    } catch {
      erroresServicio.add(id);
      renderizarServicio(id);
    }
  });
}
