import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../Front/functions/admin/api/[[path]].ts';

test('el proxy mantiene el API bajo Pages y reenvía el JWT de Access', async () => {
  let forwarded;
  const response = await onRequest({
    request: new Request('https://portafolio-front.pages.dev/admin/api/auth/login?source=admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'CF_Authorization=browser-cookie',
        'Cf-Access-Jwt-Assertion': 'signed-access-jwt',
      },
      body: JSON.stringify({ secreto: 'not-a-real-secret' }),
    }),
    env: {
      ADMIN_API: {
        async fetch(request) {
          forwarded = request;
          return Response.json({ ok: true });
        },
      },
    },
  });

  assert.equal(response.status, 200);
  assert.equal(new URL(forwarded.url).pathname, '/api/auth/login');
  assert.equal(new URL(forwarded.url).search, '?source=admin');
  assert.equal(forwarded.headers.get('cf-access-jwt-assertion'), 'signed-access-jwt');
  assert.equal(forwarded.headers.get('cookie'), null);
  assert.deepEqual(await forwarded.json(), { secreto: 'not-a-real-secret' });
});

test('el proxy rechaza rutas que no pertenecen a auth, obras o logos', async () => {
  let called = false;
  const response = await onRequest({
    request: new Request('https://portafolio-front.pages.dev/admin/api/local-upload/file', {
      method: 'PUT',
      body: 'data',
    }),
    env: {
      ADMIN_API: {
        async fetch() {
          called = true;
          return new Response(null);
        },
      },
    },
  });

  assert.equal(response.status, 404);
  assert.equal(called, false);
});
