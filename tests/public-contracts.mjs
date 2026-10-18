import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepararVideo } from '../Front/src/features/galeria/video.ts';
import { validarApiBase } from '../Front/src/config/validateEnv.ts';

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
  const denied=await fetch('http://127.0.0.1:8787/api/obras',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(denied.status,401);
});
