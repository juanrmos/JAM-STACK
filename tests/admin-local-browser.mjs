// Requires the local Worker at :8787 and `npm.cmd run build:local` in Front.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';

const dist = resolve('Front/dist');
const secret = readFileSync('Back/.dev.vars', 'utf8').match(/^ADMIN_SECRET=(.+)$/m)?.[1];
assert.ok(secret);
const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server = createServer((req,res) => {
  let file = resolve(dist, '.' + new URL(req.url,'http://localhost').pathname);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = resolve(file,'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type',types[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(done => server.listen(4331,'127.0.0.1',done));
const browser = await chromium.launch({headless:true,channel:'msedge'});
const context = await browser.newContext({viewport:{width:1280,height:900}});
const page = await context.newPage();
const external = [];
const created = [];
let token = null;
const errors = [];
page.setDefaultTimeout(10000);
page.setDefaultNavigationTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.request().method() === 'POST' && response.url().includes('/api/')) {
    console.log('browser response:', response.status(), new URL(response.url()).pathname);
  }
});
page.on('dialog', dialog => dialog.accept());
await context.route('**/*', route => {
  const hostname = new URL(route.request().url()).hostname;
  if (hostname === '127.0.0.1' || hostname === 'localhost') return route.continue();
  external.push(hostname); return route.abort();
});

try {
  await page.goto('http://127.0.0.1:4331/admin/login');
  await page.locator('#access-start').waitFor({state:'visible'});
  assert.equal(await page.locator('#form-login').isVisible(), false);
  await page.locator('#access-start').click();
  await page.waitForURL('**/admin/login/?access=ready');
  assert.equal(await page.locator('#form-login').isVisible(), true);
  assert.equal(await page.locator('#access-start').isVisible(), false);
  await page.locator('#input-secreto').fill(secret);
  await page.locator('#btn-login').click();
  await page.waitForURL('**/admin/obras');
  console.log('browser: login');
  token = await page.evaluate(() => localStorage.getItem('admin_jwt'));
  await page.locator('.slot-card').first().waitFor();

  await page.goto('http://127.0.0.1:4331/admin/obras/nueva');
  await page.locator('#f-titulo').fill('Prueba navegador local');
  await page.locator('#f-cat').selectOption('mural');
  await page.locator('#f-desc').fill('Descripción temporal');
  await page.locator('#f-video').fill('https://www.youtube.com/watch?v=abcdefghijk');
  await page.locator('#f-archivo').setInputFiles('Front/public/images/hero-obra.jpg');
  const obraPost = page.waitForResponse(response => response.url() === 'http://127.0.0.1:8787/api/obras' && response.request().method() === 'POST', {timeout:10000});
  await page.locator('#f-btn').click();
  const obraResponse = await obraPost;
  console.log('browser: obra response captured');
  assert.equal(obraResponse.status(),201);
  const obraListing = await fetch('http://127.0.0.1:8787/api/obras?categoria=mural&buscar=Prueba%20navegador%20local&limit=100').then(r=>r.json());
  const obraId = obraListing.obras.find(obra => obra.titulo === 'Prueba navegador local')?.id;
  assert.ok(obraId);
  created.push(['obras',obraId]);
  console.log('browser: obra POST', page.url());
  await page.waitForURL(/\/admin\/obras\/?$/, {waitUntil:'commit',timeout:10000});
  console.log('browser: obra creada');
  await page.locator('#filtro-buscar').fill('Prueba navegador local');
  await page.locator('.grilla-card').filter({hasText:'Prueba navegador local'}).waitFor();
  console.log('browser: obra visible');

  await page.goto(`http://127.0.0.1:4331/admin/obras/editar?id=${obraId}`);
  await page.locator('#f-titulo').waitFor();
  await page.waitForFunction(() =>
    document.querySelector('#f-titulo')?.value === 'Prueba navegador local' &&
    document.querySelector('#f-desc')?.value === 'Descripción temporal' &&
    document.querySelector('#f-video')?.value === 'https://www.youtube.com/watch?v=abcdefghijk'
  );
  await page.locator('#f-titulo').fill('Prueba navegador editada');
  await page.locator('#f-desc').fill('');
  await page.locator('#f-video').fill('');
  const obraPut = page.waitForResponse(response => response.url().endsWith(`/api/obras/${obraId}`) && response.request().method() === 'PUT');
  await page.locator('#f-btn').click();
  assert.equal((await obraPut).status(),200);
  await page.waitForURL(/\/admin\/obras\/?$/, {waitUntil:'commit',timeout:10000});
  const clearedObra = await fetch(`http://127.0.0.1:8787/api/obras/${obraId}`, {
    headers:{Authorization:`Bearer ${token}`},
  }).then(response => response.json());
  assert.equal(clearedObra.descripcion,null);
  assert.equal(clearedObra.videoUrl,null);
  console.log('browser: obra editada');

  await page.goto('http://127.0.0.1:4331/admin/logos/nueva');
  await page.locator('#fl-nombre').fill('Logo navegador local');
  await page.locator('#fl-archivo').setInputFiles('Front/public/images/hero-obra.jpg');
  const logoPost = page.waitForResponse(response => response.url() === 'http://127.0.0.1:8787/api/logos' && response.request().method() === 'POST');
  await page.locator('#fl-btn').click();
  const logoResponse = await logoPost;
  assert.equal(logoResponse.status(),201);
  const logoListing = await fetch('http://127.0.0.1:8787/api/logos?limit=100').then(r=>r.json());
  const logoId = logoListing.logos.find(logo => logo.nombre === 'Logo navegador local')?.id;
  assert.ok(logoId);
  created.push(['logos',logoId]);
  const originalLogo = await fetch(`http://127.0.0.1:8787/api/logos/${logoId}`, {
    headers:{Authorization:`Bearer ${token}`},
  }).then(response => response.json());
  await page.waitForURL(/\/admin\/logos\/?$/, {waitUntil:'commit',timeout:10000});
  console.log('browser: logo creado');
  await page.locator('.almacen-card').filter({hasText:'Logo navegador local'}).waitFor();

  await page.goto(`http://127.0.0.1:4331/admin/logos/editar?id=${logoId}`);
  await page.waitForFunction(() => document.querySelector('#fl-nombre')?.value === 'Logo navegador local');
  await page.locator('#fl-nombre').fill('Logo navegador editado');
  await page.locator('#fl-archivo').setInputFiles('Front/public/images/hero-obra.jpg');
  const logoPut = page.waitForResponse(response => response.url().endsWith(`/api/logos/${logoId}`) && response.request().method() === 'PUT');
  await page.locator('#fl-btn').click();
  assert.equal((await logoPut).status(),200);
  await page.waitForURL(/\/admin\/logos\/?$/, {waitUntil:'commit',timeout:10000});
  const updatedLogo = await fetch(`http://127.0.0.1:8787/api/logos/${logoId}`, {
    headers:{Authorization:`Bearer ${token}`},
  }).then(response => response.json());
  assert.notEqual(updatedLogo.imagenUrl,originalLogo.imagenUrl);
  assert.equal((await fetch(originalLogo.imagenUrl)).status,404);
  console.log('browser: logo editado');

  assert.deepEqual(errors,[]);
  assert.equal(external.some(host => /workers\.dev|r2\.dev/.test(host)),false);
  console.log('PASS: browser login, local image uploads, obras/logos create-edit-list, no production API/R2.');
} finally {
  if (token) {
    const staleObras = await fetch('http://127.0.0.1:8787/api/obras?categoria=mural&buscar=Prueba%20navegador&limit=100').then(r=>r.json()).catch(()=>({obras:[]}));
    for (const obra of staleObras.obras || []) if (obra.titulo?.startsWith('Prueba navegador')) created.push(['obras',obra.id]);
    const staleLogos = await fetch('http://127.0.0.1:8787/api/logos?limit=100').then(r=>r.json()).catch(()=>({logos:[]}));
    for (const logo of staleLogos.logos || []) if (logo.nombre?.startsWith('Logo navegador')) created.push(['logos',logo.id]);
  }
  if (token) for (const [kind,id] of [...new Map(created.map(([kind,id])=>[`${kind}/${id}`,[kind,id]])).values()].reverse()) {
    await fetch(`http://127.0.0.1:8787/api/${kind}/${id}`, {method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
  }
  await context.close();
  await browser.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
