import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const services = ['mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada'];
const thumbnailCounts = {};
const visibleTitles = {};
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1248, height: 703 } });
const externalRequests = [];
await context.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (['127.0.0.1', 'localhost'].includes(url.hostname)) return route.continue();
  externalRequests.push(url.hostname);
  return route.abort();
});

try {
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/?vista=logo');

  for (const id of services) {
    const panel = page.locator(`[data-view-panel="${id}"]`);
    await page.locator(`[data-view="${id}"].dock-card`).click();
    await panel.locator(`[data-active-image="${id}"]`).waitFor({ state: 'attached' });
    assert.equal(await panel.locator('.gallery-arrow').count(), 2, `${id}: debe tener dos flechas`);
    assert.equal(await panel.locator('.commercial-projects').count(), 0, `${id}: no debe usar la plantilla comercial`);
    assert.equal(await panel.locator(`[data-thumbs="${id}"]`).count(), 1, `${id}: debe mostrar miniaturas`);

    const thumbs = panel.locator(`[data-thumbs="${id}"] button`);
    await thumbs.first().waitFor({ state: 'attached' });
    thumbnailCounts[id] = await thumbs.count();
    visibleTitles[id] = await thumbs.evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')));
    const hero = panel.locator(`[data-active-image="${id}"] img`);
    await page.waitForFunction((serviceId) => {
      const first = document.querySelector(`[data-thumbs="${serviceId}"] img`);
      const main = document.querySelector(`[data-active-image="${serviceId}"] img`);
      return first && main && first.getAttribute('src') === main.getAttribute('src');
    }, id);
    assert.equal(await hero.getAttribute('src'), await thumbs.first().locator('img').getAttribute('src'), `${id}: el Hero debe ser la primera obra ordenada`);

    if (await thumbs.count() > 1) {
      await thumbs.nth(1).click();
      await page.waitForTimeout(180);
      assert.equal(await hero.getAttribute('src'), await thumbs.nth(1).locator('img').getAttribute('src'), `${id}: seleccionar miniatura cambia el Hero`);
    }
    assert.equal(await panel.locator('.service-view--commercial').count(), 0);
    assert.match(await panel.getAttribute('class'), /service-view--gallery/);
  }

  await page.locator('[data-view="logo"].dock-card').click();
  const logo = page.locator('[data-view-panel="logo"]');
  await logo.locator('[data-active-image="logo"]').click();
  assert.equal(await page.locator('#lightbox').isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#lightbox').isVisible(), false);

  await page.waitForTimeout(300);
  const desktop = await page.evaluate(() => {
    const view = document.querySelector('[data-view-panel="logo"]').getBoundingClientRect();
    const dock = document.querySelector('.service-dock').getBoundingClientRect();
    return { viewBottom: view.bottom, dockTop: dock.top, documentWidth: document.documentElement.scrollWidth };
  });
  assert.ok(desktop.viewBottom <= desktop.dockTop + 1, JSON.stringify(desktop));
  assert.equal(desktop.documentWidth, 1248);

  await page.locator('[data-view="fachada"].dock-card').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const mobile = await page.evaluate(() => {
    const view = document.querySelector('[data-view-panel="fachada"]').getBoundingClientRect();
    const dock = document.querySelector('.service-dock').getBoundingClientRect();
    return { viewBottom: view.bottom, dockTop: dock.top, documentWidth: document.documentElement.scrollWidth };
  });
  assert.ok(mobile.viewBottom <= mobile.dockTop + 1, JSON.stringify(mobile));
  assert.equal(mobile.documentWidth, 390);
  assert.deepEqual(externalRequests, []);
  console.log(`PASS: seis servicios comparten miniaturas, Hero, flechas y lightbox; escritorio/móvil y tráfico solo local. Miniaturas visibles: ${JSON.stringify(thumbnailCounts)}. Títulos: ${JSON.stringify(visibleTitles)}.`);
} finally {
  await browser.close();
}
