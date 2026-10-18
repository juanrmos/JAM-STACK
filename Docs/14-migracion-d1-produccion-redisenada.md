# Migración controlada de D1 productiva al modelo del rediseño

**Estado:** migración aplicada y verificada en una D1 remota nueva, aislada de los Workers y Pages activos. La D1 productiva original no fue modificada. No se cambió tráfico ni configuración de Workers/Pages y no se hizo despliegue.

## Objetivo y estrategia

La D1 productiva usa el modelo histórico de `Back/schema.sql` en `production`: `obras.categoria`, `orden` y `destacado`, además de `logos`. El esquema validado en la rama `feature/rediseno-integral` agrega `servicios`, `textos` e `imagenes_sitio`, y cambia las obras a `servicio_id` y `destacado_slot`.

La ruta preparada usa **blue/green**: crear una D1 destino vacía, copiar a ella una exportación de la D1 origen, aplicar `Back/migrations-production/0001_redisenar_modelo.sql` sobre esa copia y validar todo antes del cambio de tráfico. La D1 productiva original queda intacta como punto de retorno. Las imágenes siguen en el mismo bucket R2; el SQL conserva las claves `imagen_key` y no modifica objetos.

No se recomienda transformar la D1 activa en el mismo paso que el cambio de Worker: la versión productiva actual consulta `categoria` y `orden`, y dejaría de funcionar si esas columnas desaparecen antes de cambiar todos sus consumidores.

## Reglas de transformación

- Se conservan el ID, título, descripción, clave R2, video y fecha de cada obra. Ubicación y año quedan `NULL`; no se inventan datos.
- Las categorías estables `mural`, `escultura`, `cuadro`, `restauracion`, `logo` y `fachada` pasan a `servicio_id`. Una categoría desconocida aborta la migración.
- Los órdenes existentes del 1 al 5 se mantienen primero y en el mismo orden. El resto se ordena por fecha descendente e ID descendente; los primeros cinco ocupan los slots y los siguientes quedan con `destacado_slot = NULL`.
- `destacado` no tiene un equivalente separado en el modelo destino. Si hay alguna fila con `destacado <> 0`, la migración aborta para que se decida explícitamente cómo representar esa selección antes de continuar.
- Se conservan IDs, nombres, claves R2 y fechas de logos. Si hay más de un logo activo o un valor incompatible, la migración aborta; no elige uno por su cuenta.
- Se crean los seis servicios y las claves editoriales genéricas del contrato local. El administrador podrá editarlas luego. No se copian textos desde el código histórico.
- Se crea `imagenes_sitio` vacío, porque el esquema de `production` no tiene espacios de foto. Las imágenes actuales del perfil, Sobre nosotros y las portadas estáticas no se reasignan ni se borran; podrán cargarse en los espacios nuevos desde Admin tras el corte.

## Archivos preparados

- `Back/migration-support/production-preflight.sql`: consultas de solo lectura para revisar conteos, categorías, valores `destacado`, logos activos, campos y claves de R2.
- `Back/migrations-production/0001_redisenar_modelo.sql`: migración versionada. Las guardas abortan por categorías no mapeables, `destacado` pendiente, más de un logo activo o campos vacíos. Las restricciones finales cubren slots, integridad referencial y logo activo único.
- `tests/d1-production-migration.mjs`: ensayo con SQLite en memoria para comprobar preservación, mapeo y rollback ante los tres bloqueos principales.

La carpeta `Back/migrations` existente contiene scripts históricos que no representan una secuencia Wrangler de producción. Por eso esta migración se mantiene en `migrations-production`; no apuntar Wrangler a la carpeta histórica.

## Ejecución controlada del 2026-10-18

Se completó la preparación del destino con Wrangler autenticado en Cloudflare:

