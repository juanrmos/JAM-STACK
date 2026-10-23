# Migración de producción al modelo de contenido ampliado

**Estado al 23 de octubre de 2026:** la D1 activa se exportó en modo lectura, se copió a una D1 candidata aislada y se aplicaron allí las migraciones 0005 y 0006. Una exportación nueva de la fuente activa se comparó fila por fila con la candidata y con el resultado ensayado en memoria. El Worker público respondió correctamente contra la candidata; las 14 URL de imagen únicas respondieron y el modo de solo lectura rechazó escrituras. La API administrativa pasó su suite completa en una réplica local exacta de la candidata, con D1 y R2 locales, y los datos volvieron a sus conteos originales después de la prueba. No se escribió en la D1 activa, no se desplegaron Workers/Pages y no se cambió el tráfico.

**Actualización operativa del 23 de octubre de 2026:** por el error de contrato detectado en producción se desplegaron los Workers `portafolio-api` (`00e32ed4-8125-4c73-a551-afab416b8235`) y `portafolio-api-admin` (`9423ca57-380c-4ddd-99ff-acf17a11e0b2`) desde la rama de ampliación de contenido. Ambos usan la candidata `portafolio-db-contenido-candidato-2026-10-23` y el bucket productivo `portafolio-archivos`. Las rutas `/api/servicios`, `/api/cotizador/campos`, `/api/about/photos` y las galerías `materiales`, `electricos` y `drywall` respondieron `200`; el preflight del Admin respondió `204` para el origen de Pages. La base anterior se conservó intacta como reversión. **Pages no se desplegó:** el Front con el manejo de caché, solicitudes bajo demanda y estados visuales de carga sigue pendiente de validación y promoción. Las secciones siguientes describen la preparación y los ensayos anteriores a este despliegue.

## Fuente correcta y diferencias verificadas

La API pública desplegada respondió `200` al catálogo de servicios. La configuración del Worker apunta a `portafolio-db-rediseno-2026-10-18` (`fce3a0c7-46b8-4b7a-bc34-de4359c890c7`), que contiene el esquema rediseñado y es la fuente que debe copiarse para esta transición. La D1 `portafolio-db` (`55bd3fbf-fe42-42e1-85e1-a7f0a051b513`) conserva el esquema legacy y está desfasada; no se debe usar para reconstruir el contenido actual.

La candidata de ensayo es `portafolio-db-contenido-candidato-2026-10-23` (`3eb95e22-5657-4841-9a11-047eaa5fe746`), en ENAM. No está asociada a ningún Worker ni ruta de Pages.

Conteos de la fuente activa durante la revisión:

| Entidad | Estado actual |
|---|---:|
| Obras | 12: 5 murales y 7 esculturas |
| Obras con enlace de video | 6 |
| Logos | 1 |
| Servicios | 6 |
| Textos editables | 30 |
| Asignaciones en `imagenes_sitio` | 1 (`home.cover`) |
| Slots destacados | 10 asignados y 2 nulos |

La migración mantiene todas las obras y los enlaces de video, cambia los slots a `0`, conserva el logo y `home.cover`, agrega tres servicios y `Servicios Complementarios`, separa los textos de Perfil de Sobre nosotros, y crea las tablas de galería y configuración del cotizador. No hay una fila `about.photo` que trasladar a la nueva galería; por eso la colección comienza vacía.

## Hallazgo de historial de esquema

La D1 activa registra `0001`, `0002` y `0003` en `d1_migrations`, pero su tabla `servicios` ya tiene `nombre_publico`; la migración histórica `0001` no crea esa columna. Esto es divergencia entre el esquema real y su historial. No se debe ejecutar el `ALTER TABLE` de `0004` sobre esa D1 sin verificar primero la columna.

Se preparó `Back/migrations-production/0004_nombre_publico_servicios.sql` para construir la columna al reproducir la cadena desde una D1 rediseñada sin ella. Para una candidata clonada de la D1 activa, el script `Back/migration-support/adopt-0004-nombre-servicios.sql` registra la migración como ya satisfecha **solo después** de comprobar que la columna y sus valores existen. El registro de adopción se hace únicamente en la D1 candidata, nunca en la fuente activa.

Después, `0005_catalogo_contenido_ampliado.sql` incorpora los nuevos servicios, tablas y reglas; `0006_textos_cotizador.sql` añade los textos editables. La migración 0005 incluye el índice único del orden de fotos para que coincida con `Back/schema.sql`.

## Prueba local

El preflight de solo lectura es `Back/migration-support/current-model-preflight.sql`; el antiguo `production-preflight.sql` solo sirve para el esquema legacy.

Se generaron exportaciones temporales de la fuente activa y de la candidata para comparar filas; ambas se retiraron al terminar la validación y no se incluyeron en Git. **No se deben reutilizar para un corte futuro.** Antes del corte se debe congelar temporalmente la escritura del Admin y tomar una exportación nueva en una ruta local ignorada por Git.

Para validar localmente una exportación nueva, primero generarla en una ruta ignorada:

