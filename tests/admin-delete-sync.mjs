import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const dist = resolve('Front/dist');
const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml','.png':'image/png'};
const server = createServer((req, res) => {
  let file = resolve(dist, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done => server.listen(4332, '127.0.0.1', done));

const artwork = ['mural','cuadro'].flatMap(categoria => [1,2].map(orden => ({
  id:`${categoria}-${orden}`,titulo:`${categoria} ${orden}`,categoria,orden,imagenUrl:'/images/hero-obra.jpg',
})));
const logos = [{id:'logo-activo',nombre:'Logo de prueba',activo:true,imagenUrl:'/images/hero-obra.jpg',fechaCreacion:'2026-10-11T00:00:00Z'}];
let failFirstArtworkDelete = true;
const browser = await chromium.launch({headless:true,channel:'msedge'});
const context = await browser.newContext();
await context.addInitScript(() => localStorage.setItem('admin_jwt','local-test-token'));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('dialog', dialog => dialog.accept());
await context.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  if (path === '/api/obras' && request.method() === 'GET') {
    let rows = artwork.filter(obra => obra.categoria === url.searchParams.get('categoria'));
    if (url.searchParams.get('orden') === '1-5') rows = rows.filter(obra => obra.orden > 0);
    return route.fulfill({json:{obras:rows,total:rows.length,hasMore:false}});
  }
  if (path.startsWith('/api/obras/') && request.method() === 'DELETE') {
    if (path.endsWith('/mural-1') && failFirstArtworkDelete) {
      failFirstArtworkDelete = false;
      return route.fulfill({status:500,json:{error:'fallo simulado'}});
    }
    const index = artwork.findIndex(obra => obra.id === path.split('/').pop());
    if (index < 0) return route.fulfill({status:404});
    const [removed] = artwork.splice(index,1);
    artwork.filter(obra => obra.categoria === removed.categoria && obra.orden > removed.orden)
      .forEach(obra => obra.orden--);
    return route.fulfill({json:{eliminado:true}});
  }
  if (path.startsWith('/api/obras/') && request.method() === 'GET') {
    const obra = artwork.find(obra => obra.id === path.split('/').pop());
    return obra ? route.fulfill({json:obra}) : route.fulfill({status:404});
  }
  if (path === '/api/logos' && request.method() === 'GET') {
    const rows = url.searchParams.get('activo') === '1' ? logos.filter(logo => logo.activo) : logos;
    return route.fulfill({json:{logos:rows,total:rows.length,hasMore:false}});
  }
  if (path.startsWith('/api/logos/') && request.method() === 'DELETE') {
    const index = logos.findIndex(logo => logo.id === path.split('/').pop());
    if (index < 0) return route.fulfill({status:404});
    logos.splice(index,1);
    return route.fulfill({json:{eliminado:true}});
  }
  return route.fulfill({status:404});
});

try {
  for (const categoria of ['mural','cuadro']) {
    await page.goto('http://127.0.0.1:4332/admin/obras');
    await page.locator('#filtro-categoria').selectOption(categoria);
    await page.locator('.slot-card--ocupado[data-id="'+categoria+'-1"]').waitFor();
    if (categoria === 'mural') {
      const failedDelete = page.waitForResponse(response => response.url().endsWith('/api/obras/mural-1') && response.request().method() === 'DELETE');
      await page.locator('.grilla-card').filter({hasText:'mural 1'}).locator('.btn-grilla-borrar').click();
      assert.equal((await failedDelete).status(),500);
      await page.waitForFunction(() => !document.querySelector('.btn-grilla-borrar[data-id="mural-1"]')?.disabled);
      assert.equal(await page.locator('.slot-card--ocupado[data-id="mural-1"]').count(),1);
    }
    await page.locator('.grilla-card').filter({hasText:`${categoria} 1`}).locator('.btn-grilla-borrar').click();
    await page.locator(`.slot-card--ocupado[data-id="${categoria}-2"]`).waitFor();
    await page.waitForFunction(id => !document.querySelector(`.slot-card--ocupado[data-id="${id}"]`), `${categoria}-1`);
    assert.equal(await page.locator(`.slot-card--ocupado[data-id="${categoria}-2"]`).count(),1);
    assert.equal(await page.locator('.grilla-card').filter({hasText:`${categoria} 1`}).count(),0);
  }

  await page.goto('http://127.0.0.1:4332/admin/logos');
  await page.locator('.logo-activo-card').filter({hasText:'Logo de prueba'}).waitFor();
  await page.locator('.almacen-card').locator('.btn-borrar').click();
  await page.locator('.logo-activo-card--empty').waitFor();
  await page.locator('.almacen-bloque__empty').waitFor();

  await page.goto('http://127.0.0.1:4332/admin/obras/nueva');
  await page.getByText('Elige una categoría para ver sus posiciones.').waitFor();
  await page.locator('#f-cat').selectOption('cuadro');
  await page.locator('.f-slot-card').first().waitFor();
  assert.equal(await page.locator('.f-slot-card').count(),5);
  await page.locator('.f-slot-card[data-slot="3"]').click();
  assert.equal(await page.locator('.f-slot-card[data-slot="3"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.formulario-box__actions a[href="/admin/obras"]').count(),1);
  const droppedFile = await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['imagen de prueba'], 'obra.png', {type:'image/png'}));
    document.querySelector('#f-dropzone').dispatchEvent(new DragEvent('drop', {
      bubbles:true,cancelable:true,dataTransfer:transfer,
    }));
    return document.querySelector('#f-archivo').files?.[0]?.name;
  });
  assert.equal(droppedFile,'obra.png');
  assert.equal(await page.locator('#f-file-name').textContent(),'obra.png');

  await page.goto('http://127.0.0.1:4332/admin/obras/editar?id=cuadro-2');
  await page.locator('.f-slot-card--current[aria-pressed="true"]').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS: obra destacada borrada en dos categorías, logo activo borrado y formulario de slots sincronizados.');
} finally {
  await context.close();
  await browser.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