- D1 origen: `portafolio-db`, ID `55bd3fbf-fe42-42e1-85e1-a7f0a051b513`, región ENAM.
- D1 destino: `portafolio-db-rediseno-2026-10-18`, ID `fce3a0c7-46b8-4b7a-bc34-de4359c890c7`, región ENAM.
- Se registró el bookmark de Time Travel del origen antes de exportar: `000000a4-00000000-00005108-5bb4e2342bed6b9a0a8bae5557196040`. Una comprobación posterior mostró `000000a6-00000000-00005108-c3bfc846057ed13c01e39b79e7563415`; una segunda exportación confirmó que las filas de `obras` y `logos` no cambiaron.
- La exportación restringida a `.work/prod-d1-migration-2026-10-18.sql` pasó el ensayo con SQLite en memoria: se conservaron las 9 obras y el logo sin anomalías.
- Se importó el dump únicamente en la D1 destino y se aplicó `0001_redisenar_modelo.sql`; Wrangler registró la migración como aplicada.
- Verificación remota de destino: 9 obras, 1 logo, 6 servicios, 30 textos y 0 filas en `imagenes_sitio`. La distribución es 5 obras/5 slots para `mural` y 4 obras/4 slots para `escultura`; las otras categorías aún no tienen obras.
- Verificaciones: 0 obras huérfanas, 0 slots fuera de rango o duplicados, 0 valores editoriales vacíos, 1 logo activo, `PRAGMA foreign_key_check` vacío y presencia de los índices únicos/de consulta esperados.
- Los IDs y las claves R2 se conservaron en el ensayo del dump real antes de importarlo. No se copiaron ni borraron objetos R2.
- Se volvió a exportar el origen y se comparó el resultado transformado, tabla por tabla, con la D1 destino. Las cinco tablas (`servicios`, `textos`, `obras`, `logos`, `imagenes_sitio`) coincidieron exactamente. La exportación vigente tiene SHA-256 `81795c2f167a530b41a8b83a95124e03189da6f6943b482fcd898dd0cbf63a67` y permanece en `.work/prod-d1-migration-latest-2026-10-18.sql`.
- El archivo temporal de configuración Wrangler y el dump permanecen en `.work/`, fuera del control de versiones. El dump contiene datos exportados de producción y debe tratarse como información restringida.

El comando heredado `wrangler d1 backup create` no está disponible en Wrangler 4 para esta base. Se consultó y registró el bookmark de Time Travel del origen; Wrangler informa que captura un backup al aplicar migraciones. La D1 fuente permanece disponible e intacta como retorno independiente.

## Secuencia para una futura ventana de corte aprobada

1. Antes de una futura ventana de corte, congelar escrituras administrativas y confirmar que el origen no recibió cambios posteriores a esta exportación. Si los recibió, preparar una sincronización final aprobada o repetir el procedimiento sobre un nuevo destino; no asumir que la copia ya está al día.
2. Registrar los SHAs de Workers/Front activos y repetir `production-preflight.sql` en solo lectura. Si cambió el contenido o el esquema de origen, reevaluar las guardas antes de usar esta D1 destino.
3. Probar el Worker nuevo y el Front candidato contra la D1 destino, sin dirigir usuarios a ellos. Validar autenticación Access, lectura pública, Admin, CRUD, orden y subidas con R2 en un entorno aislado.
4. Preparar por separado el corte coordinado de Workers/Pages a la D1 destino, incluyendo los bindings y las rutas del Front. El corte requiere autorización específica y un plan operacional propio. La D1 destino no está conectada al tráfico activo.
5. Tras un corte aprobado, verificar lectura pública, login, edición, medios, logs y errores. Mantener la D1 original intacta durante el periodo de retorno acordado. No borrar la D1 antigua ni archivos R2 como parte de este procedimiento.

## Rollback y límites

Si falla la importación o la migración en la D1 destino, no cambiar tráfico; corregir el proceso o eliminar únicamente esa D1 temporal después de confirmar su ID. Wrangler D1 migrations revierte el archivo fallido como una unidad. Si falla la aplicación después del corte, volver los bindings/Workers/Pages al conjunto anterior y dejar la D1 nueva intacta para diagnóstico. Una reversión de código por sí sola no deshace cambios de D1 o R2.

El paso de exportación e importación puede contener información del portafolio, por lo que el dump debe protegerse y retirarse de manera controlada al terminar. La migración no copia medios binarios entre buckets; presupone que las claves R2 existentes siguen presentes en el bucket productivo que se mantendrá enlazado.

## Validación realizada

`node tests/d1-production-migration.mjs` crea un origen sintético con las seis categorías, siete murales, dos logos y una marca por cada bloqueo. Comprueba conservación, compactación a cinco slots, datos opcionales nulos, índices, claves foráneas y rollback ante datos incompatibles. También validó en memoria el dump real antes de importarlo. Luego se verificó la D1 destino remota con consultas de solo lectura. Estas comprobaciones validan la copia y transformación de datos; no prueban el Worker/Admin/Front nuevos ni autorizan el corte de tráfico.
