import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const migration = readFileSync('Back/migrations/007_catalogo-y-contenido-ampliado.sql', 'utf8');
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
  CREATE TABLE servicios(id TEXT PRIMARY KEY, nombre_publico TEXT NOT NULL);
  INSERT INTO servicios VALUES
    ('mural','Murales monumentales'),('escultura','Esculturas'),('cuadro','Galería de Cuadros'),
    ('restauracion','Restauración'),('logo','Letras y logotipos'),('fachada','Pintado de fachadas');
  CREATE TABLE textos(clave TEXT PRIMARY KEY, grupo TEXT NOT NULL, valor TEXT NOT NULL, fecha_actualizacion TEXT);
  INSERT INTO textos(clave,grupo,valor) VALUES
    ('about.eyebrow','about','Una práctica con propósito'),('about.title','about','Arte hecho con identidad.'),
    ('about.titleAccent','about','identidad.'),('about.description','about','Presentación actual.'),
    ('about.photoCaption','about','El oficio, en cada detalle'),
    ('profile.tagline','profile','Talento que trasciende fronteras.');
  CREATE TABLE imagenes_sitio(
    clave TEXT PRIMARY KEY CHECK(clave IN ('home.cover','about.photo','profile.photo','service.mural.cover','service.escultura.cover','service.cuadro.cover','service.restauracion.cover','service.logo.cover','service.fachada.cover')),
    imagen_key TEXT NOT NULL, fecha_actualizacion TEXT
  );
  INSERT INTO imagenes_sitio VALUES('home.cover','sitio/home.jpg','2026-01-01');
  INSERT INTO imagenes_sitio VALUES('about.photo','sitio/about.jpg','2026-01-02');
  CREATE TABLE obras(
    id TEXT PRIMARY KEY, servicio_id TEXT NOT NULL REFERENCES servicios(id), titulo TEXT NOT NULL,
    descripcion TEXT, imagen_key TEXT NOT NULL, video_url TEXT, ubicacion TEXT, anio INTEGER,
    destacado_slot INTEGER CHECK(destacado_slot BETWEEN 1 AND 5), fecha_creacion TEXT NOT NULL
  );
  CREATE UNIQUE INDEX uq_obras_servicio_slot ON obras(servicio_id,destacado_slot) WHERE destacado_slot IS NOT NULL;
  CREATE INDEX idx_obras_fecha ON obras(servicio_id,fecha_creacion DESC,id);
  INSERT INTO obras VALUES('obra-1','mural','Mural conservado',NULL,'obras/1.jpg',NULL,NULL,NULL,3,'2026-01-01');
  INSERT INTO obras VALUES('obra-2','mural','Mural sin slot',NULL,'obras/2.jpg',NULL,NULL,NULL,NULL,'2026-01-02');
  CREATE TABLE logos(id TEXT PRIMARY KEY,nombre TEXT NOT NULL,imagen_key TEXT NOT NULL,activo INTEGER NOT NULL,fecha_creacion TEXT NOT NULL,fecha_actualizacion TEXT);
  INSERT INTO logos VALUES('logo-1','Logo actual','logos/1.png',1,'2026-01-01',NULL);
`);

db.exec('BEGIN;');
try { db.exec(migration); db.exec('COMMIT;'); }
catch (error) { db.exec('ROLLBACK;'); throw error; }

assert.equal(db.prepare('SELECT count(*) total FROM servicios').get().total, 9);
assert.deepEqual(db.prepare('SELECT id,destacado_slot FROM obras ORDER BY id').all().map((row) => ({ ...row })), [
  { id: 'obra-1', destacado_slot: 0 }, { id: 'obra-2', destacado_slot: 0 },
]);
assert.equal(db.prepare("SELECT imagen_key FROM fotos_sobre_nosotros WHERE id='migrated-about-photo'").get().imagen_key, 'sitio/about.jpg');
assert.equal(db.prepare("SELECT count(*) total FROM imagenes_sitio WHERE clave='about.photo'").get().total, 0);
assert.equal(db.prepare("SELECT valor FROM textos WHERE clave='profile.title'").get().valor, 'Arte hecho con identidad.');
assert.equal(db.prepare("SELECT count(*) total FROM textos WHERE clave LIKE 'about.%'").get().total, 5);
assert.equal(db.prepare('SELECT count(*) total FROM campos_cotizador').get().total, 8);
assert.equal(db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='uq_obras_servicio_slot'").get(), undefined);
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
assert.throws(() => db.prepare(`INSERT INTO obras(id,servicio_id,titulo,imagen_key,destacado_slot,fecha_creacion) VALUES('bad','mural','x','x',1,'now')`).run());
db.close();
console.log('PASS: migration 007 preserves works and site images, moves the old About photo, renames profile text keys, adds the new catalog and quote fields, and disables featured slots.');
