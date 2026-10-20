// Requires: local Worker seeded at :8787 and Front built with npm run build:local.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';
const types = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.png':'image/png', '.svg':'image/svg+xml' };
const server = createServer((req,res) => {
  let file = resolve('Front/dist', '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(resolve('Front/dist'))) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done => server.listen(4329,'127.0.0.1',done));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const origin = process.argv[2] || 'http://127.0.0.1:4329';
try {
  const context = await browser.newContext({ viewport: { width:390, height:844 } });
  const remote = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1','localhost'].includes(url.hostname)) return route.continue();
    remote.push(url.hostname); return route.abort();
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin);
  await page.waitForFunction(() => document.querySelector('#riel-mural')?.children.length === 5);
  assert.equal((await page.locator('.nav__logo').innerText()).trim(),'Corporacion Antony Rodriguez');
  assert.equal((await page.locator('.footer__logo').innerText()).trim(),'Corporacion Antony Rodriguez');
  assert.match(await page.locator('.cotizador__eyebrow').innerText(),/Corporacion Antony Rodriguez/i);
  const visual = await page.evaluate(() => ({
    services: getComputedStyle(document.querySelector('.servicios__card')).borderTopStyle,
    gallery: getComputedStyle(document.querySelector('#riel-mural')).display,
    form: getComputedStyle(document.querySelector('#cotizador-form')).display,
    bodyFont: getComputedStyle(document.body).fontFamily,
  }));
  assert.equal(visual.services,'solid');
  assert.equal(visual.gallery,'flex');
  assert.equal(visual.form,'flex');
  assert.match(visual.bodyFont,/DM Sans|General Sans/);
  assert.equal(await page.locator('.servicios__card').count(),6);
  await page.waitForFunction(() => document.querySelector('#hero-img-dinamica')?.src.includes('/api/media/') && document.querySelector('#hero-img-dinamica').naturalWidth > 0);
  for (const category of ['mural','fachada','cuadro']) assert.equal(await page.locator(`[data-categoria="${category}"] [data-dir="1"]`).isDisabled(),false);
  assert.equal(await page.locator('[data-categoria="escultura"] [data-dir="1"]').isDisabled(),true);
  for (const [category,count] of [['mural',12],['fachada',6]]) {
    for (let attempt=0; attempt<10; attempt++) {
      if (await page.locator(`#riel-${category} .riel-tarjeta`).count() === count) break;
      await page.locator(`#riel-${category}`).evaluate(el => { el.scrollLeft = el.scrollWidth; });
      await page.waitForTimeout(200);
    }
    assert.equal(await page.locator(`#riel-${category} .riel-tarjeta`).count(),count);
    await page.locator(`#riel-${category}`).evaluate(el => { el.scrollLeft = 0; });
    await page.waitForTimeout(100);
    assert.equal(await page.locator(`[data-categoria="${category}"] [data-dir="1"]`).isDisabled(),false);
  }
  await page.locator('[data-categoria="cuadro"] [data-dir="1"]').click();
  await page.waitForFunction(() => document.querySelector('#riel-cuadro').scrollLeft > 0);
  await page.locator('#riel-mural .riel-tarjeta').first().click();
  assert.equal(await page.locator('#video-modal').evaluate(el=>el.open),true);
  assert.match(await page.locator('#modal-video-iframe').getAttribute('src'),/youtube.com\/embed\/dQw4w9WgXcQ/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#modal-video-iframe').hasAttribute('src'));
  await page.evaluate(()=>window.open=(url)=>{window.__opened=url;return null;});
  for (const button of ['#nav-cotizar-btn','#hero-cotizar-btn']) {
    await page.locator(button).click();
    assert.equal(await page.locator('#cotizador-drawer').evaluate(el=>el.classList.contains('open')),true);
    await page.locator('#cotizador-cerrar').click();
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('cotizador-abierto')),false);
  }
  await page.locator('#hero-cotizar-btn').click();
  for (const [key,value] of Object.entries({obra:'Árbol & flores',medidas:'12 m²',altura:'2 metros',direccion:'Jr. Prueba 123',referencia:'Parque'})) await page.locator(`#cot-${key}`).fill(value);
  await page.locator('#cot-ubicacion').selectOption('interior');
  await page.locator('.cotizador__enviar').click();
  const opened = new URL(await page.evaluate(()=>window.__opened));
  assert.equal(opened.hostname,'wa.me');
  assert.equal(opened.pathname,'/51949772875');
  for (const text of ['Árbol & flores','12 m²','interior','2 metros','Jr. Prueba 123','Parque']) assert.ok(opened.searchParams.get('text').includes(text));
  assert.equal(new URL(await page.locator('#boton-whatsapp').getAttribute('href')).pathname,opened.pathname);
  mkdirSync('.work/screenshots',{recursive:true});
  await page.waitForTimeout(600); // drawer closing animation
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'.work/screenshots/public-mobile.png',fullPage:true});
  await page.setViewportSize({width:320,height:850});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),320);
  assert.equal(await page.locator('#nav-cotizar-btn').evaluate(el=>el.getBoundingClientRect().right <= innerWidth),true);
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'.work/screenshots/public-desktop.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
  assert.deepEqual(errors,[]);
  assert.equal(remote.some(host => /workers\.dev|r2\.dev/.test(host)),false);
  assert.equal(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length),0);
  // Failures are isolated per category, and retry keeps the other categories.
  await page.route('**/api/obras?*',route=>new URL(route.request().url()).searchParams.get('categoria')==='mural'?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('[data-categoria="mural"] [data-reintentar]')?.hidden===false);
  await page.waitForFunction(()=>document.querySelector('#riel-cuadro').children.length===5);
  await page.unroute('**/api/obras?*');
  await page.locator('[data-categoria="mural"] [data-reintentar]').click();
  await page.waitForFunction(()=>document.querySelector('#riel-mural').children.length===5);
  // Empty data and missing/failed logo leave a useful static page.
  await page.route('**/api/obras?*',route=>route.fulfill({json:{obras:[],total:0,hasMore:false}}));
  await page.route('**/api/logos?*',route=>route.fulfill({json:{logos:[],total:0,hasMore:false}}));
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#galeria-estado').textContent.includes('Aún no'));
  assert.match(await page.locator('#hero-img-dinamica').getAttribute('src'),/hero-obra.jpg/);
  await page.unroute('**/api/logos?*');
  await page.route('**/api/logos?*',route=>route.fulfill({status:503}));
  await page.reload(); await page.waitForLoadState('networkidle');
  assert.match(await page.locator('#hero-img-dinamica').getAttribute('src'),/hero-obra.jpg/);
  // El shell administrativo conserva la base compartida sin navegación pública.
  await page.evaluate(()=>localStorage.removeItem('admin_jwt'));
  await page.goto(origin+'/admin/login');
  assert.equal(await page.locator('main').count(),1);
  await page.evaluate(()=>localStorage.setItem('admin_jwt','test-placeholder'));
  await page.route('**/api/obras?*',route=>route.fulfill({json:{obras:[],total:0,hasMore:false}}));
  await page.route('**/api/logos?*',route=>route.fulfill({json:{logos:[],total:0,hasMore:false}}));
  for (const route of ['/admin/obras','/admin/logos']) {
    await page.goto(origin+route); await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('main').count(),1);
    assert.equal(await page.locator('.header').isVisible(),false);
    assert.equal(await page.locator('.footer').isVisible(),false);
    assert.equal((await page.locator('.admin-header__title').innerText()).trim(),'Corporacion Antony Rodriguez');
  }
  console.log('PASS: local D1/R2, public flows, pagination 1/5/6/12, video/Escape, quote, errors/retry/fallback, admin shell, no production API, mobile/desktop.');
} finally { await browser.close(); await new Promise(done=>server.close(done)); }
