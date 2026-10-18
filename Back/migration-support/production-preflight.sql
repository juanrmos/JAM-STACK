-- Solo lectura. Ejecutar contra la D1 origen y guardar la salida para revisión.

-- Conteos y columnas legacy que deben cuadrar con la exportación.
SELECT 'obras' AS tabla, count(*) AS filas FROM obras
UNION ALL
SELECT 'logos', count(*) FROM logos;

-- Categorías no mapeables: debe devolver cero filas.
SELECT categoria, count(*) AS filas
FROM obras
WHERE lower(trim(coalesce(categoria, ''))) NOT IN (
  'mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada'
)
GROUP BY categoria;

-- Marcas `destacado` que requieren decisión antes de migrar; debe devolver cero.
SELECT id, titulo, categoria, orden, destacado
FROM obras
WHERE destacado <> 0
ORDER BY categoria, orden, fecha_creacion DESC;

-- Varios logos activos o valores incompatibles: debe devolver cero filas.
SELECT id, nombre, activo
FROM logos
WHERE activo NOT IN (0, 1)
   OR activo = 1 AND (SELECT count(*) FROM logos WHERE activo = 1) > 1;

-- Campos que incumplirían las restricciones destino: debe devolver cero.
SELECT 'obra' AS tipo, id AS id, titulo AS detalle FROM obras
WHERE length(trim(titulo)) = 0 OR length(trim(imagen_key)) = 0
UNION ALL
SELECT 'logo', id, nombre FROM logos
WHERE length(trim(nombre)) = 0 OR length(trim(imagen_key)) = 0;

-- Distribución actual de órdenes, incluidos valores fuera de rango.
SELECT categoria, orden, destacado, count(*) AS filas
FROM obras
GROUP BY categoria, orden, destacado
ORDER BY categoria, orden, destacado;

-- Claves R2 a conservar; revisar existencia en el bucket por separado.
SELECT 'obra' AS tipo, id, imagen_key FROM obras
UNION ALL
SELECT 'logo', id, imagen_key FROM logos;
