-- Convierte el esquema legacy de producción al modelo de Docs/13.
-- Ejecutar solo sobre una copia de producción importada a una D1 nueva.
-- Wrangler D1 migrations aplica cada archivo de forma transaccional y revierte
-- este archivo completo si alguna restricción o guarda falla.

CREATE TABLE _migration_guard (
  valid INTEGER NOT NULL CHECK (valid = 1)
);

-- No inventar una relación para obras sin categoría reconocida.
INSERT INTO _migration_guard
SELECT NOT EXISTS (
  SELECT 1 FROM obras
  WHERE lower(trim(coalesce(categoria, ''))) NOT IN (
    'mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada'
  )
);

-- `destacado` no tiene equivalente en el modelo nuevo. Detener la migración
-- para revisar cada registro marcado antes de decidir cómo representarlo.
INSERT INTO _migration_guard
SELECT NOT EXISTS (SELECT 1 FROM obras WHERE destacado <> 0);

-- La migración no elige arbitrariamente un logo si el legacy tiene varios activos.
INSERT INTO _migration_guard
SELECT NOT EXISTS (
  SELECT 1 FROM logos WHERE activo = 1
  GROUP BY activo HAVING count(*) > 1
);

-- Evitar pérdida por las nuevas reglas NOT NULL / CHECK.
INSERT INTO _migration_guard
SELECT NOT EXISTS (
  SELECT 1 FROM obras WHERE length(trim(titulo)) = 0 OR length(trim(imagen_key)) = 0
);
INSERT INTO _migration_guard
SELECT NOT EXISTS (
  SELECT 1 FROM logos
  WHERE length(trim(nombre)) = 0 OR length(trim(imagen_key)) = 0 OR activo NOT IN (0, 1)
);

CREATE TABLE servicios (
  id TEXT PRIMARY KEY NOT NULL
);
INSERT INTO servicios(id) VALUES
  ('mural'), ('escultura'), ('cuadro'), ('restauracion'), ('logo'), ('fachada');

CREATE TABLE textos (
  clave TEXT PRIMARY KEY NOT NULL,
  grupo TEXT NOT NULL,
  valor TEXT NOT NULL CHECK(length(trim(valor)) > 0),
  fecha_actualizacion TEXT
);

INSERT INTO textos(clave, grupo, valor) VALUES
  ('home.eyebrow','home','Artista plástico / Huánuco'),
  ('home.title','home','Capturando la esencia en cada trazo.'),
  ('home.titleAccent','home','esencia'),
  ('home.subtitle','home','Murales, esculturas y proyectos integrales que transforman espacios con la maestría del realismo.'),
  ('profile.tagline','profile','Talento que trasciende fronteras.'),
  ('profile.specialties','profile','Murales · Escultura · Realismo'),
  ('archive.eyebrow','archive','Archivo visual'),
  ('archive.title','archive','Obras con historia.'),
  ('archive.titleAccent','archive','historia'),
  ('archive.subtitle','archive','Una selección de proyectos que encuentran su lugar en el mundo.'),
  ('about.photoCaption','about','El oficio, en cada detalle'),
  ('about.eyebrow','about','Una práctica con propósito'),
  ('about.title','about','Arte hecho con identidad.'),
  ('about.titleAccent','about','identidad'),
  ('about.description','about','Cada proyecto nace de una idea y de la conversación con quienes habitan el espacio. Conoce nuestra propuesta artística y conversemos sobre lo que te gustaría crear.'),
  ('contact.eyebrow','contact','Hablemos de tu idea'),
  ('contact.title','contact','Todo gran proyecto empieza con una conversación.'),
  ('contact.description','contact','Cuéntanos qué tienes en mente. Te ayudaremos a encontrar la mejor forma de llevarlo a la realidad.'),
  ('service.mural.subtitle','services','Historias en grandes muros'),
  ('service.mural.description','services','Arte que transforma muros en relatos vivos. Composiciones originales, pensadas para dialogar con su espacio y su gente.'),
  ('service.escultura.subtitle','services','Forma que respira'),
  ('service.escultura.description','services','Volumen, materia y carácter se encuentran en piezas únicas, creadas para habitar espacios con presencia y sensibilidad.'),
  ('service.cuadro.subtitle','services','Tu historia, enmarcada'),
  ('service.cuadro.description','services','Retratos y obras hechas a medida que conservan lo esencial: una historia, una emoción, una forma propia de mirar.'),
  ('service.restauracion.subtitle','services','Memoria que perdura'),
  ('service.restauracion.description','services','Cuidado experto para recuperar la fuerza y el detalle de obras, superficies y espacios con valor artístico y afectivo.'),
  ('service.logo.subtitle','services','Tu marca, a gran escala'),
  ('service.logo.description','services','Identidad visual pintada a mano para marcas que quieren hacerse ver. Diseño, precisión y oficio en cada trazo.'),
  ('service.fachada.subtitle','services','Identidad en cada muro'),
  ('service.fachada.description','services','Una nueva mirada para la fachada de tu negocio o vivienda, con color, intención y una ejecución hecha para durar.');

