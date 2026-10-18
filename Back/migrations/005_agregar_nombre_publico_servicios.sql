-- Solo para D1 local cuyo esquema previo de servicios contiene únicamente id.
-- Wranger local: agregar con default válido, después asignar los valores por ID.
ALTER TABLE servicios ADD COLUMN nombre_publico TEXT NOT NULL DEFAULT 'Servicio'
  CHECK(length(trim(nombre_publico)) BETWEEN 1 AND 40);

UPDATE servicios SET nombre_publico = CASE id
  WHEN 'mural' THEN 'Murales monumentales'
  WHEN 'escultura' THEN 'Esculturas'
  WHEN 'cuadro' THEN 'Cuadros personalizados'
  WHEN 'restauracion' THEN 'Restauración'
  WHEN 'logo' THEN 'Letras y logotipos'
  WHEN 'fachada' THEN 'Pintado de fachadas'
  ELSE nombre_publico
END;
