-- Amplía la galería de Sobre nosotros de 20 a 100 fotos sin perder contenido.
-- D1/SQLite requiere reconstruir la tabla para cambiar su restricción CHECK.
CREATE TABLE fotos_sobre_nosotros_nueva (
 id TEXT PRIMARY KEY NOT NULL,
 imagen_key TEXT NOT NULL UNIQUE,
 texto_alternativo TEXT NOT NULL DEFAULT 'Fotografía de la Corporación Artística Antony Rodríguez' CHECK(length(trim(texto_alternativo)) BETWEEN 1 AND 160),
 orden INTEGER NOT NULL CHECK(orden BETWEEN -100 AND -1 OR orden BETWEEN 1 AND 100),
 fecha_creacion TEXT NOT NULL
);

INSERT INTO fotos_sobre_nosotros_nueva(id,imagen_key,texto_alternativo,orden,fecha_creacion)
SELECT id,imagen_key,texto_alternativo,orden,fecha_creacion
FROM fotos_sobre_nosotros;

DROP TABLE fotos_sobre_nosotros;
ALTER TABLE fotos_sobre_nosotros_nueva RENAME TO fotos_sobre_nosotros;
CREATE UNIQUE INDEX uq_fotos_sobre_nosotros_orden ON fotos_sobre_nosotros(orden);
