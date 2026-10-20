import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const source = readFileSync(new URL('../Front/public/sw.js', import.meta.url), 'utf8');

function createWorker() {
  const listeners = new Map();
  const data = new Map();
  const networkCalls = [];
  const caches = {
    async open(name) {
      if (!data.has(name)) data.set(name, new Map());
      const entries = data.get(name);
      return {
        async match(request) {
          return entries.get(request.url);
        },
        async put(request, response) {
          entries.set(request.url, response);
        },
      };
    },
    async keys() {
      return [...data.keys()];
    },
    async delete(name) {
      return data.delete(name);
    },
  };
  const self = {
    location: { origin: 'https://site.test' },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    skipWaiting: async () => {},
  };
  const networkFetch = async (request, options) => {
    networkCalls.push({ request, options });
    return new Response(`network:${new URL(request.url).pathname}`, { status: 200 });
  };

  runInNewContext(source, { self, caches, fetch: networkFetch, URL, Promise, Response });

  return {
    data,
    networkCalls,
    async request({ path, mode = 'cors', headers = new Headers(), cache = 'default' }) {
      let responsePromise;
      listeners.get('fetch')({
        request: { url: `https://site.test${path}`, method: 'GET', mode, headers, cache },
        respondWith(promise) {
          responsePromise = promise;
        },
      });
      return responsePromise;
    },
  };
}

test('documentos consultan primero la red y guardan la versión reciente para modo offline', async () => {
  const worker = createWorker();
  await worker.data.set('paginas-v3', new Map([
    ['https://site.test/admin/contenido/', new Response('html-anterior')],
  ]));

  const response = await worker.request({ path: '/admin/contenido/', mode: 'navigate' });

  assert.equal(await response.text(), 'network:/admin/contenido/');
  assert.equal(worker.networkCalls[0].options.cache, 'no-cache');
  const cached = worker.data.get('paginas-v3').get('https://site.test/admin/contenido/');
  assert.equal(await cached.text(), 'network:/admin/contenido/');
});

test('los recursos Astro con hash se sirven desde caché', async () => {
  const worker = createWorker();
  await worker.data.set('estaticos-v3', new Map([
    ['https://site.test/_astro/app.ABCDEFGH.js', new Response('bundle-cacheado')],
  ]));

  const response = await worker.request({ path: '/_astro/app.ABCDEFGH.js', mode: 'no-cors' });

  assert.equal(await response.text(), 'bundle-cacheado');
  assert.equal(worker.networkCalls.length, 0);
});

test('API y comprobación de versión omiten Cache Storage y exigen red', async () => {
  const worker = createWorker();
  const apiResponse = await worker.request({ path: '/admin/api/servicios' });
  const versionResponse = await worker.request({
    path: '/admin/contenido/?__version_check=123',
    headers: new Headers({ 'X-PWA-Version-Check': '1' }),
    cache: 'no-store',
  });

  assert.equal(await apiResponse.text(), 'network:/admin/api/servicios');
  assert.equal(await versionResponse.text(), 'network:/admin/contenido/');
  assert.deepEqual(worker.networkCalls.map(({ options }) => options.cache), ['no-store', 'no-store']);
  assert.equal(worker.data.size, 0);
});

test('la actualización elimina las cachés de versiones anteriores', async () => {
  const worker = createWorker();
  worker.data.set('estaticos-v2', new Map());
  worker.data.set('estaticos-v3', new Map());
  worker.data.set('paginas-v3', new Map());
  worker.data.set('otra-aplicacion-cache', new Map());
  let activation;
  const listeners = new Map();
  const self = {
    location: { origin: 'https://site.test' },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    skipWaiting: async () => {},
  };
  const caches = {
    async keys() { return [...worker.data.keys()]; },
    async delete(name) { return worker.data.delete(name); },
  };
  runInNewContext(source, { self, caches, URL, Promise, Response, fetch: async () => new Response() });
  listeners.get('activate')({ waitUntil(promise) { activation = promise; } });
  await activation;

  assert.deepEqual([...worker.data.keys()].sort(), [
    'estaticos-v3',
    'otra-aplicacion-cache',
    'paginas-v3',
  ]);
});
