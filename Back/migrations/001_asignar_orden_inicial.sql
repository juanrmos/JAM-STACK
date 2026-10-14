-- Reindexa cada categoría completa para no duplicar slots en datos mixtos.
-- Conserva primero el orden relativo de los slots ya asignados (1-5),
-- luego llena los lugares disponibles con obras sin slot por fecha DESC.
-- Una segunda ejecución mantiene el mismo resultado.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY categoria
           ORDER BY CASE WHEN orden BETWEEN 1 AND 5 THEN 0 ELSE 1 END,
                    CASE WHEN orden BETWEEN 1 AND 5 THEN orden END,
                    fecha_creacion DESC,
                    id DESC
         ) AS posicion
  FROM obras
)
UPDATE obras
SET orden = COALESCE((
  SELECT CASE WHEN posicion <= 5 THEN posicion ELSE 0 END
  FROM ranked WHERE ranked.id = obras.id
), 0);
