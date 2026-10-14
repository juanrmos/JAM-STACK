import { enlaceWhatsapp, mensajeCotizacion, type Cotizacion } from './whatsapp';
export function iniciarCotizador() {
  const drawer = document.querySelector<HTMLElement>('#cotizador-drawer');
  const overlay = document.querySelector<HTMLElement>('#cotizador-overlay');
  const form = document.querySelector<HTMLFormElement>('#cotizador-form');
  if (!drawer || !overlay || !form) return;
  let opener: HTMLElement | null = null;
  const cerrar = () => {
    drawer.classList.remove('open'); overlay.classList.remove('open');
    document.body.classList.remove('cotizador-abierto'); drawer.inert = true;
    opener?.focus();
  };
  drawer.inert = true;
  document.querySelectorAll<HTMLElement>('[data-action="open-cotizador"]').forEach(button => button.addEventListener('click', () => {
    opener = button; drawer.inert = false;
    drawer.classList.add('open'); overlay.classList.add('open');
    document.body.classList.add('cotizador-abierto'); drawer.querySelector('button')?.focus();
  }));
  drawer.querySelector('#cotizador-cerrar')?.addEventListener('click', cerrar);
  overlay.addEventListener('click', cerrar);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && drawer.classList.contains('open')) cerrar(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const datos = Object.fromEntries(['obra','medidas','ubicacion','altura','direccion','referencia'].map(key => [key, form.querySelector<HTMLInputElement | HTMLSelectElement>(`#cot-${key}`)!.value])) as unknown as Cotizacion;
    window.open(enlaceWhatsapp(mensajeCotizacion(datos)), '_blank', 'noopener,noreferrer');
    cerrar(); form.reset();
  });
}
