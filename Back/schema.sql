-- Esquema destino del rediseño. Inicialización local; sin migración de datos anteriores.
CREATE TABLE IF NOT EXISTS servicios (
 id TEXT PRIMARY KEY NOT NULL,
 nombre_publico TEXT NOT NULL CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 40)
);
CREATE TABLE IF NOT EXISTS grupos_servicios (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='complementarios'),
 nombre_publico TEXT NOT NULL CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 60)
);
CREATE TABLE IF NOT EXISTS textos (
 clave TEXT PRIMARY KEY NOT NULL, grupo TEXT NOT NULL,
 valor TEXT NOT NULL CHECK(length(trim(valor)) > 0), fecha_actualizacion TEXT
);
CREATE TABLE IF NOT EXISTS obras (
 id TEXT PRIMARY KEY NOT NULL, servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
 titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0), descripcion TEXT,
 imagen_key TEXT NOT NULL, video_url TEXT, ubicacion TEXT, anio INTEGER CHECK(anio BETWEEN 1000 AND 9999),
 destacado_slot INTEGER NOT NULL DEFAULT 0 CHECK(destacado_slot=0), fecha_creacion TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obras_fecha ON obras(servicio_id,fecha_creacion DESC,id);
CREATE TABLE IF NOT EXISTS logos (
 id TEXT PRIMARY KEY NOT NULL, nombre TEXT NOT NULL CHECK(length(trim(nombre)) > 0), imagen_key TEXT NOT NULL,
 activo INTEGER NOT NULL DEFAULT 0 CHECK(activo IN (0,1)), fecha_creacion TEXT NOT NULL, fecha_actualizacion TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_logos_activo ON logos(activo) WHERE activo=1;
CREATE TABLE IF NOT EXISTS imagenes_sitio (
 clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN ('home.cover','profile.photo','service.mural.cover','service.escultura.cover','service.cuadro.cover','service.restauracion.cover','service.logo.cover','service.fachada.cover','service.materiales.cover','service.electricos.cover','service.drywall.cover')),
 imagen_key TEXT NOT NULL, fecha_actualizacion TEXT
);
CREATE TABLE IF NOT EXISTS fotos_sobre_nosotros (
 id TEXT PRIMARY KEY NOT NULL,
 imagen_key TEXT NOT NULL UNIQUE,
 texto_alternativo TEXT NOT NULL DEFAULT 'Fotografía de la Corporación Artística Antony Rodríguez' CHECK(length(trim(texto_alternativo)) BETWEEN 1 AND 160),
 orden INTEGER NOT NULL CHECK(orden BETWEEN -40 AND -1 OR orden BETWEEN 1 AND 20),
 fecha_creacion TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fotos_sobre_nosotros_orden ON fotos_sobre_nosotros(orden);
CREATE TABLE IF NOT EXISTS campos_cotizador (
 id TEXT PRIMARY KEY NOT NULL CHECK(id IN ('obra','detalles','metros','entorno','altura','nombre','telefono','correo')),
 etiqueta TEXT NOT NULL CHECK(length(trim(etiqueta)) BETWEEN 1 AND 60),
 tipo TEXT NOT NULL CHECK(tipo IN ('text','textarea','number','select','email','tel')),
 paso INTEGER NOT NULL CHECK(paso BETWEEN 1 AND 3),
 requerido INTEGER NOT NULL DEFAULT 0 CHECK(requerido IN (0,1)),
 habilitado INTEGER NOT NULL DEFAULT 1 CHECK(habilitado IN (0,1)),
 orden INTEGER NOT NULL CHECK(orden BETWEEN 1 AND 20),
 opciones_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(opciones_json)),
 limite INTEGER NOT NULL DEFAULT 300 CHECK(limite BETWEEN 1 AND 1000)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_campos_cotizador_orden ON campos_cotizador(paso,orden);
CREATE TABLE IF NOT EXISTS configuracion_tipografia_portada (
 id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
 fuente TEXT NOT NULL DEFAULT 'cormorant-garamond'
  CHECK (fuente IN ('cormorant-garamond','fraunces','lora','playfair','dm-serif-display','young-serif','libre-baskerville')),
 escala_porcentaje INTEGER NOT NULL DEFAULT 100
  CHECK (escala_porcentaje BETWEEN 75 AND 100 AND escala_porcentaje % 5 = 0)
);
INSERT OR IGNORE INTO configuracion_tipografia_portada (id, fuente, escala_porcentaje)
VALUES (1, 'cormorant-garamond', 100);