```powershell
cd C:\Users\juana\Documentos\PortafolioDigital\Back
New-Item -ItemType Directory -Path .work -Force | Out-Null
npx wrangler d1 export portafolio-db-rediseno-2026-10-18 --remote --output .work/current-d1.sql
cd ..
node tests/d1-active-content-migration.mjs Back/.work/current-d1.sql
```

Para comparar una candidata ya migrada, exportarla también y pasar ambas rutas:

```powershell
node tests/d1-active-content-migration.mjs Back/.work/current-d1.sql Back/.work/candidate-d1.sql
```

La validación pasó contra exportaciones frescas de la D1 activa y la candidata, además de un fixture. Se compararon fila por fila las tablas de negocio y coincidieron. `node tests/d1-production-migration.mjs` reproduce la cadena desde el esquema legacy hasta el modelo completo. La suite `node tests/admin-local-api.mjs`, ejecutada contra una réplica local de la exportación candidata con R2 local, pasó login, cargas y lectura de medios, CRUD de obras y logos, los nueve servicios, nombres y grupo complementario, paginación de galería, galería About, orden de fotos y edición del cotizador. Al finalizar se verificó que la réplica conservara sus conteos originales: 12 obras, 1 logo y cero fotos de prueba. `node --test tests/access-contracts.mjs` valida además firmas JWT, emisor, audiencia, bypass local y CORS usando un JWKS de prueba; no sustituye la prueba del JWT real de la aplicación Access. `npm.cmd run typecheck` y `git diff --check` también pasaron. Después de obtener las exportaciones, los tests no conectan a Cloudflare.

## Secuencia propuesta de corte blue/green

1. Aprobar el PR que contiene las migraciones y sus pruebas. No aplicar las migraciones 007/008 de `Back/migrations`; esa carpeta es histórica y no está configurada como directorio de migración de producción.
2. En una ventana acordada, congelar temporalmente las escrituras del Admin. Registrar el SHA y versiones de Workers/Pages y volver a ejecutar el preflight sobre la fuente activa.
3. Volver a exportar la D1 activa actualizada e importar ese snapshot a una candidata nueva, o reemplazar la candidata de ensayo tras confirmar su ID. No reutilizar el snapshot del 23 de octubre si la fuente recibió cambios después de esa fecha. Mantener las mismas claves y el mismo bucket R2; comprobar que cada `imagen_key` referenciada existe. No mezclar la D1 legacy de 9 obras.
4. Confirmar en la candidata que el nombre público de servicios ya existe y corresponde con los valores conservados. Registrar allí la adopción de `0004`; verificar su entrada en `d1_migrations`. Ejecutar las migraciones `0005` y `0006` con Wrangler desde `Back/migrations-production`.
5. Ejecutar el preflight posterior y el test de migración; comparar todas las filas originales. Criterios: mismo total e IDs de obras/logos, mismas descripciones, URLs de video, fechas y claves R2; servicios originales conservados; tres nuevos servicios; slots todos en `0`; integridad referencial correcta; fotos/About y textos renombrados sin colisiones.
6. El Worker público del código actual ya se ensayó en modo de solo lectura contra la candidata: catálogo, obras, contenido, fotos, cotizador y tipografía respondieron `200`; 14 URL R2 únicas respondieron correctamente y una ruta de escritura respondió `404`. La suite administrativa pasó contra una réplica local fiel de la candidata y usó R2 local, así que no tocó el bucket real. `node --test tests/access-contracts.mjs` también verificó el bypass solo en loopback y las reglas de CORS/origen. `LOCAL_MEDIA=true` omite Access solo en loopback; queda pendiente verificar la aceptación de un JWT válido de Cloudflare Access en un Worker Preview protegido y enlazado a la candidata. Wrangler no pudo crear una sesión de Remote Dev en esta cuenta durante la prueba.
7. Solo con aprobación del corte, actualizar ambos Workers para usar la candidata y publicar Pages desde el SHA aprobado. Validar página pública, Admin, galería, cotizador, imágenes, videos y logs. Reabrir escrituras después de pasar estas comprobaciones.
8. Mantener la D1 fuente y R2 sin cambios durante el periodo de observación. Si falla la verificación, regresar Workers/Pages a sus versiones y bindings anteriores; no borrar ni restaurar datos automáticamente.

La migración convierte `destacado_slot` y reconstruye `obras`, por lo que no debe ejecutarse en la D1 activa mientras el Worker anterior pueda seguir escribiendo destacados. Blue/green mantiene la fuente disponible y evita ese intervalo de incompatibilidad. La candidata actual valida estructura y datos de la exportación fresca del 23 de octubre, las lecturas del Worker público, las referencias R2 y las operaciones del Admin en una réplica local con limpieza verificada. Antes del corte aún hace falta la prueba del JWT válido de Access en un preview protegido, otra exportación fresca si cambian los datos, y la aprobación de la ventana de corte.

## Artefactos

- `Back/migrations-production/0004_nombre_publico_servicios.sql`
- `Back/migration-support/adopt-0004-nombre-servicios.sql`
- `Back/migrations-production/0005_catalogo_contenido_ampliado.sql`
- `Back/migrations-production/0006_textos_cotizador.sql`
- `Back/migration-support/current-model-preflight.sql`
- `tests/d1-active-content-migration.mjs`
