📄 DOCUMENTO 3: Impacto en Archivos Existentes
Archivo sugerido: docs/admin/03-impacto-archivos.md
Propósito: Documentar qué archivos del frontend y backend deben modificarse, qué partes se reutilizan, y qué hay que crear desde cero.

1. Frontend — Archivos a Modificar
1.1 src/pages/admin/index.astro
Aspecto	Cambio
Vistas	Se mantienen las 5 vistas actuales
Estilos	.admin-container mantiene max-width: 1200px
Scripts	Actualizar renderVista() si es necesario
1.2 src/components/admin/AdminHeader.astro
Aspecto	Cambio
Sin cambios	El header ya está implementado y funciona
1.3 src/components/admin/Dashboard.astro
Aspecto	Cambio
Estructura	Rediseño completo: riel de slots + grilla + paginación
Filtros	Añadir select de categoría + input de búsqueda
Grilla	Reemplazar lista vertical por grid de 5×2
Slots	Añadir riel de 5 slots arriba
Paginación	Mantener Paginacion.astro
JS	Actualizar fetch para incluir filtros y búsqueda
Scoping	Usar :global() en clases dinámicas
1.4 src/components/admin/FormularioObra.astro
Aspecto	Cambio
Slots	Añadir sección de 5 slots debajo de "Categoría"
Checkbox "Destacada"	Eliminar del HTML y JS
Previsualización	Añadir previsualización de imagen (opcional)
Edición	Añadir lógica para precargar datos y slot actual
JS	Añadir variable slotSeleccionado y lógica de carga de slots
1.5 src/components/admin/Paginacion.astro
Aspecto	Cambio
Reescribir	Generar botones numéricos en lugar de "Página X de Y"
Props	Recibir totalPaginas y paginaActual
Estilos	Botones numéricos con hover dorado
1.6 src/components/admin/DashboardLogos.astro
Aspecto	Cambio
Sin cambios estructurales	Solo verificar que el scoping siga funcionando
1.7 src/components/admin/FormularioLogo.astro
Aspecto	Cambio
Sin cambios estructurales	Solo verificar que el scoping siga funcionando
1.8 src/components/Galeria.astro
Aspecto	Cambio
Bug de flechas	Corregir scrollBy para que apunte a .galeria__riel-scroll
Categorías	Actualizar categoriasMap y ordenDefecto con las 6 categorías v3
ORDER BY	Cambiar a orden ASC (consistente con backend)
2. Backend — Archivos a Modificar
2.1 Back/schema.sql
Aspecto	Cambio
Índice	Añadir idx_obras_categoria_orden
Índice	Añadir idx_obras_titulo
Comentario	Documentar que orden = 0 significa "sin slot"
2.2 Back/src/handlers/obras.ts
Aspecto	Cambio
listarObras	Cambiar ORDER BY a orden ASC, fecha_creacion DESC
listarObras	Añadir filtro buscar con LIKE '%titulo%' COLLATE NOCASE
listarObras	Añadir filtro orden=1-5 para slots
crearObra	Implementar lógica de MIN(6, MAX(orden) + 1)
crearObra	Implementar batch para shift + insert
actualizarObra	Implementar lógica de cambio de slot
actualizarObra	Implementar lógica de cambio de categoría
eliminarObra	Implementar reindexación + relleno con orden=0 más nueva
2.3 Back/src/schemas.ts
Aspecto	Cambio
Zod	Modificar orden para permitir 0 como "sin slot"
Zod	Añadir validación de buscar (opcional)
2.4 Back/src/index.ts
Aspecto	Cambio
Rutas	Sin cambios estructurales
Handlers	Actualizar importaciones si es necesario
2.5 Back/src/lib/
Aspecto	Cambio
Helpers	Añadir helper para cálculo de MAX(orden) si es necesario
3. Script de Migración
3.1 Migración inicial
Archivo: Back/migrations/001_asignar_orden_inicial.sql

sql
-- Asignar orden a obras existentes basado en fecha_creacion DESC por categoría
UPDATE obras
SET orden = (
  SELECT COUNT(*)
  FROM obras AS o2
  WHERE o2.categoria = obras.categoria
  AND o2.fecha_creacion >= obras.fecha_creacion
)
WHERE orden = 0;

-- Las obras con orden > 5 pasan a 0
UPDATE obras SET orden = 0 WHERE orden > 5;
Ejecución: Una sola vez, antes de la implementación.

4. Resumen de Archivos Afectados
Archivo	Tipo de cambio	Prioridad
src/components/admin/Dashboard.astro	Rediseño completo	Alta
src/components/admin/FormularioObra.astro	Añadir slots + edición	Alta
src/components/admin/Paginacion.astro	Reescribir	Alta
src/components/Galeria.astro	Bug fix + categorías	Alta
Back/src/handlers/obras.ts	Lógica de reordenamiento	Alta
Back/src/schemas.ts	Zod orden opcional	Alta
Back/schema.sql	Índices	Media
Back/migrations/001_asignar_orden_inicial.sql	Script de migración	Alta
Back/src/index.ts	Sin cambios	Baja
src/pages/admin/index.astro	Sin cambios	Baja
src/components/admin/AdminHeader.astro	Sin cambios	Baja
src/components/admin/DashboardLogos.astro	Sin cambios	Baja
src/components/admin/FormularioLogo.astro	Sin cambios	Baja
5. Orden de Implementación Sugerido
Migración de BD: Ejecutar script de asignación de orden inicial.

Backend: Modificar handlers/obras.ts con la lógica de reordenamiento.

Backend: Modificar schemas.ts para permitir orden = 0.

Frontend: Rediseñar Dashboard.astro con riel de slots + grilla.

Frontend: Modificar FormularioObra.astro con sección de slots.

Frontend: Reescribir Paginacion.astro con botones numéricos.

Frontend: Corregir bug de Galeria.astro y actualizar categorías.

Testing: Verificar todos los casos de uso (crear, editar, eliminar, cambiar categoría).

6. Riesgos Identificados
Riesgo	Mitigación
Migración con muchas obras	Ejecutar en horario de bajo tráfico
Bug en el batch	Probar con datos de prueba antes de producción
Scoping de Astro en clases dinámicas	Usar :global() desde el inicio
Conflicto con el campo destacado	Ignorarlo, no eliminarlo de la BD
