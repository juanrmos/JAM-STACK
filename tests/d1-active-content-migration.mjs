import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sql = (path) => readFileSync(path, 'utf8');
const serviceNamesMigration = sql('Back/migrations-production/0004_nombre_publico_servicios.sql');
const adoption = sql('Back/migration-support/adopt-0004-nombre-servicios.sql');
const preflight = sql('Back/migration-support/current-model-preflight.sql');
const contentMigration = sql('Back/migrations-production/0005_catalogo_contenido_ampliado.sql');
const quoteMigration = sql('Back/migrations-production/0006_textos_cotizador.sql');

function makeFixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec(`
    CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO d1_migrations(name) VALUES
      ('0001_redisenar_modelo.sql'),('0002_tipografia_titulo_portada.sql'),('0003_agregar_home_cover.sql');
    CREATE TABLE servicios(id TEXT PRIMARY KEY NOT NULL, nombre_publico TEXT NOT NULL CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 40));
    INSERT INTO servicios VALUES
      ('mural','Murales monumentales'),('escultura','Esculturas'),('cuadro','Galería de Cuadros'),
      ('restauracion','Restauración'),('logo','Letras y logotipos'),('fachada','Pintado de fachadas');
    CREATE TABLE textos(clave TEXT PRIMARY KEY,grupo TEXT NOT NULL,valor TEXT NOT NULL,fecha_actualizacion TEXT);
    INSERT INTO textos(clave,grupo,valor) VALUES
      ('about.eyebrow','about','Presentación personalizada'),('about.title','about','Arte hecho con identidad.'),
      ('about.titleAccent','about','identidad'),('about.description','about','Texto de perfil conservado.'),
      ('about.photoCaption','about','El oficio, en cada detalle'),
      ('profile.tagline','profile','Talento que trasciende fronteras.'),
      ('profile.specialties','profile','Murales · Escultura · Realismo');
    CREATE TABLE imagenes_sitio(clave TEXT PRIMARY KEY CHECK(clave IN ('home.cover','about.photo','profile.photo','service.mural.cover','service.escultura.cover','service.cuadro.cover','service.restauracion.cover','service.logo.cover','service.fachada.cover')),imagen_key TEXT NOT NULL,fecha_actualizacion TEXT);
    INSERT INTO imagenes_sitio VALUES('home.cover','sitio/home.jpg','2026-10-20');
    INSERT INTO imagenes_sitio VALUES('about.photo','sitio/about.jpg','2026-10-20');
    CREATE TABLE obras(id TEXT PRIMARY KEY,servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,titulo TEXT NOT NULL,descripcion TEXT,imagen_key TEXT NOT NULL,video_url TEXT,ubicacion TEXT,anio INTEGER,destacado_slot INTEGER CHECK(destacado_slot BETWEEN 1 AND 5),fecha_creacion TEXT NOT NULL);
    CREATE UNIQUE INDEX uq_obras_servicio_slot ON obras(servicio_id,destacado_slot) WHERE destacado_slot IS NOT NULL;
    CREATE INDEX idx_obras_fecha ON obras(servicio_id,fecha_creacion DESC,id);
    INSERT INTO obras VALUES('mural-1','mural','Mural uno',NULL,'obras/1.jpg','https://youtu.be/uno',NULL,NULL,1,'2026-10-01');
    INSERT INTO obras VALUES('escultura-1','escultura','Escultura uno','Detalle','obras/2.jpg',NULL,NULL,NULL,NULL,'2026-10-02');
    CREATE TABLE logos(id TEXT PRIMARY KEY,nombre TEXT NOT NULL,imagen_key TEXT NOT NULL,activo INTEGER NOT NULL,fecha_creacion TEXT NOT NULL,fecha_actualizacion TEXT);
    INSERT INTO logos VALUES('logo-1','Logo actual','logos/1.png',1,'2026-10-01',NULL);
  `);
  return db;
}

