-- Solo lectura. Usar sobre una exportación/candidata de la D1 rediseñada activa.
-- No es intercambiable con production-preflight.sql, que valida el esquema legacy.

-- Volumen y campos que deben conservarse en la copia.
SELECT
  (SELECT count(*) FROM obras) AS obras,
  (SELECT count(*) FROM logos) AS logos,
  (SELECT count(*) FROM servicios) AS servicios,
  (SELECT count(*) FROM textos) AS textos,
  (SELECT count(*) FROM imagenes_sitio) AS imagenes_sitio,
  (SELECT count(*) FROM obras WHERE video_url IS NOT NULL AND trim(video_url) <> '') AS obras_con_video;

-- Distribución actual y estado de los destacados que se convertirán en 0.
SELECT servicio_id, count(*) AS obras,
       sum(CASE WHEN destacado_slot IS NOT NULL THEN 1 ELSE 0 END) AS con_slot,
       sum(CASE WHEN destacado_slot IS NULL THEN 1 ELSE 0 END) AS sin_slot
FROM obras GROUP BY servicio_id ORDER BY servicio_id;

-- Debe devolver cero filas: servicios huérfanos o valores inválidos.
SELECT count(*) AS obras_sin_servicio
FROM obras AS o LEFT JOIN servicios AS s ON s.id=o.servicio_id
WHERE s.id IS NULL OR length(trim(o.titulo))=0 OR length(trim(o.imagen_key))=0;

-- Debe devolver cero filas: slots fuera del rango vigente o duplicados.
SELECT servicio_id, destacado_slot, count(*) AS filas
FROM obras
WHERE destacado_slot IS NOT NULL
GROUP BY servicio_id, destacado_slot
HAVING destacado_slot NOT BETWEEN 1 AND 5 OR count(*) > 1;

-- Datos de marca que deben conservarse; debe existir como máximo un logo activo.
SELECT count(*) AS logos_activos FROM logos WHERE activo=1;
SELECT count(*) AS logos_invalidos FROM logos
WHERE activo NOT IN (0,1) OR length(trim(nombre))=0 OR length(trim(imagen_key))=0;

-- Estado de migraciones y asignaciones de imágenes. Revisar las claves R2
-- contra el bucket antes de cambiar bindings.
SELECT name FROM d1_migrations ORDER BY id;
SELECT clave FROM imagenes_sitio ORDER BY clave;
SELECT id, nombre_publico FROM servicios ORDER BY id;

-- Para adoptar 0004 en una D1 clonada de la fuente activa, esta fila debe
-- devolver has_name_column=1, six_base_services=6, invalid_names=0 y
-- already_recorded=0 antes de ejecutar el script de adopción.
SELECT
  EXISTS (SELECT 1 FROM pragma_table_info('servicios') WHERE name='nombre_publico') AS has_name_column,
  (SELECT count(*) FROM servicios WHERE id IN ('mural','escultura','cuadro','restauracion','logo','fachada')) AS six_base_services,
  (SELECT count(*) FROM servicios WHERE length(trim(nombre_publico)) NOT BETWEEN 1 AND 40) AS invalid_names,
  EXISTS (SELECT 1 FROM d1_migrations WHERE name='0004_nombre_publico_servicios.sql') AS already_recorded;

-- Debe devolver cero filas antes de renombrar about.* a profile.*.
SELECT origen.clave AS clave_origen, destino.clave AS clave_destino
FROM textos AS origen
JOIN textos AS destino ON destino.clave = CASE origen.clave
  WHEN 'about.eyebrow' THEN 'profile.eyebrow'
  WHEN 'about.title' THEN 'profile.title'
  WHEN 'about.titleAccent' THEN 'profile.titleAccent'
  WHEN 'about.description' THEN 'profile.description'
END
WHERE origen.clave IN ('about.eyebrow','about.title','about.titleAccent','about.description');
