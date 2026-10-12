import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { prepararVideoPermitido } from '../Shared/contracts/video.ts';

test('la política común acepta enlaces reproducibles y rechaza hosts simulados', () => {
  for (const value of [
    'https://youtu.be/abcdefghijk',
    'https://www.youtube.com/watch?v=abcdefghijk',
    'https://www.youtube.com/embed/abcdefghijk',
    'https://www.youtube.com/shorts/abcdefghijk',
    'https://www.tiktok.com/@artista/video/123456789',
  ]) assert.ok(prepararVideoPermitido(value), value);
  for (const value of [
    'https://example.org/youtube.com',
    'https://youtube.com.evil.example/watch?v=abcdefghijk',
    'https://www.youtube.com/watch?v=corto',
    'https://www.tiktok.com/',
    'http://youtu.be/abcdefghijk',
    'https://user:pass@youtu.be/abcdefghijk',
  ]) assert.equal(prepararVideoPermitido(value), null, value);
});

test('la migración reindexa datos mixtos sin duplicar slots y es idempotente', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE obras (id TEXT PRIMARY KEY, categoria TEXT, orden INTEGER, fecha_creacion TEXT)');
  const insert = db.prepare('INSERT INTO obras VALUES (?, ?, ?, ?)');
  for (const row of [
    ['mural-1','mural',1,'2025-01-01'],
    ['mural-3','mural',3,'2025-01-02'],
    ['mural-new','mural',0,'2026-01-03'],
    ['mural-old','mural',0,'2026-01-02'],
    ['cuadro-1','cuadro',1,'2025-01-01'],
    ['cuadro-new','cuadro',0,'2026-01-03'],
  ]) insert.run(...row);
  const migration = readFileSync('Back/migrations/001_asignar_orden_inicial.sql', 'utf8');
  db.exec(migration);
  const read = () => db.prepare('SELECT id, categoria, orden FROM obras ORDER BY categoria, orden').all();
  const after = read();
  assert.deepEqual(after.filter(row => row.categoria === 'mural').map(row => row.id),
    ['mural-1','mural-3','mural-new','mural-old']);
  assert.deepEqual(after.filter(row => row.categoria === 'mural').map(row => row.orden), [1,2,3,4]);
  assert.deepEqual(after.filter(row => row.categoria === 'cuadro').map(row => row.orden), [1,2]);
  db.exec(migration);
  assert.deepEqual(read(), after);
  db.close();
});
