-- Esquema destino del rediseño. Inicialización local; sin migración de datos anteriores.
CREATE TABLE IF NOT EXISTS servicios (
 id TEXT PRIMARY KEY NOT NULL,
 nombre_publico TEXT NOT NULL CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 40)
);
CREATE TABLE IF NOT EXISTS textos (
 clave TEXT PRIMARY KEY NOT NULL, grupo TEXT NOT NULL,
 valor TEXT NOT NULL CHECK(length(trim(valor)) > 0), fecha_actualizacion TEXT
);
CREATE TABLE IF NOT EXISTS obras (
 id TEXT PRIMARY KEY NOT NULL, servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
 titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0), descripcion TEXT,
 imagen_key TEXT NOT NULL, video_url TEXT, ubicacion TEXT, anio INTEGER CHECK(anio BETWEEN 1000 AND 9999),
 destacado_slot INTEGER CHECK(destacado_slot BETWEEN 1 AND 5), fecha_creacion TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_obras_servicio_slot ON obras(servicio_id,destacado_slot) WHERE destacado_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_obras_fecha ON obras(servicio_id,fecha_creacion DESC,id);
CREATE TABLE IF NOT EXISTS logos (
 id TEXT PRIMARY KEY NOT NULL, nombre TEXT NOT NULL CHECK(length(trim(nombre)) > 0), imagen_key TEXT NOT NULL,
 activo INTEGER NOT NULL DEFAULT 0 CHECK(activo IN (0,1)), fecha_creacion TEXT NOT NULL, fecha_actualizacion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_logos_activo ON logos(activo) WHERE activo=1;
CREATE TABLE IF NOT EXISTS imagenes_sitio (
 clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN ('home.cover','about.photo','profile.photo','service.mural.cover','service.escultura.cover','service.cuadro.cover','service.restauracion.cover','service.logo.cover','service.fachada.cover')),
 imagen_key TEXT NOT NULL, fecha_actualizacion TEXT
);
CREATE TABLE IF NOT EXISTS configuracion_tipografia_portada (
 id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
 fuente TEXT NOT NULL DEFAULT 'cormorant-garamond'
  CHECK (fuente IN ('cormorant-garamond','fraunces','lora','playfair','dm-serif-display','young-serif','libre-baskerville')),
 escala_porcentaje INTEGER NOT NULL DEFAULT 100
  CHECK (escala_porcentaje BETWEEN 75 AND 100 AND escala_porcentaje % 5 = 0)
);
INSERT OR IGNORE INTO configuracion_tipografia_portada (id, fuente, escala_porcentaje)
VALUES (1, 'cormorant-garamond', 100);
