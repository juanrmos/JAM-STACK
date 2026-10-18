-- Agrega el espacio fijo de portada de Inicio y conserva todas las asignaciones existentes.
CREATE TABLE imagenes_sitio_migracion (
 clave TEXT PRIMARY KEY NOT NULL CHECK(clave IN (
  'home.cover','about.photo','profile.photo',
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