function apply(db, migration) {
  db.exec('BEGIN;');
  try { db.exec(migration); db.exec('COMMIT;'); }
  catch (error) { db.exec('ROLLBACK;'); throw error; }
}

function rows(db, statement) {
  return db.prepare(statement).all().map((row) => ({ ...row }));
}

// The numbered chain must also create the display-name column on a clean rebuild.
const clean = new DatabaseSync(':memory:');
clean.exec("CREATE TABLE servicios(id TEXT PRIMARY KEY NOT NULL); INSERT INTO servicios(id) VALUES ('mural'),('escultura'),('cuadro'),('restauracion'),('logo'),('fachada');");
apply(clean, serviceNamesMigration);
assert.equal(clean.prepare('SELECT count(*) AS n FROM servicios WHERE length(trim(nombre_publico))>0').get().n, 6);
assert.equal(clean.prepare("SELECT nombre_publico FROM servicios WHERE id='mural'").get().nombre_publico, 'Murales monumentales');
clean.close();

const exportPath = process.argv[2];
const candidateExportPath = process.argv[3];
const db = exportPath ? new DatabaseSync(':memory:') : makeFixture();
if (exportPath) db.exec(sql(exportPath));
db.exec('PRAGMA foreign_keys=ON;');
const table = (name) => db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?").get(name).n > 0;
if (!table('d1_migrations')) db.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT UNIQUE,applied_at TEXT DEFAULT CURRENT_TIMESTAMP);');
const serviceColumns = rows(db, "PRAGMA table_info('servicios')");
assert.ok(serviceColumns.some((column) => column.name === 'nombre_publico'), 'la D1 activa ya debe contener nombre_publico');
assert.doesNotThrow(() => db.exec(preflight), 'el preflight debe compilar contra la D1 rediseñada activa');

const originalWorks = rows(db, 'SELECT id,servicio_id,titulo,descripcion,imagen_key,video_url,ubicacion,anio,fecha_creacion FROM obras ORDER BY id');
const originalLogos = rows(db, 'SELECT id,nombre,imagen_key,activo,fecha_creacion,fecha_actualizacion FROM logos ORDER BY id');
const originalServices = rows(db, 'SELECT id,nombre_publico FROM servicios ORDER BY id');
const originalAboutTexts = rows(db, "SELECT clave,valor FROM textos WHERE clave IN ('about.eyebrow','about.title','about.titleAccent','about.description') ORDER BY clave");
const originalImages = rows(db, "SELECT clave,imagen_key,fecha_actualizacion FROM imagenes_sitio WHERE clave<>'about.photo' ORDER BY clave");
const originalAboutPhoto = db.prepare("SELECT imagen_key FROM imagenes_sitio WHERE clave='about.photo'").get()?.imagen_key;
const originalVideoCount = db.prepare("SELECT count(*) AS n FROM obras WHERE video_url IS NOT NULL AND trim(video_url)<>''").get().n;

// In the live D1 the field exists already but is absent from d1_migrations.
// Adopt it only on the isolated candidate after the schema/data preflight.
db.exec(adoption);
assert.ok(db.prepare("SELECT 1 FROM d1_migrations WHERE name='0004_nombre_publico_servicios.sql'").get(), 'la adopción debe reconocer la columna existente');
apply(db, contentMigration);
db.prepare('INSERT INTO d1_migrations(name) VALUES (?)').run('0005_catalogo_contenido_ampliado.sql');
apply(db, quoteMigration);
db.prepare('INSERT INTO d1_migrations(name) VALUES (?)').run('0006_textos_cotizador.sql');

