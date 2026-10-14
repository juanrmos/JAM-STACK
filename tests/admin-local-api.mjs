// Run against `npm.cmd run dev` in Back with the ignored Back/.dev.vars file.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = 'http://127.0.0.1:8787';
const vars = Object.fromEntries(readFileSync('Back/.dev.vars', 'utf8').split(/\r?\n/)
  .filter(line => line && !line.startsWith('#'))
  .map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
assert.ok(vars.ADMIN_SECRET && vars.JWT_SECRET, 'Faltan secretos de prueba en Back/.dev.vars');
const probe = await fetch(`${base}/api/local-upload/probe`, {method:'PUT',headers:{'Content-Type':'image/jpeg'},body:'x'});
assert.equal(probe.status, 400, `El Worker en ${base} no es la versión local con subida (${probe.status})`);

const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({secreto:vars.ADMIN_SECRET}),
});
assert.equal(login.status, 200, `El login local debe funcionar: ${login.status} ${await login.clone().text()}`);
const {token} = await login.json();
const headers = {Authorization:`Bearer ${token}`, 'Content-Type':'application/json'};
const image = readFileSync('Front/public/images/hero-obra.jpg');
const created = [];

async function json(method, path, payload) {
  const response = await fetch(`${base}${path}`, {method, headers, body: payload === undefined ? undefined : JSON.stringify(payload)});
  return {response, data: await response.json()};
}

async function upload(kind) {
  const {response, data} = await json('POST', `/api/${kind}/upload-url`, {nombreArchivo:'prueba-local.jpg',tipoMime:'image/jpeg'});
  assert.equal(response.status, 200);
  const url = new URL(data.uploadUrl);
  assert.equal(url.origin, base);
  assert.match(url.pathname, /^\/api\/local-upload\//);
  assert.equal(new URL(data.imagenKey, `${base}/api/media/`).origin, base);
  const unsigned = new URL(url);
  unsigned.search = '';
  assert.equal((await fetch(unsigned, {method:'PUT',headers:{'Content-Type':'image/jpeg'},body:image})).status, 400);
  assert.equal((await fetch(url, {method:'PUT',headers:{'Content-Type':'image/png'},body:image})).status, 403);
  assert.equal((await fetch(url, {method:'PUT',headers:{'Content-Type':'image/jpeg'},body:image})).status, 201);
  const stored = await fetch(`${base}/api/media/${data.imagenKey}`);
  assert.equal(stored.status, 200);
  assert.equal(stored.headers.get('content-type'), 'image/jpeg');
  assert.equal((await stored.arrayBuffer()).byteLength, image.byteLength);
  return data.imagenKey;
}

try {
  const obraKey = await upload('obras');
  const invalidVideo = await json('POST', '/api/obras', {
    titulo:'Video inválido', categoria:'mural', imagenKey:obraKey, orden:0,
    videoUrl:'https://example.org/youtube.com',
  });
  assert.equal(invalidVideo.response.status,400);
  const obra = await json('POST', '/api/obras', {
    titulo:'Prueba local de obra', categoria:'mural', imagenKey:obraKey, orden:0,
  });
  assert.equal(obra.response.status, 201);
  created.push(['obras', obra.data.id]);
  const obraRead = await json('GET', `/api/obras/${obra.data.id}`);
  assert.equal(obraRead.data.titulo, 'Prueba local de obra');
  assert.equal(obraRead.data.imagenUrl, `${base}/api/media/${obraKey}`);
  const obraUpdate = await json('PUT', `/api/obras/${obra.data.id}`, {titulo:'Obra local editada'});
  assert.equal(obraUpdate.response.status, 200);
  assert.equal((await json('GET', `/api/obras/${obra.data.id}`)).data.titulo, 'Obra local editada');

  const logoKey = await upload('logos');
  const logo = await json('POST', '/api/logos', {nombre:'Logo local de prueba',imagenKey:logoKey,activo:false});
  assert.equal(logo.response.status, 201);
  created.push(['logos', logo.data.id]);
  assert.equal((await json('GET', `/api/logos/${logo.data.id}`)).data.nombre, 'Logo local de prueba');
  assert.equal((await json('PUT', `/api/logos/${logo.data.id}`, {nombre:'Logo local editado'})).response.status, 200);
  assert.equal((await json('GET', `/api/logos/${logo.data.id}`)).data.nombre, 'Logo local editado');
  console.log('PASS: login, signed local upload, R2 read, obra/logo create-edit-read.');
} finally {
  for (const [kind, id] of created.reverse()) {
    const response = await fetch(`${base}/api/${kind}/${id}`, {method:'DELETE',headers});
    assert.equal(response.status, 200, `No se pudo limpiar ${kind}/${id}`);
  }
}
