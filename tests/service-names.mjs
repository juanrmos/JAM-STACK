import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = 'http://127.0.0.1:8787';
const vars = Object.fromEntries(readFileSync('Back/.dev.vars', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
assert.ok(vars.ADMIN_SECRET, 'Falta ADMIN_SECRET en Back/.dev.vars');

const publicResponse = await fetch(`${base}/api/servicios`);
assert.equal(publicResponse.status, 200);
const initial = await publicResponse.json();
assert.deepEqual(initial.servicios.map(({ id }) => id), ['mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada']);
const originalName = initial.servicios.find(({ id }) => id === 'mural').nombre_publico;

const login = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secreto: vars.ADMIN_SECRET }),
});
assert.equal(login.status, 200, `El login local debe funcionar: ${login.status}`);
const { token } = await login.json();
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
let changed = false;

try {
  const invalidEmpty = await fetch(`${base}/api/servicios/nombres`, {
    method: 'PUT', headers, body: JSON.stringify({ servicios: [{ id: 'mural', nombre_publico: '   ' }] }),
  });
  assert.equal(invalidEmpty.status, 400);

  const invalidLength = await fetch(`${base}/api/servicios/nombres`, {
    method: 'PUT', headers, body: JSON.stringify({ servicios: [{ id: 'mural', nombre_publico: 'x'.repeat(41) }] }),
  });
  assert.equal(invalidLength.status, 400);

  const invalidId = await fetch(`${base}/api/servicios/nombres`, {
    method: 'PUT', headers, body: JSON.stringify({ servicios: [{ id: 'otro', nombre_publico: 'Nombre' }] }),
  });
  assert.equal(invalidId.status, 400);

  const update = await fetch(`${base}/api/servicios/nombres`, {
    method: 'PUT', headers, body: JSON.stringify({ servicios: [{ id: 'mural', nombre_publico: 'Mural renovado' }] }),
  });
  assert.equal(update.status, 200);
  changed = true;
  const after = await (await fetch(`${base}/api/servicios`)).json();
  assert.equal(after.servicios.find(({ id }) => id === 'mural').nombre_publico, 'Mural renovado');
  assert.equal(after.servicios.find(({ id }) => id === 'escultura').nombre_publico, 'Esculturas');
  console.log('PASS: catálogo público, cambio autorizado, validación de nombre e ID; servicio y relaciones conservan su ID.');
} finally {
  if (changed) {
    const restore = await fetch(`${base}/api/servicios/nombres`, {
      method: 'PUT', headers, body: JSON.stringify({ servicios: [{ id: 'mural', nombre_publico: originalName }] }),
    });
    assert.equal(restore.status, 200, 'No se pudo restaurar el nombre inicial de prueba.');
  }
}
