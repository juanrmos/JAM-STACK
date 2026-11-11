import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../Front/functions/admin/api/[[path]].ts';
import { generarUrlSubidaFirmada, recibirSubidaFirmada } from '../Back/src/storage/local.ts';

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
    ['/admin/api/imagenes-sitio/upload/sitio%2Ftest.webp', '/api/imagenes-sitio/upload/sitio%2Ftest.webp', 'PUT'],
    ['/admin/api/obras/upload/obras%2Ftest.webp', '/api/obras/upload/obras%2Ftest.webp', 'PUT'],
    ['/admin/api/logos/upload/logos%2Ftest.webp', '/api/logos/upload/logos%2Ftest.webp', 'PUT'],
    ['/admin/api/imagenes-sitio/about.photo', '/api/imagenes-sitio/about.photo', 'PUT'],
    ['/admin/api/about/photos', '/api/about/photos', 'GET'],
    ['/admin/api/about/photos', '/api/about/photos', 'POST'],
    ['/admin/api/about/photos/order', '/api/about/photos/order', 'PUT'],
    ['/admin/api/about/photos/123e4567-e89b-12d3-a456-426614174000', '/api/about/photos/123e4567-e89b-12d3-a456-426614174000', 'DELETE'],
    ['/admin/api/cotizador/campos', '/api/cotizador/campos', 'GET'],
    ['/admin/api/cotizador/campos', '/api/cotizador/campos', 'PUT'],
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

test('la subida firmada permanente usa JWT_SECRET y el binding nativo BUCKET a través del proxy de Pages', async () => {
  const stored = new Map();
  const workerEnv = {
    JWT_SECRET: 'secreto-permanente-de-prueba-con-mas-de-32-bytes',
    FRONTEND_ORIGIN: 'https://portafolio-front.pages.dev',
    BUCKET: {
      async put(key, body, options) {
        stored.set(key, { bytes: body.byteLength, contentType: options?.httpMetadata?.contentType });
      },
    },
  };

  const key = 'sitio/123e4567-e89b-12d3-a456-426614174000.webp';
  const uploadUrl = await generarUrlSubidaFirmada(
    new Request('https://portafolio-front.pages.dev/api/imagenes-sitio/upload-url', { method: 'POST' }),
    workerEnv,
    key,
    'image/webp',
  );

  const parsedUrl = new URL(uploadUrl);
  assert.equal(parsedUrl.origin, 'https://portafolio-front.pages.dev');
  assert.equal(parsedUrl.pathname, `/admin/api/imagenes-sitio/upload/${encodeURIComponent(key)}`);
  assert.ok(parsedUrl.searchParams.get('token'));

  const response = await onRequest({
    request: new Request(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: new Uint8Array([82, 73, 70, 70]),
    }),
    env: {
      ADMIN_API: {
        async fetch(forwardedReq) {
          const match = new URL(forwardedReq.url).pathname.match(/^\/api\/(?:obras|logos|imagenes-sitio)\/upload\/(.+)$/);
          assert.ok(match);
          return recibirSubidaFirmada(forwardedReq, workerEnv, match[1]);
        },
      },
    },
  });

  assert.equal(response.status, 201);
  assert.deepEqual(stored.get(key), { bytes: 4, contentType: 'image/webp' });
});
