import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificarAccessJwt } from '../Back/src/middleware/verificarAccess.ts';

test('Access solo permite bypass con Wrangler en loopback', async () => {
  assert.equal(await verificarAccessJwt(new Request('http://127.0.0.1:8787/api/auth/login'), {
    LOCAL_MEDIA:'true',
  }), true);
  assert.equal(await verificarAccessJwt(new Request('https://api.example.com/api/auth/login'), {
    LOCAL_MEDIA:'true',
  }), false);
  assert.equal(await verificarAccessJwt(new Request('https://api.example.com/api/auth/login'), {}), false);
  assert.equal(await verificarAccessJwt(new Request('https://api.example.com/api/auth/login'), {
    CF_ACCESS_TEAM:'equipo',
  }), false);
  assert.equal(await verificarAccessJwt(new Request('https://api.example.com/api/auth/login'), {
    CF_ACCESS_TEAM:'equipo',CF_ACCESS_AUD:'audiencia',
  }), false);
});

test('CORS local admite loopback con credenciales y rechaza otros orígenes', async () => {
  const local = await fetch('http://127.0.0.1:8787/api/auth/login', {
    method:'OPTIONS',headers:{Origin:'http://127.0.0.1:4331'},
  });
  assert.equal(local.status,204);
  assert.equal(local.headers.get('access-control-allow-origin'),'http://127.0.0.1:4331');
  assert.equal(local.headers.get('access-control-allow-credentials'),'true');
  const external = await fetch('http://127.0.0.1:8787/api/auth/login', {
    method:'OPTIONS',headers:{Origin:'https://evil.example'},
  });
  assert.equal(external.status,204);
  assert.equal(external.headers.get('access-control-allow-origin'),null);
});
