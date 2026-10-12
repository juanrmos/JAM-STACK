import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const dist = resolve('Front/dist');
const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };
const server = createServer((req, res) => {
  let file = resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done => server.listen(4330, '127.0.0.1', done));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({ viewport: {width, height: 850} });
    await context.addInitScript(() => localStorage.setItem('admin_jwt', 'local-test-token'));
    await context.route('**/api/**', route => {
      const url = route.request().url();
      if (url.includes('/api/obras')) return route.fulfill({json:{obras:[{
        id:'fixture-obra', titulo:'Obra local', categoria:'mural', orden:1, imagenUrl:'/images/hero-obra.jpg',
      }],total:1,hasMore:false}});
      if (url.includes('/api/logos')) return route.fulfill({json:{logos:[{
        id:'fixture-logo', nombre:'Logo local', activo:true, fechaCreacion:'2026-10-11T00:00:00Z', imagenUrl:'/images/hero-obra.jpg',
      }],total:1,hasMore:false}});
      return route.fulfill({status:404});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [url, marker, display] of [
      ['/admin/obras', '.dashboard[data-admin-view="dashboard"]', 'block'],
      ['/admin/logos', '.dashboard[data-admin-view="dashboardlogos"]', 'block'],
      ['/admin/obras/nueva', '.formulario-box[data-admin-view="formularioobra"]', 'block'],
      ['/admin/logos/nueva', '.formulario-box[data-admin-view="formulariologo"]', 'block'],
      ['/admin/login', '.login-box[data-admin-view="login"]', 'block'],
    ]) {
      if (url.endsWith('login')) await page.addInitScript(() => localStorage.removeItem('admin_jwt'));
      await page.goto(`http://127.0.0.1:4330${url}`);
      await page.locator(marker).waitFor();
      assert.equal(await page.locator(marker).evaluate(el => getComputedStyle(el).display), display);
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('.header, .footer').count(), 0);
      assert.equal(await page.locator(marker).evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      if (url === '/admin/obras') {
        await page.locator('.slot-card--ocupado').waitFor();
        await page.locator('.grilla-card').waitFor();
        assert.equal(await page.locator('.slot-card--ocupado').evaluate(el => Math.round(el.getBoundingClientRect().width)), 180);
        assert.equal(await page.locator('.grilla-card').evaluate(el => getComputedStyle(el).display), 'flex');
        assert.equal(await page.locator('.paginacion__btn').first().evaluate(el => Math.round(el.getBoundingClientRect().height)), 36);
      }
      if (url === '/admin/logos') {
        await page.locator('.logo-activo-card').waitFor();
        await page.locator('.almacen-card').waitFor();
        assert.equal(await page.locator('.logo-activo-card').evaluate(el => getComputedStyle(el).display), 'flex');
        assert.equal(await page.locator('.almacen-card').evaluate(el => getComputedStyle(el).display), 'flex');
      }
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        page: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(el => `${el.tagName}.${el.className}: ${Math.round(el.getBoundingClientRect().right)}`),
      }));
      assert.equal(overflow.page <= overflow.viewport, true, `${url} overflows at ${width}px: ${JSON.stringify(overflow)}`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('PASS: admin shell, login, list/form CSS and responsive widths 320/390/1280.');
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
