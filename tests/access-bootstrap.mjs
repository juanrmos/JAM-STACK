import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crearRespuestaAccessInicio } from '../Back/src/routes/accessBootstrap.ts';

test('Access bootstrap vuelve al login local en el origen de la petición', async () => {
  const request = new Request(
    'http://127.0.0.1:8787/api/auth/access/start?return_to=http%3A%2F%2F127.0.0.1%3A4331%2Fadmin%2Flogin%2F',
  );
  const response = crearRespuestaAccessInicio(request, 'http://127.0.0.1:4321', true);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'http://127.0.0.1:4331/admin/login/?access=ready');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Access bootstrap ignora retornos externos y conserva el origen configurado', async () => {
  const request = new Request(
    'http://127.0.0.1:8787/api/auth/access/start?return_to=https%3A%2F%2Fevil.example%2F',
  );
  const response = crearRespuestaAccessInicio(request, 'http://127.0.0.1:4321', true);

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'http://127.0.0.1:4321/admin/login/?access=ready');
});

test('Access bootstrap permite el alias de Preview del mismo proyecto Pages', async () => {
  const request = new Request(
    'https://portafolio-api-admin.skyheart.workers.dev/api/auth/access/start?return_to=https%3A%2F%2Fcodex-fix-admin-access.portafolio-front.pages.dev%2Fadmin%2Flogin%2F',
  );
  const response = crearRespuestaAccessInicio(request, 'https://portafolio-front.pages.dev', false);

  assert.equal(response.headers.get('location'), 'https://codex-fix-admin-access.portafolio-front.pages.dev/admin/login/?access=ready');
});
