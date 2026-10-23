// Smoke test de la ampliación funcional. Requiere Front preview local y Worker local.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const front = 'http://127.0.0.1:4322';
const api = 'http://127.0.0.1:8787';
const vars = Object.fromEntries(readFileSync('Back/.dev.vars', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
assert.ok(vars.ADMIN_SECRET, 'Falta el secreto local de Admin en Back/.dev.vars');

const externalHosts = new Set();
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
  externalHosts.add(url.hostname);
  return route.abort();
});

try {
  const login = await fetch(`${api}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secreto: vars.ADMIN_SECRET }),
  });
  assert.equal(login.status, 200, 'El login local debe funcionar');
  const { token } = await login.json();

  const page = await context.newPage();
  await page.addInitScript((jwt) => localStorage.setItem('admin_jwt', jwt), token);
  await page.goto(front);
  await page.locator('[data-view-panel="inicio"]').waitFor({ state: 'visible' });

  await page.locator('[data-view="mural"].dock-card').click();
  const nextWork = page.locator('[data-view-panel="mural"] [data-slide="next"]');
  for (let index = 0; index < 5; index += 1) await nextWork.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-thumbs="mural"] button').length === 7);
  assert.equal(await page.locator('[data-thumbs="mural"] button').count(), 7, 'La galería trae la segunda tanda de obras');
  await page.locator('.brand').click();

  await page.locator('.profile-card[data-view="perfil"]').click();
  await page.locator('[data-view-panel="perfil"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-view-panel="perfil"] .compact-profile').count(), 0);

  await page.locator('#main-menu [data-view="sobre-nosotros"]').click();
  await page.locator('[data-view-panel="sobre-nosotros"]').waitFor({ state: 'visible' });
  await page.locator('#about-photos-status').waitFor({ state: 'visible' });

  await page.locator('[data-view="complementarios"].dock-card').click();
  await page.locator('[data-view-panel="complementarios"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-service-group-display="complementarios"]').first().textContent(), 'Servicios Complementarios');
  await page.locator('[data-view-panel="complementarios"] [data-complementary-tab="electricos"]').click();
  await page.locator('[data-complementary-panel="electricos"]').waitFor({ state: 'visible' });
  await page.locator('[data-complementary-panel="electricos"] [data-open-quote]').click();
  assert.match(await page.locator('#quote-service').inputValue(), /eléctricos/i);
  await page.locator('[data-close-quote]').click();
  await page.locator('[data-view-panel="complementarios"] [data-complementary-tab="drywall"]').click();
  await page.locator('[data-complementary-panel="drywall"]').waitFor({ state: 'visible' });
  await page.locator('[data-complementary-panel="drywall"] [data-open-quote]').click();
  assert.match(await page.locator('#quote-service').inputValue(), /drywall/i);
  await page.locator('[data-close-quote]').click();

  await page.goto(`${front}/?vista=drywall`);
  await page.locator('[data-complementary-panel="drywall"]').waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).searchParams.get('vista'), 'complementarios');
  assert.equal(new URL(page.url()).searchParams.get('subservicio'), 'drywall');

  await page.locator('#main-menu [data-view="obras"]').click();
  for (const id of ['materiales', 'electricos', 'drywall']) {
    assert.equal(await page.locator(`[data-filter="${id}"]`).count(), 1, `Filtro para ${id}`);
  }

  await page.locator('[data-view="materiales"].dock-card').click();
  const materialCta = page.locator('[data-view-panel="materiales"] a.gold-button');
  await materialCta.waitFor({ state: 'visible' });
  assert.match(await materialCta.getAttribute('href'), /^https:\/\/wa\.me\//);

  await page.goto(`${front}/admin/cotizador/`);
  await page.locator('[data-quote-field]').first().waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-quote-field]').count(), 8);
  await page.locator('[data-content-field="quote.title"] input').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#quote-copy-status')?.textContent === 'Todo guardado');
  assert.equal(await page.locator('[data-content-field="quote.ideaDescription"] textarea').count(), 1);
  assert.equal(await page.locator('[data-content-field="quote.contactDescription"] textarea').count(), 1);
  assert.equal(await page.locator('[data-text-key="quote.title"]').count(), 0, 'Los textos del cotizador se editan en su panel, no desde el formulario de campos');
  const quoteTitle = page.locator('[data-content-field="quote.title"] input');
  const originalQuoteTitle = await quoteTitle.inputValue();
  await quoteTitle.fill('Cotizador temporal de prueba');
  await page.waitForFunction(() => !document.querySelector('#quote-copy-save')?.disabled);
  await page.locator('#quote-copy-save').click();
  await page.waitForFunction(() => document.querySelector('#quote-copy-status')?.textContent === 'Textos guardados.');
  assert.equal((await fetch(`${api}/api/contenido`).then((response) => response.json())).textos['quote.title'], 'Cotizador temporal de prueba');
  await page.goto(front);
  await page.waitForFunction(() => document.querySelector('#quote-heading')?.textContent === 'Cotizador temporal de prueba');
  await page.goto(`${front}/admin/cotizador/`);
  await page.locator('[data-content-field="quote.title"] input').waitFor({ state: 'visible' });
  await page.waitForFunction((value) => document.querySelector('[data-content-field="quote.title"] input')?.value === value, 'Cotizador temporal de prueba');
  const quoteTitleAfterNavigation = page.locator('[data-content-field="quote.title"] input');
  await quoteTitleAfterNavigation.fill(originalQuoteTitle);
  await page.locator('#quote-copy-save').click();
  await page.waitForFunction((value) => document.querySelector('#quote-copy-status')?.textContent === 'Textos guardados.' && document.querySelector('[data-content-field="quote.title"] input')?.value === value, originalQuoteTitle);

  await page.goto(`${front}/admin/contenido/`);
  await page.locator('[data-service-tab="materiales"]').waitFor({ state: 'attached' });
  await page.locator('[data-service-tab="electricos"]').waitFor({ state: 'attached' });
  await page.locator('[data-service-tab="drywall"]').waitFor({ state: 'attached' });
  assert.equal(await page.locator('[data-group-name-input="complementarios"]').inputValue(), 'Servicios Complementarios');
  assert.equal(await page.locator('[data-content-field="complementary.description"] textarea').inputValue(), 'Conoce nuestras soluciones eléctricas y de drywall y carpintería, con propuestas adaptadas a cada proyecto.');
  assert.equal(await page.locator('[data-content-field="about.title"]').count(), 0, 'Sobre nosotros ya no se duplica en Contenido');
  assert.equal(await page.getByRole('link', { name: 'SOBRE NOSOTROS' }).count(), 1);

  await page.goto(`${front}/admin/sobre-nosotros/`);
  await page.locator('#about-photo-upload').waitFor({ state: 'visible' });
  await page.locator('[data-content-field="about.title"] input').waitFor({ state: 'visible' });
  await page.locator('[data-content-field="about.description"] textarea').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#about-text-status')?.textContent === 'Todo guardado');
  const aboutDescription = page.locator('[data-content-field="about.description"] textarea');
  const originalAboutDescription = await aboutDescription.inputValue();
  await aboutDescription.fill('Descripción temporal de prueba');
  await page.locator('#about-text-save').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#about-text-save')?.disabled);
  await page.locator('#about-text-save').click();
  await page.waitForFunction(() => document.querySelector('#about-text-status')?.textContent === 'Textos guardados.');
  assert.equal((await fetch(`${api}/api/contenido`).then((response) => response.json())).textos['about.description'], 'Descripción temporal de prueba');
  await aboutDescription.fill(originalAboutDescription);
  await page.waitForFunction(() => !document.querySelector('#about-text-save')?.disabled);
  await page.locator('#about-text-save').click();
  await page.waitForFunction((value) => document.querySelector('#about-text-status')?.textContent === 'Textos guardados.' && document.querySelector('[data-content-field="about.description"] textarea')?.value === value, originalAboutDescription);

  await page.goto(`${front}/admin/obras/`);
  await page.locator('.admin-header').waitFor({ state: 'visible' });
  assert.equal(await page.getByText('Destacado', { exact: true }).count(), 0);

  await page.goto(front);
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const id of ['mural', 'materiales']) {
      await page.locator(`[data-view="${id}"].dock-card`).evaluate((element) => element.click());
      await page.locator(`[data-view-panel="${id}"]`).waitFor({ state: 'visible' });
      const metrics = await page.evaluate((serviceId) => {
        const view = document.querySelector(`[data-view-panel="${serviceId}"]`);
        return { width: document.documentElement.scrollWidth, viewWidth: view.getBoundingClientRect().width, dockTop: document.querySelector('.service-dock').getBoundingClientRect().top };
      }, id);
      assert.equal(metrics.width, viewport.width, `${id}: no debe desbordar horizontalmente a ${viewport.width}px`);
      await page.locator(`[data-active-image="${id}"]`).scrollIntoViewIfNeeded();
      const reachable = await page.locator(`[data-active-image="${id}"]`).evaluate((element) => {
        const image = element.getBoundingClientRect();
        const view = element.closest('.service-view').getBoundingClientRect();
        return image.top >= view.top - 1 && image.bottom <= view.bottom + 2;
      });
      assert.equal(reachable, true, `${id}: la obra principal debe poder verse sobre la cinta`);
    }
    await page.locator('[data-view="complementarios"].dock-card').evaluate((element) => element.click());
    await page.locator('[data-view-panel="complementarios"]').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, `complementarios: no debe desbordar horizontalmente a ${viewport.width}px`);
    for (const id of ['electricos', 'drywall']) {
      await page.locator(`[data-complementary-tab="${id}"]`).click();
      const hero = page.locator(`[data-active-image="${id}"]`);
      await hero.scrollIntoViewIfNeeded();
      const reachable = await hero.evaluate((element) => {
        const image = element.getBoundingClientRect();
        const dockTop = document.querySelector('.service-dock').getBoundingClientRect().top;
        return image.top >= 0 && image.bottom <= dockTop + 1;
      });
      assert.equal(reachable, true, `${id}: la imagen debe quedar visible al desplazarse por Servicios complementarios`);
    }
  }

  assert.deepEqual([...externalHosts], [], `La vista hizo solicitudes fuera de local: ${[...externalHosts].join(', ')}`);
  console.log('PASS: navegación Perfil/Sobre nosotros/Complementarios, cotización precargada y editable, fotos Admin, catálogo sin destacados, móvil sin overflow ni cinta superpuesta y tráfico solo local.');
} finally {
  await browser.close();
}
