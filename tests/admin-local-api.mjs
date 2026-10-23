// Run against `npm.cmd run dev` in Back with the ignored Back/.dev.vars file.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:8787';
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
const createdPhotos = [];
let originalQuoteFields;
let originalServiceNames;
let originalComplementaryGroup;
let originalMuralTotal;
let originalPhotos;

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
  originalMuralTotal = (await json('GET', '/api/obras?servicio_id=mural&limit=1')).data.total;
  const invalidVideo = await json('POST', '/api/obras', {
    titulo:'Video inválido', servicio_id:'mural', imagenKey:obraKey, destacado_slot:0,
    videoUrl:'https://example.org/youtube.com',
  });
  assert.equal(invalidVideo.response.status,400);
  const obra = await json('POST', '/api/obras', {
    titulo:'Prueba local de obra', servicio_id:'mural', imagenKey:obraKey, destacado_slot:0,
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

  const catalog = await json('GET', '/api/servicios');
  const expectedIds = ['mural','escultura','cuadro','restauracion','logo','fachada','materiales','electricos','drywall'];
  assert.deepEqual(catalog.data.servicios.map(({ id }) => id), expectedIds);
  originalServiceNames = catalog.data.servicios;
  originalComplementaryGroup = catalog.data.grupo_complementario;
  assert.deepEqual(originalComplementaryGroup, { id: 'complementarios', nombre_publico: 'Servicios Complementarios' });
  const renamed = originalServiceNames.map((service) => service.id === 'materiales' ? { ...service, nombre_publico: 'Materiales prueba' } : service);
  assert.equal((await json('PUT', '/api/servicios/nombres', { servicios: renamed })).response.status, 200);
  assert.equal((await json('GET', '/api/servicios')).data.servicios.find(({ id }) => id === 'materiales').nombre_publico, 'Materiales prueba');
  const groupUpdate = await json('PUT', '/api/servicios/nombres', { servicios: [], grupo_complementario: { id: 'complementarios', nombre_publico: 'Soluciones complementarias' } });
  assert.equal(groupUpdate.response.status, 200);
  assert.equal((await json('GET', '/api/servicios')).data.grupo_complementario.nombre_publico, 'Soluciones complementarias');
  assert.equal((await json('PUT', '/api/servicios/nombres', { servicios: [], grupo_complementario: { id: 'otro', nombre_publico: 'Grupo no permitido' } })).response.status, 400);

  const gallery = await json('GET', '/api/obras?servicio_id=mural&limit=5');
  assert.equal(gallery.data.total, originalMuralTotal + 1, 'Incluye la obra sintética que acaba de crear la prueba');
  assert.equal(gallery.data.obras.length, 5);
  assert.equal(gallery.data.hasMore, true);
  assert.ok(gallery.data.obras.every((item) => !('destacado_slot' in item)));
  assert.equal((await json('GET', '/api/obras?slots=5')).response.status, 400);

  originalQuoteFields = (await json('GET', '/api/cotizador/campos')).data.campos;
  assert.equal(originalQuoteFields.length, 8);
  const quoteEdited = originalQuoteFields.map((field) => ({ id: field.id, etiqueta: field.id === 'obra' ? 'Servicio temporal' : field.etiqueta, requerido: field.requerido, habilitado: field.habilitado }));
  assert.equal((await json('PUT', '/api/cotizador/campos', { campos: quoteEdited })).response.status, 200);
  assert.equal((await json('GET', '/api/cotizador/campos')).data.campos.find(({ id }) => id === 'obra').etiqueta, 'Servicio temporal');
  const quoteInvalid = quoteEdited.map((field) => field.id === 'obra' ? { ...field, id: 'campo-nuevo' } : field);
  assert.equal((await json('PUT', '/api/cotizador/campos', { campos: quoteInvalid })).response.status, 400);

  originalPhotos = (await json('GET', '/api/about/photos')).data.fotos;
  for (let index = 0; index < 2; index += 1) {
    const imagenKey = await upload('imagenes-sitio');
    const photo = await json('POST', '/api/about/photos', { imagenKey, textoAlternativo: '' });
    assert.equal(photo.response.status, 201);
    createdPhotos.push(photo.data.id);
  }
  assert.equal((await json('GET', '/api/about/photos')).data.fotos.length, originalPhotos.length + 2);
  const reorderedPhotoIds = [...originalPhotos.map(({ id }) => id), ...createdPhotos].reverse();
  assert.equal((await json('PUT', '/api/about/photos/order', { ids: reorderedPhotoIds })).response.status, 200);
  assert.deepEqual((await json('GET', '/api/about/photos')).data.fotos.map(({ id }) => id), reorderedPhotoIds);
  console.log('PASS: local login/uploads, obra/logo CRUD without slots, 9 service IDs, editable service/group names, 5+ gallery paging, about-photo CRUD/order, and bounded quote-form editing.');
} finally {
  if (originalQuoteFields) {
    // El entorno se crea con fixtures sintéticos; restablece la etiqueta inicial
    // incluso si una ejecución previa del test se interrumpió después de escribir.
    const campos = originalQuoteFields.map(({ id, etiqueta, requerido, habilitado }) => ({
      id, etiqueta: id === 'obra' ? 'Servicio o proyecto' : etiqueta, requerido, habilitado,
    }));
    await json('PUT', '/api/cotizador/campos', { campos });
  }
  if (originalServiceNames) await json('PUT', '/api/servicios/nombres', { servicios: originalServiceNames });
  if (originalComplementaryGroup) await json('PUT', '/api/servicios/nombres', { servicios: [], grupo_complementario: originalComplementaryGroup });
  for (const id of createdPhotos.reverse()) await fetch(`${base}/api/about/photos/${id}`, {method:'DELETE',headers});
  if (originalPhotos?.length) {
    const photoOrder = originalPhotos.map(({ id }) => id);
    const restoreOrder = await json('PUT', '/api/about/photos/order', { ids: photoOrder });
    assert.equal(restoreOrder.response.status, 200, 'No se pudo restablecer el orden original de fotos');
    assert.deepEqual((await json('GET', '/api/about/photos')).data.fotos.map(({ id }) => id), photoOrder);
  } else if (originalPhotos) {
    assert.equal((await json('GET', '/api/about/photos')).data.fotos.length, 0, 'No se limpiaron todas las fotos de prueba');
  }
  for (const [kind, id] of created.reverse()) {
    const response = await fetch(`${base}/api/${kind}/${id}`, {method:'DELETE',headers});
    assert.equal(response.status, 200, `No se pudo limpiar ${kind}/${id}`);
  }
}
