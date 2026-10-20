-- Amplía los espacios de imagen fijos permitidos en D1.
-- Repetible: conserva las asignaciones actuales, incluida about.photo.
-- D1 no permite BEGIN/COMMIT explícitos dentro de wrangler d1 execute.

DROP TABLE IF EXISTS imagenes_sitio_migracion;
CREATE TABLE imagenes_sitio_migracion (
 clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN (
  'about.photo','profile.photo',
  'service.mural.cover','service.escultura.cover','service.cuadro.cover',
  'service.restauracion.cover','service.logo.cover','service.fachada.cover'
  )),
 imagen_key TEXT NOT NULL,
 fecha_actualizacion TEXT
);

INSERT OR IGNORE INTO imagenes_sitio_migracion(clave,imagen_key,fecha_actualizacion)
SELECT clave,imagen_key,fecha_actualizacion FROM imagenes_sitio;

DROP TABLE imagenes_sitio;
ALTER TABLE imagenes_sitio_migracion RENAME TO imagenes_sitio;