CREATE TABLE obras_nueva (
  id TEXT PRIMARY KEY NOT NULL,
  servicio_id TEXT NOT NULL REFERENCES servicios(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0),
  descripcion TEXT,
  imagen_key TEXT NOT NULL,
  video_url TEXT,
  ubicacion TEXT,
  anio INTEGER CHECK(anio BETWEEN 1000 AND 9999),
  destacado_slot INTEGER CHECK(destacado_slot BETWEEN 1 AND 5),
  fecha_creacion TEXT NOT NULL
);

-- Mantiene las posiciones 1–5 en su orden. El resto entra al almacén por
-- fecha DESC e ID DESC; máximo cinco slots por servicio.
WITH mapeadas AS (
  SELECT
    id, lower(trim(categoria)) AS servicio_id, titulo, descripcion, imagen_key,
    video_url, fecha_creacion,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(categoria))
      ORDER BY
        CASE WHEN orden BETWEEN 1 AND 5 THEN 0 ELSE 1 END,
        CASE WHEN orden BETWEEN 1 AND 5 THEN orden END,
        fecha_creacion DESC,
        id DESC
    ) AS posicion
  FROM obras
)
INSERT INTO obras_nueva(
  id, servicio_id, titulo, descripcion, imagen_key, video_url,
  ubicacion, anio, destacado_slot, fecha_creacion
)
SELECT
  id, servicio_id, titulo, descripcion, imagen_key, video_url,
  NULL, NULL, CASE WHEN posicion <= 5 THEN posicion ELSE NULL END, fecha_creacion
FROM mapeadas;

CREATE UNIQUE INDEX uq_obras_servicio_slot
  ON obras_nueva(servicio_id, destacado_slot)
  WHERE destacado_slot IS NOT NULL;
CREATE INDEX idx_obras_fecha
  ON obras_nueva(servicio_id, fecha_creacion DESC, id);

DROP TABLE obras;
ALTER TABLE obras_nueva RENAME TO obras;

CREATE TABLE logos_nueva (
  id TEXT PRIMARY KEY NOT NULL,
  nombre TEXT NOT NULL CHECK(length(trim(nombre)) > 0),
  imagen_key TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 0 CHECK(activo IN (0, 1)),
  fecha_creacion TEXT NOT NULL,
  fecha_actualizacion TEXT
);
INSERT INTO logos_nueva(id, nombre, imagen_key, activo, fecha_creacion, fecha_actualizacion)
SELECT id, nombre, imagen_key, activo, fecha_creacion, fecha_actualizacion FROM logos;
DROP TABLE logos;
ALTER TABLE logos_nueva RENAME TO logos;
CREATE UNIQUE INDEX uq_logos_activo ON logos(activo) WHERE activo = 1;

CREATE TABLE imagenes_sitio (
  clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN (
    'about.photo', 'profile.photo',
    'service.mural.cover', 'service.escultura.cover', 'service.cuadro.cover',
    'service.restauracion.cover', 'service.logo.cover', 'service.fachada.cover'
  )),
  imagen_key TEXT NOT NULL,
  fecha_actualizacion TEXT
);

DROP TABLE _migration_guard;
