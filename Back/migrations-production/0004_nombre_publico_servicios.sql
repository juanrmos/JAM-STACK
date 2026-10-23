-- Añade el nombre de presentación de los seis servicios existentes.
-- En la D1 activa la columna ya existe, pero la migración original no quedó
-- registrada. Al clonar esa D1 se adopta esta migración mediante el paso
-- documentado en migration-support/adopt-0004-nombre-servicios.sql.
ALTER TABLE servicios ADD COLUMN nombre_publico TEXT NOT NULL DEFAULT 'Servicio'
  CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 40);

UPDATE servicios SET nombre_publico = CASE id
  WHEN 'mural' THEN 'Murales monumentales'
  WHEN 'escultura' THEN 'Esculturas'
  WHEN 'cuadro' THEN 'Galería de Cuadros'
  WHEN 'restauracion' THEN 'Restauración'
  WHEN 'logo' THEN 'Letras y logotipos'
  WHEN 'fachada' THEN 'Pintado de fachadas'
  ELSE nombre_publico
END;