assert.deepEqual(rows(db, 'SELECT id,servicio_id,titulo,descripcion,imagen_key,video_url,ubicacion,anio,fecha_creacion FROM obras ORDER BY id'), originalWorks);
assert.deepEqual(rows(db, 'SELECT id,nombre,imagen_key,activo,fecha_creacion,fecha_actualizacion FROM logos ORDER BY id'), originalLogos);
assert.deepEqual(rows(db, 'SELECT id,nombre_publico FROM servicios WHERE id IN (\'mural\',\'escultura\',\'cuadro\',\'restauracion\',\'logo\',\'fachada\') ORDER BY id'), originalServices);
for (const { clave, valor } of originalAboutTexts) {
  const next = clave.replace('about.', 'profile.');
  assert.equal(db.prepare('SELECT valor FROM textos WHERE clave=?').get(next)?.valor, valor, `se conserva ${clave}`);
}
assert.deepEqual(rows(db, 'SELECT clave,imagen_key,fecha_actualizacion FROM imagenes_sitio ORDER BY clave'), originalImages);
assert.equal(db.prepare('SELECT count(*) AS n FROM obras').get().n, originalWorks.length);
assert.equal(db.prepare('SELECT count(*) AS n FROM logos').get().n, originalLogos.length);
assert.equal(db.prepare('SELECT count(*) AS n FROM obras WHERE destacado_slot<>0').get().n, 0);
assert.equal(db.prepare("SELECT count(*) AS n FROM obras WHERE video_url IS NOT NULL AND trim(video_url)<>''").get().n, originalVideoCount);
assert.equal(db.prepare('SELECT count(*) AS n FROM servicios').get().n, 9);
assert.equal(db.prepare("SELECT nombre_publico FROM servicios WHERE id='materiales'").get().nombre_publico, 'Venta de Materiales e Insumos');
assert.equal(db.prepare("SELECT nombre_publico FROM grupos_servicios WHERE id='complementarios'").get().nombre_publico, 'Servicios Complementarios');
assert.equal(db.prepare('SELECT count(*) AS n FROM campos_cotizador').get().n, 8);
assert.ok(db.prepare("SELECT 1 FROM textos WHERE clave='quote.contactDescription'").get());
assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='uq_fotos_sobre_nosotros_orden'").get());
assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0);
assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
if (originalAboutPhoto) {
  assert.equal(db.prepare('SELECT imagen_key FROM fotos_sobre_nosotros WHERE id=?').get('migrated-about-photo').imagen_key, originalAboutPhoto);
}
assert.equal(db.prepare("SELECT count(*) AS n FROM imagenes_sitio WHERE clave='about.photo'").get().n, 0);
assert.ok(db.prepare("SELECT 1 FROM d1_migrations WHERE name='0006_textos_cotizador.sql'").get());

if (candidateExportPath) {
  const candidate = new DatabaseSync(':memory:');
  candidate.exec(sql(candidateExportPath));
  const businessTables = [
    ['servicios', 'id'], ['textos', 'clave'], ['obras', 'id'], ['logos', 'id'],
    ['imagenes_sitio', 'clave'], ['fotos_sobre_nosotros', 'id'],
    ['grupos_servicios', 'id'], ['campos_cotizador', 'id'],
    ['configuracion_tipografia_portada', 'id'],
  ];
  for (const [name, primaryKey] of businessTables) {
    assert.ok(table.call(null, name), `el origen exportado contiene ${name}`);
    assert.equal(candidate.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name=?").get(name).n > 0, true, `la candidata contiene ${name}`);
    const expectedRows = rows(db, `SELECT * FROM ${name} ORDER BY ${primaryKey}`);
    const candidateRows = rows(candidate, `SELECT * FROM ${name} ORDER BY ${primaryKey}`);
    assert.deepEqual(candidateRows, expectedRows, `las filas de ${name} coinciden con la migración ensayada`);
  }
  assert.equal(candidate.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.equal(candidate.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  candidate.close();
}

console.log(`PASS: ${exportPath ? 'export real de D1' : 'fixture equivalente'} migrado; ${originalWorks.length} obras, ${originalLogos.length} logos y ${originalVideoCount} videos preservados; claves, fotos, FK e índices validados.`);
if (candidateExportPath) console.log('PASS: las tablas de negocio de la D1 candidata coinciden fila por fila con el resultado ensayado.');
db.close();
