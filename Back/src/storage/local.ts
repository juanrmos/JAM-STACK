import type { Env } from '../types';
import { SignJWT, jwtVerify } from 'jose';

const MAX_LOCAL_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function esWorkerLocal(request: Request, env: Env): boolean {
  const host = new URL(request.url).hostname;
  return env.LOCAL_MEDIA === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

function esMediaPreview(request: Request, env: Env): boolean {
  if (env.PREVIEW_MEDIA !== 'true' || !env.R2_PUBLIC_URL) return false;
  const urlPublica = new URL(env.R2_PUBLIC_URL);
  const urlRequest = new URL(request.url);
  return urlPublica.protocol === 'https:' &&
    urlPublica.origin === urlRequest.origin &&
    urlPublica.pathname === '/api/media';
}

function secretoLocal(env: Env): Uint8Array {
  if (!env.JWT_SECRET) throw new Error('Falta JWT_SECRET local');
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function generarUrlSubidaLocal(request: Request, env: Env, key: string, mime: string): Promise<string> {
  if (env.LOCAL_UPLOAD !== 'true' || !esWorkerLocal(request, env)) {
    throw new Error('La subida local no está habilitada');
  }
  const token = await new SignJWT({ mime })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(key)
    .setAudience('local-r2-upload')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretoLocal(env));
  const url = new URL(`/api/local-upload/${encodeURIComponent(key)}`, request.url);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function generarUrlSubidaFirmada(request: Request, env: Env, key: string, mime: string): Promise<string> {
  const token = await new SignJWT({ mime })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(key)
    .setAudience('r2-upload')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secretoLocal(env));
  const reqUrl = new URL(request.url);
  const usaProxyPages =
    (Boolean(env.FRONTEND_ORIGIN) && reqUrl.origin === env.FRONTEND_ORIGIN) ||
    reqUrl.hostname.endsWith('.pages.dev');
  const prefix = usaProxyPages ? '/admin/api' : '/api';
  const seccion = key.startsWith('logos/')
    ? 'logos'
    : key.startsWith('sitio/')
      ? 'imagenes-sitio'
      : 'obras';
  const url = new URL(`${prefix}/${seccion}/upload/${encodeURIComponent(key)}`, reqUrl.origin);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function recibirSubidaFirmada(request: Request, env: Env, encodedKey: string): Promise<Response> {
  if (env.API_PUBLIC_ONLY === 'true') {
    return new Response(null, { status: 404 });
  }
  const url = new URL(request.url);
  let key: string;
  try {
    key = decodeURIComponent(encodedKey);
  } catch {
    return new Response(null, { status: 400 });
  }
  const mime = request.headers.get('Content-Type') || '';
  const token = url.searchParams.get('token');
  if (!key || !/^(obras|logos|sitio|fixtures)\/[a-zA-Z0-9/_.-]+$/.test(key) || !token || !MIME_TYPES.has(mime)) {
    return new Response(null, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(token, secretoLocal(env), { audience: 'r2-upload' });
    if (payload.sub !== key || payload.mime !== mime) return new Response(null, { status: 403 });
  } catch {
    return new Response(null, { status: 403 });
  }

  const declaredSize = Number(request.headers.get('Content-Length'));
  if (declaredSize > MAX_LOCAL_UPLOAD_BYTES) return new Response(null, { status: 413 });
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_LOCAL_UPLOAD_BYTES) {
    return new Response(null, { status: body.byteLength ? 413 : 400 });
  }
  await env.BUCKET.put(key, body, { httpMetadata: { contentType: mime } });
  return new Response(null, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}

export async function recibirSubidaLocal(request: Request, env: Env): Promise<Response> {
  if (env.LOCAL_UPLOAD !== 'true' || !esWorkerLocal(request, env)) {
    return new Response(null, { status: 404 });
  }
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.slice('/api/local-upload/'.length));
  const mime = request.headers.get('Content-Type') || '';
  const token = url.searchParams.get('token');
  if (!key || !token || !MIME_TYPES.has(mime)) return new Response(null, { status: 400 });

  try {
    const { payload } = await jwtVerify(token, secretoLocal(env), { audience: 'local-r2-upload' });
    if (payload.sub !== key || payload.mime !== mime) return new Response(null, { status: 403 });
  } catch {
    return new Response(null, { status: 403 });
  }

  const declaredSize = Number(request.headers.get('Content-Length'));
  if (declaredSize > MAX_LOCAL_UPLOAD_BYTES) return new Response(null, { status: 413 });
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > MAX_LOCAL_UPLOAD_BYTES) {
    return new Response(null, { status: body.byteLength ? 413 : 400 });
  }
  await env.BUCKET.put(key, body, { httpMetadata: { contentType: mime } });
  return new Response(null, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}

export async function servirMedia(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (!esWorkerLocal(request, env) && !esMediaPreview(request, env)) {
    return new Response(null, { status: 404 });
  }
  const key = decodeURIComponent(url.pathname.slice('/api/media/'.length));
  const object = await env.BUCKET.get(key);
  if (!object) return new Response(null, { status: 404 });
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
