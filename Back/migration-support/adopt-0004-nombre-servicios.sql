-- Solo para una D1 candidata clonada desde la D1 activa, nunca para producción
-- ni para una base recién creada. La D1 activa ya tiene esta columna y sus
-- valores; este marcador evita ejecutar dos veces el ALTER TABLE.
-- Primero ejecutar la consulta de elegibilidad indicada en Docs/17.
INSERT OR IGNORE INTO d1_migrations(name)
SELECT '0004_nombre_publico_servicios.sql'
WHERE EXISTS (
    SELECT 1 FROM pragma_table_info('servicios') WHERE name = 'nombre_publico'
  )
  AND NOT EXISTS (
    SELECT 1 FROM servicios
    WHERE length(trim(nombre_publico)) NOT BETWEEN 1 AND 40
  )
  AND (
    SELECT count(DISTINCT id) FROM servicios
    WHERE id IN ('mural','escultura','cuadro','restauracion','logo','fachada')
  ) = 6;
