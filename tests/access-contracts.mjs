import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verificarAccessJwt } from '../Back/src/middleware/verificarAccess.ts';
import { corsHeaders } from '../Back/src/http/cors.ts';
import { exportJWK, generateKeyPair, SignJWT } from '../Back/node_modules/jose/dist/webapi/index.js';

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

test('Access acepta un JWT firmado solo si coinciden emisor y audiencia', async () => {
  const previousFetch = globalThis.fetch;
  const team = `test-${crypto.randomUUID()}`;
  const issuer = `https://${team}.cloudflareaccess.com`;
  const audience = 'audiencia-api-prueba';
  const kid = 'clave-prueba-access';
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid, alg: 'RS256', use: 'sig' };
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.origin === `${issuer}` && url.pathname === '/cdn-cgi/access/certs') {
      return Response.json({ keys: [jwk] }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }
    return previousFetch(input, init);
  };

  const token = (aud, tokenIssuer = issuer) => new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(tokenIssuer)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
  const env = { CF_ACCESS_TEAM: team, CF_ACCESS_AUD: audience };
  const requestWith = async (value) => verificarAccessJwt(new Request('https://api.example.com/api/admin', {
    headers: { 'Cf-Access-Jwt-Assertion': value },
  }), env);

  try {
    assert.equal(await requestWith(await token(audience)), true);
    assert.equal(await requestWith(await token('otra-audiencia')), false);
    assert.equal(await requestWith(await token(audience, 'https://otro-equipo.cloudflareaccess.com')), false);
    assert.equal(await verificarAccessJwt(new Request('https://api.example.com/api/admin'), env), false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('CORS local admite loopback con credenciales y rechaza otros orígenes', async () => {
  const env = { LOCAL_MEDIA: 'true' };
  const local = corsHeaders(new Request('http://127.0.0.1:8787/api/auth/login', {
    headers: { Origin: 'http://127.0.0.1:4331' },
  }), env);
  assert.equal(local['Access-Control-Allow-Origin'], 'http://127.0.0.1:4331');
  assert.equal(local['Access-Control-Allow-Credentials'], 'true');
  const external = corsHeaders(new Request('http://127.0.0.1:8787/api/auth/login', {
    headers: { Origin: 'https://evil.example' },
  }), env);
  assert.equal(external['Access-Control-Allow-Origin'], undefined);
});

test('API administrativa admite el dominio canónico y despliegues del proyecto Pages', async () => {
  const env = {
    FRONTEND_ORIGIN: 'https://portafolio-front.pages.dev',
    ALLOW_PAGES_PREVIEW_ORIGINS: 'true',
  };
  for (const origin of [
    'https://portafolio-front.pages.dev',
    'https://a0198267.portafolio-front.pages.dev',
  ]) {
    const headers = corsHeaders(new Request(
      'https://portafolio-api-admin.skyheart.workers.dev/api/auth/login',
      { headers: { Origin: origin } },
    ), env);
    assert.equal(headers['Access-Control-Allow-Origin'], origin);
    assert.equal(headers['Access-Control-Allow-Credentials'], 'true');
  }

  const untrusted = corsHeaders(new Request(
    'https://portafolio-api-admin.skyheart.workers.dev/api/auth/login',
    { headers: { Origin: 'https://evil.example' } },
  ), env);
  assert.equal(untrusted['Access-Control-Allow-Origin'], undefined);
});
