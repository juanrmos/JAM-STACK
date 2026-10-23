-- Preparación para producción; no ejecutar durante las pruebas locales.
-- Conserva las obras existentes y sus metadatos, pero desactiva los slots antiguos.
INSERT OR IGNORE INTO servicios(id,nombre_publico) VALUES
 ('materiales','Venta de Materiales e Insumos'),
 ('electricos','Servicios eléctricos'),
 ('drywall','Sistemas de drywall / carpintería');

CREATE TABLE IF NOT EXISTS grupos_servicios (
 id TEXT PRIMARY KEY NOT NULL CHECK(id='complementarios'),
 nombre_publico TEXT NOT NULL CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 60)
);
INSERT OR IGNORE INTO grupos_servicios(id,nombre_publico) VALUES('complementarios','Servicios Complementarios');

CREATE TABLE obras_nueva (
 id TEXT PRIMARY KEY NOT NULL,
 servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
 titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0),
 descripcion TEXT,
 imagen_key TEXT NOT NULL,
 video_url TEXT,
 ubicacion TEXT,
 anio INTEGER CHECK(anio BETWEEN 1000 AND 9999),
 destacado_slot INTEGER NOT NULL DEFAULT 0 CHECK(destacado_slot=0),
 fecha_creacion TEXT NOT NULL
);
INSERT INTO obras_nueva(id,servicio_id,titulo,descripcion,imagen_key,video_url,ubicacion,anio,destacado_slot,fecha_creacion)
 SELECT id,servicio_id,titulo,descripcion,imagen_key,video_url,ubicacion,anio,0,fecha_creacion FROM obras;
DROP TABLE obras;
ALTER TABLE obras_nueva RENAME TO obras;
CREATE INDEX idx_obras_fecha ON obras(servicio_id,fecha_creacion DESC,id);

CREATE TABLE fotos_sobre_nosotros (
 id TEXT PRIMARY KEY NOT NULL,
 imagen_key TEXT NOT NULL UNIQUE,
 texto_alternativo TEXT NOT NULL DEFAULT 'Fotografía de la Corporación Artística Antony Rodríguez' CHECK(length(trim(texto_alternativo)) BETWEEN 1 AND 160),
 orden INTEGER NOT NULL CHECK(orden BETWEEN -40 AND -1 OR orden BETWEEN 1 AND 20),
 fecha_creacion TEXT NOT NULL
);
INSERT OR IGNORE INTO fotos_sobre_nosotros(id,imagen_key,texto_alternativo,orden,fecha_creacion)
 SELECT 'migrated-about-photo',imagen_key,'Fotografía de la Corporación Artística Antony Rodríguez',1,COALESCE(fecha_actualizacion,datetime('now'))
 FROM imagenes_sitio WHERE clave='about.photo';

CREATE TABLE imagenes_sitio_nueva (
 clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN ('home.cover','profile.photo','service.mural.cover','service.escultura.cover','service.cuadro.cover','service.restauracion.cover','service.logo.cover','service.fachada.cover','service.materiales.cover','service.electricos.cover','service.drywall.cover')),
 imagen_key TEXT NOT NULL,
 fecha_actualizacion TEXT
);
INSERT INTO imagenes_sitio_nueva(clave,imagen_key,fecha_actualizacion)
 SELECT clave,imagen_key,fecha_actualizacion FROM imagenes_sitio WHERE clave<>'about.photo';
DROP TABLE imagenes_sitio;
ALTER TABLE imagenes_sitio_nueva RENAME TO imagenes_sitio;

UPDATE textos SET clave='profile.eyebrow' WHERE clave='about.eyebrow';
UPDATE textos SET clave='profile.title' WHERE clave='about.title';
UPDATE textos SET clave='profile.titleAccent' WHERE clave='about.titleAccent';
UPDATE textos SET clave='profile.description' WHERE clave='about.description';
INSERT OR IGNORE INTO textos(clave,grupo,valor) VALUES
 ('about.eyebrow','about','Sobre nosotros'),
 ('about.title','about','Arte que transforma espacios.'),
 ('about.titleAccent','about','transforma'),
 ('about.description','about','Somos una corporación artística que desarrolla proyectos a medida. Esta presentación podrá editarse con información confirmada.'),
 ('service.materiales.subtitle','services','Materiales para crear y construir'),
 ('service.materiales.description','services','Consulta por WhatsApp la disponibilidad y orientación sobre materiales e insumos.'),
 ('service.electricos.subtitle','services','Soluciones eléctricas'),
 ('service.electricos.description','services','Conoce nuestros servicios eléctricos y solicita información sobre tu proyecto.'),
 ('service.drywall.subtitle','services','Espacios a tu medida'),
 ('service.drywall.description','services','Proyectos de drywall y carpintería con soluciones adaptadas a cada espacio.'),
 ('complementary.eyebrow','services','Soluciones para tus espacios'),
 ('complementary.description','services','Conoce nuestras soluciones eléctricas y de drywall y carpintería, con propuestas adaptadas a cada proyecto.');

CREATE TABLE campos_cotizador (
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
CREATE UNIQUE INDEX uq_campos_cotizador_orden ON campos_cotizador(paso,orden);
INSERT OR IGNORE INTO campos_cotizador(id,etiqueta,tipo,paso,requerido,habilitado,orden,opciones_json,limite) VALUES
 ('obra','Servicio o proyecto','text',1,1,1,1,'[]',120),
 ('detalles','Detalles de la idea','textarea',1,0,1,2,'[]',500),
 ('metros','Metros cuadrados aproximados','number',2,0,1,3,'[]',8),
 ('entorno','Entorno','select',2,0,1,4,'["Interior","Exterior"]',40),
 ('altura','Piso o altura','text',2,0,1,5,'[]',120),
 ('nombre','Nombre','text',3,0,1,6,'[]',100),
 ('telefono','Teléfono o WhatsApp','tel',3,1,1,7,'[]',30),
 ('correo','Correo electrónico','email',3,0,1,8,'[]',160);
