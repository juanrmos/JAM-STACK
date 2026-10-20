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

test('el proxy inicia Access con navegación de nivel superior hacia el Worker', async () => {
  let forwarded;
  const response = await onRequest({
    request: new Request('https://portafolio-front.pages.dev/admin/api/auth/access/start?return_to=https%3A%2F%2Fportafolio-front.pages.dev%2Fadmin%2Flogin%2F', {
      headers: { 'Cf-Access-Jwt-Assertion': 'signed-access-jwt' },
    }),
    env: {
      ADMIN_API: {
        async fetch(request) {
          forwarded = request;
          return new Response(null, { status: 302, headers: { Location: 'https://portafolio-front.pages.dev/admin/login/?access=ready' } });
        },
      },
    },
  });

  assert.equal(response.status, 302);
  assert.equal(new URL(forwarded.url).pathname, '/api/auth/access/start');
  assert.equal(new URL(forwarded.url).searchParams.get('return_to'), 'https://portafolio-front.pages.dev/admin/login/');
  assert.equal(forwarded.headers.get('cf-access-jwt-assertion'), 'signed-access-jwt');
});

test('el proxy permite contenido, textos, servicios e imágenes del panel y los mapea al Worker', async () => {
  const paths = [
    ['/admin/api/contenido', '/api/contenido', 'GET'],
    ['/admin/api/textos', '/api/textos', 'PUT'],
    ['/admin/api/servicios', '/api/servicios', 'GET'],
    ['/admin/api/servicios/nombres', '/api/servicios/nombres', 'PUT'],
    ['/admin/api/tipografia-portada', '/api/tipografia-portada', 'GET'],
    ['/admin/api/tipografia-portada', '/api/tipografia-portada', 'PUT'],
    ['/admin/api/imagenes-sitio/upload-url', '/api/imagenes-sitio/upload-url', 'POST'],
    ['/admin/api/imagenes-sitio/about.photo', '/api/imagenes-sitio/about.photo', 'PUT'],
  ];

  for (const [incomingPath, workerPath, method] of paths) {
    let forwarded;
    const response = await onRequest({
      request: new Request(`https://portafolio-front.pages.dev${incomingPath}`, { method }),
      env: {
        ADMIN_API: {
          async fetch(request) {
            forwarded = request;
            return Response.json({ ok: true });
          },
        },
      },
    });

    assert.equal(response.status, 200, incomingPath);
    assert.equal(new URL(forwarded.url).pathname, workerPath, incomingPath);
    assert.equal(forwarded.method, method, incomingPath);
  }
});

test('el proxy rechaza rutas ajenas a las APIs administrativas permitidas', async () => {
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
