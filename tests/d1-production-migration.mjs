import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const migration = readFileSync('Back/migrations-production/0001_redisenar_modelo.sql', 'utf8');
const preflight = readFileSync('Back/migration-support/production-preflight.sql', 'utf8');
const catalog = JSON.parse(readFileSync('Shared/contracts/textos.json', 'utf8'));

function legacyDatabase({ unknownCategory = false, highlighted = false, multipleActiveLogos = false } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE obras (
      id TEXT PRIMARY KEY, titulo TEXT NOT NULL, descripcion TEXT, categoria TEXT,
      imagen_key TEXT NOT NULL, video_url TEXT, orden INTEGER NOT NULL DEFAULT 0,
      destacado INTEGER NOT NULL DEFAULT 0, fecha_creacion TEXT NOT NULL
    );
    CREATE TABLE logos (
      id TEXT PRIMARY KEY, nombre TEXT NOT NULL, imagen_key TEXT NOT NULL,
      activo INTEGER NOT NULL DEFAULT 0, fecha_creacion TEXT NOT NULL,
      fecha_actualizacion TEXT
    );
  `);

  const insertWork = db.prepare(`
    INSERT INTO obras(id,titulo,descripcion,categoria,imagen_key,video_url,orden,destacado,fecha_creacion)
    VALUES(?,?,?,?,?,?,?,?,?)
  `);
  for (let index = 1; index <= 7; index += 1) {
    insertWork.run(`m-${index}`, `Mural ${index}`, null, 'mural', `obras/m-${index}.jpg`, null,
      index <= 5 ? index : 0, highlighted && index === 7 ? 1 : 0, `2026-01-0${index}T00:00:00Z`);
  }
  for (const service of ['escultura', 'cuadro', 'restauracion', 'logo', 'fachada']) {
    insertWork.run(`${service}-1`, `${service} uno`, 'Descripción', service,
      `obras/${service}-1.jpg`, 'https://youtu.be/example', 0, 0, '2026-02-01T00:00:00Z');
  }
  if (unknownCategory) {
    insertWork.run('unknown-1', 'Sin categoría', null, 'otra', 'obras/unknown.jpg', null, 0, 0,
      '2026-03-01T00:00:00Z');
  }

  db.prepare('INSERT INTO logos VALUES(?,?,?,?,?,?)')
    .run('logo-1', 'Marca activa', 'logos/one.png', 1, '2026-01-01T00:00:00Z', null);
  db.prepare('INSERT INTO logos VALUES(?,?,?,?,?,?)')
    .run('logo-2', 'Marca anterior', 'logos/two.png', multipleActiveLogos ? 1 : 0, '2025-01-01T00:00:00Z', null);
  return db;
}

function apply(db) {
  db.exec('BEGIN;');
  try {
    db.exec(migration);
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

const db = legacyDatabase();
assert.doesNotThrow(() => db.exec(preflight), 'el preflight de solo lectura debe compilar contra el esquema legacy');
const originalWorkCount = db.prepare('SELECT count(*) AS total FROM obras').get().total;
const originalLogoCount = db.prepare('SELECT count(*) AS total FROM logos').get().total;
apply(db);

assert.equal(db.prepare('SELECT count(*) AS total FROM obras').get().total, originalWorkCount);
assert.equal(db.prepare('SELECT count(*) AS total FROM logos').get().total, originalLogoCount);
assert.equal(db.prepare('SELECT count(*) AS total FROM servicios').get().total, 6);
assert.equal(db.prepare('SELECT count(*) AS total FROM textos').get().total, Object.keys(catalog).length);
assert.equal(db.prepare('SELECT count(*) AS total FROM imagenes_sitio').get().total, 0);
assert.equal(db.prepare("SELECT count(*) AS total FROM obras WHERE servicio_id='mural' AND destacado_slot IS NOT NULL").get().total, 5);
assert.equal(db.prepare("SELECT count(*) AS total FROM obras WHERE servicio_id='mural' AND destacado_slot IS NULL").get().total, 2);
assert.equal(db.prepare("SELECT destacado_slot FROM obras WHERE id='m-1'").get().destacado_slot, 1);
assert.equal(db.prepare("SELECT video_url FROM obras WHERE id='escultura-1'").get().video_url, 'https://youtu.be/example');
assert.equal(db.prepare("SELECT imagen_key FROM obras WHERE id='m-1'").get().imagen_key, 'obras/m-1.jpg');
assert.equal(db.prepare('SELECT count(*) AS total FROM logos WHERE activo=1').get().total, 1);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
assert.ok(db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='uq_obras_servicio_slot'").get());
assert.ok(db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='uq_logos_activo'").get());
db.close();

for (const badSource of [
  { unknownCategory: true },
  { highlighted: true },
  { multipleActiveLogos: true },
]) {
  const invalid = legacyDatabase(badSource);
  assert.throws(() => apply(invalid));
  assert.equal(invalid.prepare("SELECT count(*) AS total FROM sqlite_master WHERE type='table' AND name='servicios'").get().total, 0,
    'la transacción fallida debe revertir los objetos del nuevo esquema');
  assert.equal(invalid.prepare('SELECT count(*) AS total FROM obras').get().total > 0, true,
    'la tabla original debe conservarse tras abortar');
  invalid.close();
}

console.log(`PASS: ${originalWorkCount} obras y ${originalLogoCount} logos preservados; categorías, slots, videos, claves R2, índices y FK correctos; las tres guardas revierten la migración.`);

const exportPath = process.argv[2];
if (exportPath) {
  const exported = new DatabaseSync(':memory:');
  exported.exec(readFileSync(exportPath, 'utf8'));
  exported.exec(preflight);
  const sourceWorks = exported.prepare(`
    SELECT id, titulo, descripcion, categoria, imagen_key, video_url, fecha_creacion
    FROM obras ORDER BY id
  `).all();
  const sourceLogos = exported.prepare(`
    SELECT id, nombre, imagen_key, activo, fecha_creacion, fecha_actualizacion
    FROM logos ORDER BY id
  `).all();
  const sourceById = new Map(sourceWorks.map((row) => [row.id, row]));

  apply(exported);

  assert.equal(exported.prepare('SELECT count(*) AS total FROM obras').get().total, sourceWorks.length);
  assert.equal(exported.prepare('SELECT count(*) AS total FROM logos').get().total, sourceLogos.length);
  for (const old of sourceWorks) {
    const current = exported.prepare(`
      SELECT id, titulo, descripcion, servicio_id, imagen_key, video_url, fecha_creacion
      FROM obras WHERE id=?
    `).get(old.id);
    assert.deepEqual({ ...current }, {
      id: old.id,
      titulo: old.titulo,
      descripcion: old.descripcion,
      servicio_id: old.categoria,
      imagen_key: old.imagen_key,
      video_url: old.video_url,
      fecha_creacion: old.fecha_creacion,
    });
  }
  for (const old of sourceLogos) {
    assert.deepEqual({ ...exported.prepare(`
      SELECT id, nombre, imagen_key, activo, fecha_creacion, fecha_actualizacion
      FROM logos WHERE id=?
    `).get(old.id) }, { ...old });
  }
  assert.equal(exported.prepare('PRAGMA foreign_key_check').all().length, 0);
  console.log(`PASS: export real validado en memoria: ${sourceById.size} obras y ${sourceLogos.length} logos preservados; sin anomalías de migración.`);
  exported.close();
}
