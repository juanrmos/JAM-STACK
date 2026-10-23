import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const services = ['mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada'];
const thumbnailCounts = {};
const visibleTitles = {};
const galleryRequests = [];
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
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      window.__bootSnapshot = {
        state: document.documentElement.dataset.publicState,
        mainVisibility: getComputedStyle(document.querySelector('#app-main')).visibility,
      };
    }, { once: true });
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/obras' && url.searchParams.has('servicio_id')) galleryRequests.push(url.searchParams.get('servicio_id'));
  });
  await page.goto('http://127.0.0.1:4321/?vista=logo');
  await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; }' });
  await page.waitForFunction(() => document.documentElement.dataset.publicState === 'ready');
  assert.equal(await page.evaluate(() => window.__bootSnapshot?.mainVisibility), 'hidden', 'No muestra contenido inicial antes de hidratarlo');
  assert.deepEqual(galleryRequests, ['logo'], 'Solo pide la galería del servicio que se abrió');

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

  for (const viewport of [{ width: 320, height: 740 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const id of services) {
      await page.locator(`[data-view="${id}"].dock-card`).evaluate((element) => element.click());
      await page.waitForTimeout(450);
      await page.locator(`[data-view-panel="${id}"]`).waitFor({ state: 'visible' });
      const mobile = await page.evaluate((serviceId) => {
        const view = document.querySelector(`[data-view-panel="${serviceId}"]`);
        view.scrollTop = 0;
        const dock = document.querySelector('.service-dock').getBoundingClientRect();
        const hero = view.querySelector('.service-view__gallery').getBoundingClientRect();
        const profile = view.querySelector('.compact-profile');
        const thumbs = view.querySelector('.service-thumbs').getBoundingClientRect();
        return { viewBottom: view.getBoundingClientRect().bottom, dockTop: dock.top, documentWidth: document.documentElement.scrollWidth, heroTop: hero.top, profileTop: profile?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY, thumbsTop: thumbs.top };
      }, id);
      assert.ok(mobile.viewBottom <= mobile.dockTop + 1, `${id} ${viewport.width}px: ${JSON.stringify(mobile)}`);
      assert.equal(mobile.documentWidth, viewport.width, `${id} ${viewport.width}px: horizontal overflow`);
      if (viewport.width <= 850) {
        assert.ok(mobile.heroTop < mobile.profileTop && mobile.heroTop < mobile.thumbsTop, `${id} ${viewport.width}px: hero order ${JSON.stringify(mobile)}`);
        await page.locator(`[data-view-panel="${id}"] [data-active-image]`).scrollIntoViewIfNeeded();
        const visibleHero = await page.locator(`[data-view-panel="${id}"] [data-active-image]`).evaluate((el) => {
          const box = el.getBoundingClientRect();
          const view = el.closest('.service-view').getBoundingClientRect();
          return box.top >= view.top - 1 && box.bottom <= view.bottom + 2;
        });
        assert.ok(visibleHero, `${id} ${viewport.width}px: hero must be reachable without entering the fixed dock`);
        await page.locator(`[data-thumbs="${id}"]`).scrollIntoViewIfNeeded();
        const visibleThumbs = await page.locator(`[data-thumbs="${id}"]`).evaluate((el) => {
          const box = el.getBoundingClientRect();
          const view = el.closest('.service-view').getBoundingClientRect();
          return { visible: box.height >= 70 && box.top >= view.top - 1 && box.bottom <= view.bottom + 2, height: box.height };
        });
        assert.ok(visibleThumbs.visible, `${id} ${viewport.width}px: thumbnail strip must be fully reachable above the dock ${JSON.stringify(visibleThumbs)}`);
      }
    }
  }
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const id of ['inicio', 'obras', 'perfil', 'sobre-nosotros', 'contacto']) {
      await page.locator('#menu-toggle').evaluate((element) => element.click());
      await page.locator(`#main-menu [data-view="${id}"]`).evaluate((element) => element.click());
      await page.locator(`[data-view-panel="${id}"]`).waitFor({ state: 'visible' });
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.equal(width, viewport.width, `${id} ${viewport.width}px: horizontal overflow`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:4321/?vista=mural');
  const mural = page.locator('[data-view-panel="mural"]');
  const muralThumbs = mural.locator('[data-thumbs="mural"]');
  await muralThumbs.locator('button').first().waitFor({ state: 'visible' });
  const spacing = await mural.evaluate((panel) => {
    const button = panel.querySelector('.gold-button').getBoundingClientRect();
    const thumbs = panel.querySelector('.service-thumbs').getBoundingClientRect();
    return Math.round(thumbs.top - button.bottom);
  });
  assert.ok(spacing >= 8, `Móvil: las miniaturas deben separarse del botón de cotización (${spacing}px)`);
  const muralTotal = await page.evaluate(async () => (await (await fetch('http://127.0.0.1:8787/api/obras?servicio_id=mural&limit=1')).json()).total);
  if (muralTotal >= 50) {
    for (let pass = 0; pass < 12; pass += 1) {
      const count = await muralThumbs.locator('button').count();
      if (count >= 50) break;
      await muralThumbs.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      await page.waitForFunction((previous) => document.querySelectorAll('[data-thumbs="mural"] button').length > previous, count, { timeout: 5000 }).catch(() => {});
    }
    const extended = await muralThumbs.evaluate((element) => ({ count: element.querySelectorAll('button').length, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
    assert.equal(extended.count, 50, `La cinta debe cargar hasta 50 miniaturas: ${JSON.stringify(extended)}`);
    assert.ok(extended.scrollWidth > extended.clientWidth, 'La cinta extendida debe poder desplazarse horizontalmente');
    thumbnailCounts.muralExtended = extended.count;
  }
  await page.goto('http://127.0.0.1:4321/?vista=perfil');
  await page.locator('[data-view-panel="perfil"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-profile-backdrop]');
    return image && !image.hidden && image.complete && image.naturalWidth > 0;
  });
  const profileBackdrop = await page.evaluate(() => {
    const backdrop = document.querySelector('[data-profile-backdrop]');
    const portrait = document.querySelector('[data-view-panel="perfil"] [data-profile-photo]');
    return { sameImage: backdrop.src === portrait.src, filter: getComputedStyle(backdrop).filter };
  });
  assert.equal(profileBackdrop.sameImage, true, 'Perfil: fondo y retrato deben usar la misma foto');
  assert.match(profileBackdrop.filter, /blur\(/, 'Perfil: el fondo de la foto debe estar difuminado');
  assert.deepEqual(externalRequests, []);
  console.log(`PASS: seis servicios comparten miniaturas, Hero, flechas y lightbox; escritorio/móvil y tráfico solo local. Miniaturas visibles: ${JSON.stringify(thumbnailCounts)}. Títulos: ${JSON.stringify(visibleTitles)}.`);
} finally {
  await browser.close();
}
