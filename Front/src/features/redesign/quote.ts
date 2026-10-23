import { servicios } from '../../config/servicios';
import { nombreServicio } from './service-names';
import { enlaceWhatsapp } from '../cotizacion/whatsapp';
import { apiJson } from '../../services/api/client';
import type { CampoCotizador } from '../../../../Shared/contracts/cotizador';

const get = (id: string) => document.getElementById(id)!;
let step = 0;
let focus: HTMLElement | null = null;
let selectedServiceId: string | null = null;
let serviceNameEdited = false;
let configuredFields: CampoCotizador[] = [];

function makeControl(field: CampoCotizador): HTMLElement {
  const label = document.createElement('label');
  label.textContent = field.etiqueta;
  let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (field.tipo === 'textarea') {
    control = document.createElement('textarea');
    (control as HTMLTextAreaElement).rows = 4;
  } else if (field.tipo === 'select') {
    const select = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecciona una opción';
    select.append(placeholder);
    field.opciones.forEach((option) => {
      const item = document.createElement('option');
      item.value = option;
      item.textContent = option;
      select.append(item);
    });
    control = select;
  } else {
    const input = document.createElement('input');
    input.type = field.tipo;
    if (field.id === 'metros') { input.min = '0'; input.step = '0.1'; }
    control = input;
  }
  control.name = field.id;
  control.id = field.id === 'obra' ? 'quote-service' : `quote-${field.id}`;
  control.required = field.requerido;
  if (field.tipo !== 'number' && field.tipo !== 'select') (control as HTMLInputElement | HTMLTextAreaElement).maxLength = field.limite;
  if (field.id === 'obra') (control as HTMLInputElement).placeholder = '¿Qué servicio o proyecto tienes en mente?';
  if (field.id === 'nombre') control.autocomplete = 'name';
  if (field.id === 'telefono') control.autocomplete = 'tel';
  if (field.id === 'correo') control.autocomplete = 'email';
  label.htmlFor = control.id;
  label.append(control);
  return label;
}

function renderFields() {
  document.querySelectorAll<HTMLElement>('[data-quote-fields]').forEach((container) => container.replaceChildren());
  configuredFields.filter((field) => field.habilitado).sort((a,b)=>a.paso-b.paso||a.orden-b.orden).forEach((field) => {
    document.querySelector<HTMLElement>(`[data-quote-fields="${field.paso}"]`)?.append(makeControl(field));
  });
}

function render() {
  document.querySelectorAll<HTMLElement>('[data-quote-step]').forEach((el) => { el.hidden = Number(el.dataset.quoteStep) !== step; });
  get('quote-panel').querySelector<HTMLElement>('[data-quote-back]')!.hidden = step === 0;
  get('quote-panel').querySelector<HTMLElement>('[data-quote-next]')!.hidden = step === 2;
  get('quote-panel').querySelector<HTMLElement>('[data-quote-send]')!.hidden = step !== 2;
  get('quote-steps').textContent = ['01 Obra','02 Medidas','03 Contacto'].map((label,index) => index === step ? `[${label}]` : label).join('  ·  ');
}

function close() {
  get('quote-panel').hidden = true;
  get('quote-overlay').hidden = true;
  document.body.classList.remove('no-scroll');
  selectedServiceId = null;
  serviceNameEdited = false;
  focus?.focus();
}

function valuesForStep(stepNumber: number): Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-quote-step="${stepNumber - 1}"] input,[data-quote-step="${stepNumber - 1}"] textarea,[data-quote-step="${stepNumber - 1}"] select`)];
}

export async function iniciarCotizadorNuevo() {
  try {
    const result = await apiJson<{ campos: CampoCotizador[] }>('/api/cotizador/campos');
    configuredFields = result.campos;
  } catch {
    const { camposCotizadorFijos } = await import('../../../../Shared/contracts/cotizador');
    configuredFields = camposCotizadorFijos.map((field) => ({ ...field, paso: field.paso as 1|2|3, tipo: field.tipo as CampoCotizador['tipo'], opciones: 'opciones' in field ? [...field.opciones] : [] }));
  }
  renderFields();
  const form = get('quote-form') as HTMLFormElement;
  const input = document.getElementById('quote-service') as HTMLInputElement | null;
  input?.addEventListener('input', () => { serviceNameEdited = true; });
  document.addEventListener('app:service-names-updated', () => {
    if (selectedServiceId && !serviceNameEdited && input) input.value = nombreServicio(selectedServiceId);
  });
  document.querySelectorAll<HTMLElement>('[data-open-quote]').forEach((button) => button.addEventListener('click', () => {
    focus = button;
    step = 0;
    selectedServiceId = servicios.find((service) => service.id === button.dataset.serviceQuote)?.id || null;
    serviceNameEdited = false;
    form.reset();
    if (input) input.value = selectedServiceId ? nombreServicio(selectedServiceId) : '';
    get('quote-panel').hidden = false;
    get('quote-overlay').hidden = false;
    document.body.classList.add('no-scroll');
    render();
    input?.focus();
  }));
  document.querySelector('[data-close-quote]')?.addEventListener('click', close);
  get('quote-overlay').addEventListener('click', close);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !get('quote-panel').hidden) close(); });
  document.querySelector('[data-quote-back]')?.addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  document.querySelector('[data-quote-next]')?.addEventListener('click', () => {
    const requiredInvalid = valuesForStep(step + 1).find((control) => !control.reportValidity());
    if (requiredInvalid) return;
    step = Math.min(2, step + 1);
    render();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = configuredFields.filter((field) => field.habilitado).map((field) => {
      const value = String(data.get(field.id) || '').trim();
      return value ? `${field.etiqueta}: ${value}` : null;
    }).filter(Boolean);
    const message = [
      'Hola, deseo ponerme en contacto con Corporación Artística Antony Rodríguez para cotizar una obra de alto impacto.',
      'Me interesa información sobre el servicio de:',
      ...lines,
    ].join('\n');
    window.open(enlaceWhatsapp(message), '_blank', 'noopener,noreferrer');
    close();
  });
  render();
}
