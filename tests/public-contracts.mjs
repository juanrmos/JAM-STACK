import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepararVideo } from '../Front/src/features/galeria/video.ts';
import { validarApiBase } from '../Front/src/config/validateEnv.ts';
import { actualizarFavicon } from '../Front/src/features/brand/favicon.ts';

test('configuration separates development and production', () => {
  assert.equal(validarApiBase('http://127.0.0.1:8787/','development'),'http://127.0.0.1:8787');
  assert.equal(validarApiBase('https://api.example.com/','production'),'https://api.example.com');
  for (const value of [undefined,'','javascript:alert(1)','https://user:pass@example.com','https://example.com?a=1']) assert.throws(()=>validarApiBase(value,'production'));
  assert.throws(()=>validarApiBase('https://api.example.com','development'));
  assert.throws(()=>validarApiBase('http://127.0.0.1:8787','production'));
});
test('only supported video hosts can create a player', () => {
  for (const value of ['https://youtu.be/abcdefghijk','https://www.youtube.com/watch?v=abcdefghijk','https://www.youtube.com/embed/abcdefghijk','https://www.youtube.com/shorts/abcdefghijk']) assert.equal(prepararVideo(value)?.url,'https://www.youtube.com/embed/abcdefghijk?autoplay=1');
  for (const value of ['javascript:alert(1)','https://youtube.com.evil.example/watch?v=abcdefghijk','https://evil.example/?youtube.com','https://youtu.be/invalid','https://www.youtube.com/watch?v=','not a url']) assert.equal(prepararVideo(value),null);
  assert.equal(prepararVideo('https://www.tiktok.com/@example/video/123')?.tipo,'tiktok');
});
test('active logo updates browser-tab icons and rejects unsafe URLs', () => {
  const svg={href:'/favicon.svg',type:'image/svg+xml',removeAttribute(name){if(name==='type')this.type='';}};
  const ico={href:'/favicon.ico',type:'',removeAttribute(name){if(name==='type')this.type='';}};
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  globalThis.window={location:{href:'https://site.example/'}};
  globalThis.document={querySelectorAll(selector){assert.equal(selector,'link[rel~="icon"]');return [svg,ico];}};
  try {
    actualizarFavicon('https://images.example/logos/active.webp');
    assert.equal(svg.href,'https://images.example/logos/active.webp');
    assert.equal(svg.type,'image/webp');
    assert.equal(ico.href,'https://images.example/logos/active.webp');
    assert.equal(ico.type,'image/webp');
    actualizarFavicon('javascript:alert(1)');
    assert.equal(svg.href,'https://images.example/logos/active.webp');
    assert.equal(ico.href,'https://images.example/logos/active.webp');
  } finally {
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});
test('real local Worker returns read contracts and local R2 bytes', async () => {
  for (const servicio of ['mural','escultura','cuadro','restauracion','logo','fachada']) {
    const response=await fetch(`http://127.0.0.1:8787/api/obras?servicio_id=${servicio}&limit=5&offset=0`);
    assert.equal(response.status,200);
    const page=await response.json();
    assert.ok(page.total>=page.obras.length);
    assert.ok(page.obras.length<=5);
    assert.equal(page.hasMore,page.total>page.obras.length);
    assert.ok(page.obras.every(obra=>obra.servicio_id===servicio));
    if (page.obras.length) {
      assert.match(page.obras[0].imagenUrl,/^http:\/\/127\.0\.0\.1:8787\/api\/media\//);
      const image=await fetch(page.obras[0].imagenUrl);
      assert.equal(image.status,200); assert.match(image.headers.get('content-type'),/^image\/jpeg/);
      assert.ok((await image.arrayBuffer()).byteLength>0);
    }
  }
  const legacyFilter=await fetch('http://127.0.0.1:8787/api/obras?categoria=mural');
  assert.equal(legacyFilter.status,400);
  const logos=await (await fetch('http://127.0.0.1:8787/api/logos?activo=1')).json();
  assert.ok(Array.isArray(logos.logos));
  assert.ok(logos.logos.filter(logo=>logo.activo).length<=1);
  const typographyResponse=await fetch('http://127.0.0.1:8787/api/tipografia-portada');
  assert.equal(typographyResponse.status,200);
  const typography=(await typographyResponse.json()).tipografia;
  assert.ok(['cormorant-garamond','fraunces','lora','playfair','dm-serif-display','young-serif','libre-baskerville'].includes(typography.fuente));
  assert.ok([75,80,85,90,95,100].includes(typography.escala_porcentaje));
  const denied=await fetch('http://127.0.0.1:8787/api/obras',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(denied.status,401);
  const deniedTypography=await fetch('http://127.0.0.1:8787/api/tipografia-portada',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipografia:{fuente:'fraunces',escala_porcentaje:90}})});
  assert.equal(deniedTypography.status,401);
});

test('local admin can update typography and invalid values are rejected', async (context) => {
  const varsPath=resolve('Back/.dev.vars');
  if (!existsSync(varsPath)) return context.skip('Configura Back/.dev.vars para probar escrituras administrativas locales.');
  const secret=readFileSync(varsPath,'utf8').match(/^ADMIN_SECRET=(.+)$/m)?.[1];
  if (!secret) return context.skip('Back/.dev.vars no contiene ADMIN_SECRET.');

  const original=await fetch('http://127.0.0.1:8787/api/tipografia-portada').then(response=>response.json());
  const login=await fetch('http://127.0.0.1:8787/api/auth/login',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secreto:secret}),
  });
  assert.equal(login.status,200);
  const {token}=await login.json();
  assert.ok(token);
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${token}`};

  try {
    const saved=await fetch('http://127.0.0.1:8787/api/tipografia-portada',{
      method:'PUT',headers,body:JSON.stringify({tipografia:{fuente:'fraunces',escala_porcentaje:90}}),
    });
    assert.equal(saved.status,200);
    assert.deepEqual((await fetch('http://127.0.0.1:8787/api/tipografia-portada').then(response=>response.json())).tipografia,{fuente:'fraunces',escala_porcentaje:90});

    const invalid=await fetch('http://127.0.0.1:8787/api/tipografia-portada',{
      method:'PUT',headers,body:JSON.stringify({tipografia:{fuente:'comic-sans',escala_porcentaje:200}}),
    });
    assert.equal(invalid.status,400);
  } finally {
    const restored=await fetch('http://127.0.0.1:8787/api/tipografia-portada',{
      method:'PUT',headers,body:JSON.stringify({tipografia:original.tipografia}),
    });
    assert.equal(restored.status,200,'la prueba restaura la preferencia local original');
  }
});
