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
const createdAboutPhotos = [];
let token = null;
let originalAboutTexts = null;
let originalAboutPhotoIds = null;
const aboutTestRun = `Prueba Admin temporal ${Date.now()}`;
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
  await page.locator('#obras-grilla .grilla-card, #obras-grilla .obras-grilla__empty').first().waitFor();

  await page.goto('http://127.0.0.1:4331/admin/obras/nueva');
  await page.locator('#f-titulo').fill('Prueba navegador local');
  await page.locator('#f-cat').selectOption('mural');
  await page.locator('#f-desc').fill('Descripción temporal');
  await page.locator('#f-video').fill('https://www.youtube.com/watch?v=abcdefghijk');
  await page.locator('#f-ubicacion').fill('Huánuco, prueba local');
  await page.locator('#f-anio').fill('2024');
  await page.locator('#f-archivo').setInputFiles('Front/public/images/hero-obra.jpg');
  const obraPost = page.waitForResponse(response => response.url() === 'http://127.0.0.1:8787/api/obras' && response.request().method() === 'POST', {timeout:10000});
  await page.locator('#f-btn').click();
  const obraResponse = await obraPost;
  console.log('browser: obra response captured');
  assert.equal(obraResponse.status(),201);
  const obraListing = await fetch('http://127.0.0.1:8787/api/obras?servicio_id=mural&buscar=Prueba%20navegador%20local&limit=100').then(r=>r.json());
  const obraId = obraListing.obras.find(obra => obra.titulo === 'Prueba navegador local')?.id;
  assert.ok(obraId);
  created.push(['obras',obraId]);
  const createdWork = await fetch(`http://127.0.0.1:8787/api/obras/${obraId}`, {headers:{Authorization:`Bearer ${token}`}}).then(response=>response.json());
  assert.equal(createdWork.descripcion,'Descripción temporal');
  assert.equal(createdWork.videoUrl,'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(createdWork.ubicacion,'Huánuco, prueba local');
  assert.equal(createdWork.anio,2024);
  assert.equal((await fetch(createdWork.imagenUrl)).status,200,'La imagen subida debe quedar disponible en el servidor local');
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
    document.querySelector('#f-video')?.value === 'https://www.youtube.com/watch?v=abcdefghijk' &&
    document.querySelector('#f-ubicacion')?.value === 'Huánuco, prueba local' &&
    document.querySelector('#f-anio')?.value === '2024'
  );
  await page.locator('#f-titulo').fill('Prueba navegador editada');
  await page.locator('#f-desc').fill('Descripción editada para prueba.');
  await page.locator('#f-video').fill('https://youtu.be/abcdefghijk');
  await page.locator('#f-ubicacion').fill('Lima, prueba local');
  await page.locator('#f-anio').fill('2025');
  const obraPut = page.waitForResponse(response => response.url().endsWith(`/api/obras/${obraId}`) && response.request().method() === 'PUT');
  await page.locator('#f-btn').click();
  assert.equal((await obraPut).status(),200);
  await page.waitForURL(/\/admin\/obras\/?$/, {waitUntil:'commit',timeout:10000});
  const clearedObra = await fetch(`http://127.0.0.1:8787/api/obras/${obraId}`, {
    headers:{Authorization:`Bearer ${token}`},
  }).then(response => response.json());
  assert.equal(clearedObra.titulo,'Prueba navegador editada');
  assert.equal(clearedObra.descripcion,'Descripción editada para prueba.');
  assert.equal(clearedObra.videoUrl,'https://youtu.be/abcdefghijk');
  assert.equal(clearedObra.ubicacion,'Lima, prueba local');
  assert.equal(clearedObra.anio,2025);
  await page.goto('http://127.0.0.1:4321/?vista=obras');
  const publicTestCard=page.locator('.archive-card').filter({hasText:'Prueba navegador editada'});
  await publicTestCard.waitFor();
  await publicTestCard.click();
  const publicVideoLink=page.locator('#lightbox-video');
  await publicVideoLink.waitFor({state:'visible'});
  assert.equal(await publicVideoLink.getAttribute('href'),'https://www.youtube.com/embed/abcdefghijk?autoplay=1');
  assert.equal(await publicVideoLink.getAttribute('target'),'_blank');
  console.log('browser: obra editada');

  await page.goto('http://127.0.0.1:4331/admin/sobre-nosotros');
  const aboutSnapshot = await fetch('http://127.0.0.1:8787/api/contenido').then(response=>response.json());
  const aboutKeys = ['about.photoCaption','about.eyebrow','about.title','about.titleAccent','about.description'];
  originalAboutTexts = Object.fromEntries(aboutKeys.map(key=>[key,aboutSnapshot.textos[key]]));
  const beforePhotos = await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
  originalAboutPhotoIds = beforePhotos.fotos.map(photo=>photo.id);
  assert.ok(beforePhotos.fotos.length <= 18, 'Debe haber espacio para probar dos fotos sin tocar las existentes');
  await page.waitForFunction(values=>Object.entries(values).every(([key,value])=>document.querySelector(`[name="${key}"]`)?.value===value),originalAboutTexts);
  const aboutTestTexts = {
    'about.photoCaption': `${aboutTestRun} galería`,
    'about.eyebrow': 'PRUEBA TEMPORAL',
    'about.title': 'Arte temporal para pruebas',
    'about.titleAccent': 'temporal',
    'about.description': `${aboutTestRun}: descripción para comprobar el guardado de todos los campos de Sobre nosotros.`,
  };
  for (const [key,value] of Object.entries(aboutTestTexts)) await page.locator(`[name="${key}"]`).fill(value);
  await page.locator('#about-text-save').click();
  await page.getByText('Textos guardados.').waitFor();
  const savedAbout = await fetch('http://127.0.0.1:8787/api/contenido').then(response=>response.json());
  for (const [key,value] of Object.entries(aboutTestTexts)) assert.equal(savedAbout.textos[key],value,`${key} se guardó desde Admin`);
  for (const [key,value] of Object.entries(originalAboutTexts)) await page.locator(`[name="${key}"]`).fill(value);
  await page.locator('#about-text-save').click();
  await page.getByText('Textos guardados.').waitFor();

  for (let index=1; index<=2; index++) {
    await page.locator('#about-photo-file').setInputFiles('Front/public/images/hero-obra.jpg');
    await page.locator('#about-photo-alt').fill(`${aboutTestRun} foto ${index}`);
    await page.locator('#about-photo-upload button[type="submit"]').click();
    await page.getByText('Fotografía agregada.').waitFor();
    const currentPhotos = await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
    const createdPhoto = currentPhotos.fotos.find(photo=>photo.texto_alternativo===`${aboutTestRun} foto ${index}`);
    assert.ok(createdPhoto,`La foto ${index} se guardó con su texto alternativo`);
    assert.equal((await fetch(createdPhoto.imagenUrl)).status,200,`La foto ${index} debe poder consultarse después de subirla`);
    createdAboutPhotos.push(createdPhoto.id);
  }
  let orderedPhotos = await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
  const beforeMoveIds = orderedPhotos.fotos.map(photo=>photo.id);
  const secondPhotoIndex = beforeMoveIds.indexOf(createdAboutPhotos[1]);
  assert.ok(secondPhotoIndex > 0);
  await page.locator(`#about-photo-list article`).nth(secondPhotoIndex).locator('[data-move="up"]').click();
  await page.waitForFunction(async expected => {
    const result=await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
    return result.fotos.map(photo=>photo.id).join(',')===expected;
  },[...beforeMoveIds.slice(0,secondPhotoIndex-1),createdAboutPhotos[1],createdAboutPhotos[0],...beforeMoveIds.slice(secondPhotoIndex+1)].join(','));
  await page.locator('#about-photo-list article').filter({hasText:`${aboutTestRun} foto 2`}).locator('[data-move="down"]').click();
  await page.waitForFunction(async expected => {
    const result=await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
    return result.fotos.map(photo=>photo.id).join(',')===expected;
  },beforeMoveIds.join(','));
  for (const photoId of createdAboutPhotos) {
    await page.locator(`[data-delete-photo="${photoId}"]`).click();
    await page.getByText('Fotografía quitada.').waitFor();
  }
  const afterPhotoCleanup = await fetch('http://127.0.0.1:8787/api/about/photos').then(response=>response.json());
  assert.deepEqual(afterPhotoCleanup.fotos.map(photo=>photo.id),originalAboutPhotoIds);
  createdAboutPhotos.length=0;
  console.log('browser: textos y galería de Sobre nosotros');

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
  console.log('PASS: browser login, all obra fields and YouTube links, local photo uploads, About texts/gallery order/delete, logo create/edit, no production API/R2.');
} finally {
  if (token) {
    const staleObras = await fetch('http://127.0.0.1:8787/api/obras?servicio_id=mural&buscar=Prueba%20navegador&limit=100').then(r=>r.json()).catch(()=>({obras:[]}));
    for (const obra of staleObras.obras || []) if (obra.titulo?.startsWith('Prueba navegador')) created.push(['obras',obra.id]);
    const staleLogos = await fetch('http://127.0.0.1:8787/api/logos?limit=100').then(r=>r.json()).catch(()=>({logos:[]}));
    for (const logo of staleLogos.logos || []) if (logo.nombre?.startsWith('Logo navegador')) created.push(['logos',logo.id]);
  }
  if (token) for (const [kind,id] of [...new Map(created.map(([kind,id])=>[`${kind}/${id}`,[kind,id]])).values()].reverse()) {
    await fetch(`http://127.0.0.1:8787/api/${kind}/${id}`, {method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
  }
  if (token && originalAboutTexts) await fetch('http://127.0.0.1:8787/api/textos', {method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({textos:originalAboutTexts})});
  if (token) for (const id of createdAboutPhotos) await fetch(`http://127.0.0.1:8787/api/about/photos/${id}`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
  await context.close();
  await browser.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
