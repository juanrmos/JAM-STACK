const ids = ['electricos', 'drywall'] as const;
type ComplementaryId = (typeof ids)[number];

export function iniciarServiciosComplementarios() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-complementary-tab]'));
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-complementary-panel]'));
  const highlights = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-complementary-select]'));

  function seleccionar(id: ComplementaryId, focus = false) {
    buttons.forEach((button) => {
      const active = button.dataset.complementaryTab === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.complementaryPanel !== id; });
    highlights.forEach((button) => {
      const active = button.dataset.complementarySelect === id;
      button.setAttribute('aria-pressed', String(active));
    });
    document.dispatchEvent(new CustomEvent('app:service-visible', { detail: id }));
  }

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => seleccionar(button.dataset.complementaryTab as ComplementaryId));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? ids.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length;
      seleccionar(ids[nextIndex], true);
    });
  });
  highlights.forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.complementarySelect as ComplementaryId;
    seleccionar(id);
    document.querySelector<HTMLElement>(`[data-complementary-tab="${id}"]`)?.focus();
    document.querySelector<HTMLElement>('.complementary-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  document.addEventListener('app:complementary-select', (event) => {
    const id = (event as CustomEvent).detail;
    seleccionar(ids.includes(id) ? id : 'electricos');
  });
}
