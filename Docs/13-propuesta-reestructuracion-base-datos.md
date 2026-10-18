# Propuesta de reestructuración de la base de datos

**Estado:** propuesta para revisión. No representa una migración implementada ni cambios aplicados a D1.

**Contexto:** nuevo flujo público y rediseño UI/UX documentados en `10-plan-refactorizacion-arquitectura.md`, sección 18.

## 1. Propósito

Definir una estructura sencilla para el contenido del portafolio rediseñado y para la edición de textos desde el panel. La propuesta parte del inventario de valores identificados para Marca, Navegación, Inicio, Perfil, Servicios, Archivo, Sobre nosotros, Contacto, Cotizador, WhatsApp y accesibilidad.

La estructura debe permitir que el cliente actualice contenido sin editar componentes, mantener nombres de servicios consistentes entre vistas y vincular cada obra con su categoría de servicio. No se agregan tablas por cada pantalla ni se modelan por anticipado funciones que el negocio todavía no necesita.

## 2. Situación actual

La base D1 actual tiene dos tablas:

| Tabla | Datos que guarda | Observación |
|---|---|---|
| `obras` | Título, descripción, categoría, clave de imagen en R2, video, orden, destacado y fecha de creación | `categoria` es texto controlado por convención; no tiene una clave foránea a una tabla de servicios. No incluye ubicación ni año. |
| `logos` | Nombre, clave de imagen en R2, indicador activo y fechas | Es la biblioteca de logos del panel. La página consulta el logo activo. No representa texto de marca ni logotipos de proyectos. |

Los archivos de imagen viven en R2; D1 guarda sus claves. Los textos de navegación, Inicio, servicios, Contacto, Cotizador y accesibilidad se mantienen principalmente en los archivos del Front. Por ello, el esquema actual no permite editar desde Admin todos los textos del inventario.

Los documentos anteriores describen `precios` y `testimonios` como posibles tablas futuras, fuera de alcance de la versión implementada. No se incluyen en esta propuesta porque el rediseño y el inventario actual no confirman que esas secciones se vayan a construir.

## 3. Propuesta en una frase

La base se organiza en cinco tablas: `textos` para frases editables, `servicios` para el catálogo fijo de categorías, `obras` para proyectos reales, `logos` para la biblioteca de marca e `imagenes_sitio` para imágenes editables asignadas a espacios fijos de páginas. La relación principal es que cada obra pertenece a un servicio.

```text
textos       textos editoriales autorizados para edición
servicios    seis IDs fijos para relacionar obras
obras        proyectos, cada uno vinculado a un servicio
logos        imágenes de marca administrables por separado
imagenes_sitio imagen asignada a un espacio fijo, como about.photo, profile.photo o la portada de un servicio
```

No se propone una tabla por cada vista, paso del cotizador, indicador, enlace o etiqueta. Mientras esos elementos sean estructuras fijas del producto, sus textos se pueden editar mediante claves de `textos`; la aplicación conserva los identificadores, el orden funcional y el comportamiento.

## 4. Diagrama DBML para dbdiagram.io

Pegar este bloque en dbdiagram.io permite revisar visualmente las tablas y la relación. Es DBML para diagramación; no es un archivo de migración SQL ejecutable.

```dbml
Table textos {
  clave varchar [pk, note: 'Clave estable: home.title, about.description, service.mural.description']
  grupo varchar [not null, note: 'Área editorial, por ejemplo home, archive, about, contact o services']
  valor text [not null, note: 'El Worker rechaza cadenas vacías o compuestas solo por espacios']
  fecha_actualizacion datetime
}

Table servicios {
  id varchar [pk, note: 'Código estable: mural, escultura, cuadro, restauracion, logo, fachada']
}

Table obras {
  id varchar [pk]
  servicio_id varchar [not null]
  titulo varchar [not null]
  descripcion text
  imagen_key varchar [not null]
  video_url varchar
  ubicacion varchar [note: 'Opcional; completar solo con información confirmada']
  anio int [note: 'Opcional; completar solo con información confirmada']
  destacado_slot int [note: 'NULL o posición del 1 al 5 dentro de su servicio']
  fecha_creacion datetime [not null]

  Indexes {
    (servicio_id, destacado_slot) [unique, name: 'uq_obras_servicio_slot']
  }
}

Table logos {
  id varchar [pk]
  nombre varchar [not null]
  imagen_key varchar [not null]
  activo boolean [not null, default: false]
  fecha_creacion datetime [not null]
  fecha_actualizacion datetime
}

Table imagenes_sitio {
  clave varchar [pk, note: 'Espacios fijos: about.photo, profile.photo y service.<id>.cover para los seis servicios']
  imagen_key varchar [not null, note: 'Clave del archivo en R2']
  fecha_actualizacion datetime
}

Ref: obras.servicio_id > servicios.id
```

La implementación D1 usará sus tipos y restricciones compatibles (`TEXT`, `INTEGER`, claves foráneas e índices). El diagrama expresa el modelo lógico. `servicios` contiene solo los seis IDs necesarios para la clave foránea: nombres, números, orden y plantilla permanecen en la configuración pública indicada por `10-plan-refactorizacion-arquitectura.md`; la semilla D1 materializa esos mismos IDs y una comprobación de paridad detectará divergencias. SQLite permite varios `NULL` en el índice compuesto de slots, por lo que las obras sin posición no chocan entre sí.

El SQL final debe incluir estas restricciones. Se muestran aisladamente para validar la intención; todavía no forman una migración ejecutable:

```sql
-- Dentro de CREATE TABLE obras:
destacado_slot INTEGER CHECK (destacado_slot BETWEEN 1 AND 5),
FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE RESTRICT

-- Dentro de CREATE TABLE textos:
valor TEXT NOT NULL CHECK (length(trim(valor)) > 0)

-- Dentro de CREATE TABLE logos:
activo INTEGER NOT NULL DEFAULT 0 CHECK (activo IN (0, 1))

-- Después de crear las tablas:
CREATE UNIQUE INDEX uq_obras_servicio_slot
  ON obras(servicio_id, destacado_slot)
  WHERE destacado_slot IS NOT NULL;
CREATE UNIQUE INDEX uq_logos_activo
  ON logos(activo)
  WHERE activo = 1;
```

El Worker también validará los rangos, las claves editables y las cadenas compuestas solo por espacios Unicode antes de escribir. Los índices garantizan unicidad, pero la lógica de movimiento sigue siendo responsabilidad del Worker.

## 5. Justificación de negocio

### `textos`: editar la comunicación del sitio

Esta tabla responde directamente a la solicitud de que los textos visibles puedan actualizarse desde Admin. Almacena una fila por texto simple, con una clave técnica estable y un valor editable. La clave no se muestra como contenido al visitante y el administrador cambia el valor, no la identidad interna del campo.

Ejemplos:

| Clave | Uso | Valor inicial del inventario |
|---|---|---|
| `home.title` | Título principal de Inicio | Capturando la esencia en cada trazo. |
| `home.subtitle` | Descripción de Inicio | Murales, esculturas y proyectos integrales… |
| `archive.title` | Título del archivo | Obras con historia. |
| `about.description` | Presentación del artista | Desde Huánuco, Antony Rodríguez crea obras… |
| `contact.description` | Invitación de contacto | Cuéntanos qué tienes en mente… |

El número confirmado `+51 949 772 875`, correo, ubicación y URLs sociales son datos de contacto/configuración, no parte de la lista editorial de textos acordada. Se mantendrán en la configuración del sitio hasta que se decida expresamente permitir su edición desde Admin.

El grupo ayuda a filtrar y organizar el formulario de edición. El administrador solo podrá editar valores de una lista cerrada de claves; no podrá crear claves, borrarlas ni dejar valores vacíos. La API y la interfaz aplicarán una lista permitida y rechazarán valores vacíos o compuestos solo por espacios. La clave y el grupo son metadatos del sistema, no campos editables.

La lista confirmada por ahora incluye títulos editoriales, subtítulos/eyebrows, descripciones y lemas. No incluye los textos de botones, nombres de secciones o navegación, nombres comerciales de servicios ni etiquetas/nombres de campos del cotizador. El texto inicial seguirá siendo genérico hasta aprobar contenido definitivo. Las claves concretas se registran en la sección 11; las claves no incluidas en esa lista permanecen fijas en la aplicación. Si posteriormente se quieren editar nombres de campos fuera del cotizador, se enumerarán individualmente antes de agregarlos a la lista permitida.

Los valores `titleAccent` son fragmentos de presentación ligados a un título, no títulos independientes. Se incluyen en la lista editable propuesta con una validación que comprueba que el fragmento exista en el título correspondiente; ningún valor de acento puede quedar separado de su título. Los nombres de navegación y de servicio son identificadores visibles fijos; los titulares editoriales de las vistas son contenido distinto y sí pueden editarse según la lista de la sección 11.

### `servicios`: una sola fuente del catálogo comercial

Los servicios tienen identidad de negocio y se presentan en dock, filtros, galerías, tarjetas y cotizador. En el modelo destino, el catálogo estructural se definirá en `Front/src/config/servicios.ts`: IDs, nombres públicos y cortos, números, orden y plantilla serán fijos para Admin. Hoy ese archivo solo enumera número, título, subtítulo e imagen, y tiene otro orden; por tanto, habrá que adaptarlo al implementar el rediseño. La tabla D1 `servicios` solo materializará los seis IDs estables para que `obras.servicio_id` tenga integridad referencial. La semilla D1 y el contrato compartido de categorías deberán contener exactamente los mismos IDs; el orden actual de `Shared/contracts/categorias.ts` tampoco define el nuevo orden comercial. Los lemas/subtítulos y descripciones editables irán en `textos`, identificados por ID estable. Un título editorial solo será editable si se distingue del nombre comercial; si ambos textos son iguales, el título permanece fijo.

Los seis códigos internos propuestos se mantienen estables:

| ID estable | Número | Nombre público | Plantilla |
|---|---:|---|---|
| `mural` | 01 | Murales monumentales | Galería |
| `escultura` | 02 | Esculturas | Galería |
| `cuadro` | 03 | Cuadros personalizados | Galería |
| `restauracion` | 04 | Restauración | Galería |
| `logo` | 05 | Letras y logotipos | Comercial |
| `fachada` | 06 | Pintado de fachadas | Comercial |

El identificador no cambia por una actualización editorial. Los seis registros de `servicios` se inicializan mediante una migración/semilla controlada y no tienen endpoints de escritura de Admin. El Worker devuelve el ID de cada obra; el Front resuelve su nombre, número, plantilla y orden desde la configuración pública. Las claves de `textos` añaden el contenido editorial de cada vista.

### `obras`: registro de proyectos

Cada obra es un elemento real del portafolio, no un texto de interfaz. Se vincula con un servicio para que filtros, listados y galerías usen la misma clasificación. El modelo conserva título, descripción, imagen y video; incorpora ubicación y año como opcionales porque la nueva interfaz propone mostrarlos. Solo se llenarán con información verificada.

Se mantiene la lógica de cinco posiciones destacadas por servicio. En la tabla nueva se representa con `destacado_slot` nullable (1–5). Una restricción única compuesta por `servicio_id` y `destacado_slot` evita duplicar posiciones dentro del mismo servicio y permite que cada servicio tenga su propio slot 1, 2, etc. Las obras sin posición tienen `destacado_slot = NULL`. Ya no se necesita `orden`: la galería muestra primero los slots 1–5 y después las obras sin slot por `fecha_creacion DESC`, como sucede hoy con `orden=0`. Tampoco se añade `publicado`, porque el flujo actual no incluye borradores ni publicaciones diferidas.

Los títulos, ubicaciones y años incluidos en el inventario UI son ejemplos de contenido y no deben insertarse como proyectos reales hasta que el artista los confirme y existan imágenes correspondientes. La migración no debe inventar ni asociar fotografías por semejanza de nombres.

#### Contrato de lectura y movimiento de slots

La consulta pública y la lista administrativa mantienen el orden funcional: primero las obras con `destacado_slot` 1–5 en orden ascendente; después las obras sin slot por `fecha_creacion DESC`, con `id` como desempate estable. El filtro de «posiciones destacadas» devuelve únicamente `destacado_slot IS NOT NULL`. Un slot vacío se dibuja como vacío; no se fabrican registros para representarlo.

- **Insertar en un slot:** liberar primero el slot 5 si está ocupado; mover de mayor a menor los ocupantes desde el slot anterior al destino; asignar el slot elegido a la obra nueva o previamente sin slot. La obra desplazada del slot 5 queda sin slot y vuelve al almacén cronológico.
- **Quitar o borrar una obra destacada:** liberar su slot; mover el siguiente ocupante al hueco disponible y repetir en orden ascendente. Los slots que ya estaban vacíos se saltan. Al terminar, colocar en el último hueco a la obra sin slot más reciente, si existe.
- **Mover entre slots del mismo servicio:** liberar temporalmente la obra, desplazar solo el intervalo afectado en dirección que mantenga siempre un hueco y asignarle el nuevo slot. No se promociona una obra del almacén durante un movimiento entre slots.
- **Cambiar de servicio:** liberar y compactar/promocionar en el servicio de origen; actualizar `servicio_id` con la obra sin slot; insertarla en un slot del destino solo si el administrador eligió uno. El número anterior no se hereda automáticamente en el otro servicio.

Las escrituras relacionadas deben ejecutarse como una operación atómica. El índice único se verifica durante cada sentencia, por lo que un `UPDATE` masivo que renumera todos los slots puede fallar aunque el estado final parezca válido. El Worker debe mover los registros usando primero el hueco y luego actualizaciones individuales en el orden indicado. Ante una colisión concurrente, la operación completa falla y se puede reintentar sin dejar posiciones duplicadas. La migración comprobará y reparará datos actuales que ya tengan slots duplicados o huecos antes de crear el índice.

El antiguo `destacado` booleano no determina una posición y no se conserva como segundo mecanismo de selección. Antes de migrar se comprobará si algún consumidor activo depende de él; la nueva galería usará los slots como fuente de sus cuatro miniaturas destacadas, según la regla de selección que se concrete para la vista.

### `logos`: identidad visual administrable

Se conserva una tabla de logos porque el panel necesita almacenar varias versiones y seleccionar la que el Hero debe presentar. La tabla guarda metadatos y la clave de R2; el archivo binario permanece en R2. El panel conserva el apartado editable de logos. Un índice único parcial sobre `activo = 1` garantiza como máximo un logo activo; se permite ninguno, como en el flujo actual. Al crear un logo que se quiere activar, se inserta primero con `activo = 0` y después se desactiva el anterior y se activa el nuevo en una transacción. `logos` no requiere una relación con `servicios` ni con `obras`.

### `imagenes_sitio`: fotografías de espacios fijos del sitio

La fotografía de Sobre nosotros (`about.photo`), el retrato del artista en las tarjetas de perfil (`profile.photo`) y las portadas de los seis servicios (`service.<id>.cover`) se podrán reemplazar desde Admin. `imagenes_sitio` solo acepta estas claves fijas y guarda la clave de cada objeto en R2. El panel no agrega ni elimina espacios de imagen; reemplaza la asignación de un espacio predefinido. Si `profile.photo` todavía no tiene imagen, la interfaz conserva el monograma `AR` como respaldo. Cada portada de servicio aparece en su tarjeta del dock; la imagen estática configurada en el Front se conserva como respaldo y para la galería vacía. La selección de obras y su navegación no se altera. El archivo binario queda en R2.

El flujo deberá subir y validar primero la imagen nueva, actualizar la clave en D1 y limpiar luego el objeto anterior solo si se confirma que ya no está referenciado. El texto alternativo de las fotografías todavía debe definirse; no se incluye entre los campos editables confirmados.

## 6. Dónde cae cada grupo del inventario de textos

| Grupo del inventario | Destino propuesto |
|---|---|
| Marca y navegación | Nombre de organización, artista, monograma, navegación y botones quedan fijos en la aplicación. |
| Inicio | Títulos, subtítulos y descripciones autorizados en `textos`; valores funcionales quedan configurados por el producto. |
| Perfil del artista | La frase y especialidades pueden ir en `textos` como subtítulo/descripción; cargo, nombre y fallback AR quedan fijos o derivan de la configuración de marca. |
| Servicios | La tabla D1 `servicios` contiene los IDs fijos para relacionar obras. Nombres, números, plantilla y orden provienen de `Front/src/config/servicios.ts`; Admin no los modifica. Títulos editoriales, subtítulos/lemas y descripciones autorizados usan claves de `textos`. |
| Archivo | Títulos, subtítulos e introducción autorizados en `textos`; filtros derivan de servicios y quedan fijos; «Todas» queda fijo. |
| Fichas de obra | `obras`; título, ubicación, año y servicio pertenecen al proyecto. Ubicación y año son opcionales y requieren verificación. |
| Sobre nosotros | Títulos, subtítulos y descripción autorizados en `textos`; las estadísticas y el texto del enlace se mantienen fijos salvo aprobación explícita. La foto reemplazable usa `about.photo`; el retrato de las tarjetas de perfil usa `profile.photo`, ambos en `imagenes_sitio`. |
| Contacto | Títulos, subtítulos y descripciones autorizados en `textos`; teléfono, correo, ubicación y URLs permanecen en configuración fija. Botones y nombres de secciones quedan fijos. |
| Cotizador | Botones, pasos, opciones y nombres/etiquetas de campos quedan fijos; no forman parte de las claves editables. |
| WhatsApp, lightbox y accesibilidad | Solo los textos autorizados se editan en `textos`; botones, aria labels y comportamiento quedan fijos en esta fase. |

Los valores de `navigation.items`, `archive.filters`, `quote.steps`, `environmentOptions`, `socialItems` y `message.fields` no se guardarán como una cadena separada por punto y coma. Los nombres de secciones/navegación, botones y campos del cotizador permanecen definidos por el contrato del producto. No se añade una tabla de colecciones porque Admin no podrá agregar, quitar ni reordenar esos elementos.

## 7. Relación y reglas principales

```text
servicios 1 ─────── N obras
logos       independiente
textos      independiente, indexado por clave estable
imagenes_sitio espacios de imagen fijos e independientes
```

- `obras.servicio_id` debe apuntar a un `servicios.id` existente.
- No existe un endpoint de Admin para crear, borrar, renombrar, desactivar o reordenar servicios. La clave foránea usa `ON DELETE RESTRICT`, sin borrado en cascada de obras.
- El orden comercial del dock vive en la configuración pública; el orden de obras se determina por `destacado_slot` y `fecha_creacion`, sin columna `orden` adicional.
- `destacado_slot` identifica una posición del 1 al 5 por servicio; `NULL` significa que la obra está en el almacén cronológico.
- El sistema mantendrá en aplicación una lista/validación de claves de textos editables. D1 no tiene que conocer el catálogo completo de claves para aplicar la tabla.
- Los cambios de textos no deben modificar IDs de servicio ni datos de clasificación.
- Las claves de R2 son referencias, no URLs públicas; el Worker continúa resolviendo URLs de lectura de acuerdo con la configuración de entorno.
- La API de Admin no ofrece creación ni eliminación de claves de `textos`; solo actualiza valores predefinidos y rechaza valores vacíos o compuestos por espacios. La base debe añadir una restricción `CHECK` para la cadena vacía como defensa adicional.
- Admin no gestiona nombres, altas/bajas ni orden de servicios; tampoco modifica botones, nombres de secciones o campos del cotizador.
- `imagenes_sitio` permite reemplazar archivos de los espacios fijos `about.photo` y `profile.photo`, no crear espacios arbitrarios.

## 8. Límites y decisiones deliberadas

Esta propuesta no crea tablas para páginas, secciones, bloques, campos de cotizador, redes sociales o estadísticas. Esos elementos tienen estructura fija; los textos autorizados caben en `textos`, mientras sus identificadores y comportamiento pertenecen al Front. Las estadísticas excluidas de la edición quedan en configuración fija. Crear tablas adicionales solo se justifica si se aprueba administrar su existencia, cantidad u orden.

La tabla `textos` es un diccionario limitado a cadenas editables, no un reemplazo de todas las tablas de dominio ni un CMS genérico. No debe almacenar arrays codificados, HTML arbitrario, lógica de navegación, secretos, URLs de API ni configuración de infraestructura.

La propuesta supone un solo idioma, español. Si se aprueba soporte multilingüe, se añadirá una dimensión de idioma a los textos y se definirán reglas de fallback antes de cargar traducciones.

## 9. Diferencias respecto al esquema actual

| Actual | Propuesta | Cambio lógico |
|---|---|---|
| `obras.categoria` como texto | `obras.servicio_id` con FK a `servicios.id` | Clasificación referencial y catálogo controlado de servicios. |
| No existe tabla de textos | `textos` | Los textos de interfaz se pueden editar en Admin. |
| Los servicios están en configuración del Front | `servicios` guarda solo los seis IDs como tabla de referencia | Nombres, orden y plantilla siguen en la configuración pública; la semilla D1 debe coincidir con el contrato compartido. |
| `obras.orden` representa slots 1–5 y almacén 0 | `destacado_slot` 1–5 o `NULL` | Conserva cinco posiciones por servicio y la cola cronológica sin duplicar el significado de orden. |
| `obras` no tiene ubicación/año | Campos opcionales `ubicacion` y `anio` | Permite los metadatos visuales propuestos cuando se verifiquen. |
| No hay configuración de foto para espacios fijos | `imagenes_sitio` con fotos editoriales y seis claves `service.<id>.cover` | Permite reemplazar las fotos de Sobre nosotros, Perfil y las portadas del dock con referencias a R2; las rutas del Front son respaldo. |
| Existe `logos` con biblioteca y activo | Se mantiene `logos` en el nuevo modelo lógico | Su papel de catálogo de archivos de marca permanece explícito. |

«No reutilizar el esquema actual» significa que el modelo destino se diseña con estas entidades y relaciones nuevas; no obliga a perder contenido. Si se aprueba la propuesta, se puede crear un esquema nuevo y migrar datos con reglas comprobables. La decisión de conservar, transformar o descartar cada registro se toma antes de ejecutar la migración.

## 10. Implementación local y posible migración

Una transición segura requeriría:

1. Aprobar campos y reglas del modelo, incluyendo relación de obras con servicios, como máximo un logo activo y tratamiento de slots.
2. Confirmar el inventario de textos y las claves que el panel permitirá editar. Validar número, perfiles sociales y contenido biográfico.
3. Crear una D1 local nueva con el esquema destino y cargar fixtures sintéticos, sin tocar producción. Adaptar el catálogo público de servicios para incorporar los IDs y el orden acordados; comprobar que coincidan exactamente con la semilla D1 y el contrato compartido. **Esta fase ya se implementó en la rama `feature/rediseno-integral`, solo en local.**
4. Preparar un importador de datos actuales a tablas nuevas. Mapear cada categoría actual al ID estable del servicio; convertir `orden` 1–5 en `destacado_slot` y `orden=0` en `NULL`; detectar valores inesperados, duplicados y huecos antes de crear la restricción única. Auditar el uso del booleano anterior `destacado`.
5. Actualizar Worker/API, tipos, panel y público de forma coordinada. El nuevo contrato usará `servicio_id` y `destacado_slot`; los consumidores que todavía envíen `categoria` u `orden` deberán migrarse antes de retirar el contrato anterior. Comprobar lectura, edición, filtros, destacadas, logo activo y carga de textos.
6. Comparar cantidades, claves R2 y resultados de consultas entre el origen y destino. Respaldar antes de cualquier migración remota y definir reversión.
7. Solo después de revisión y autorización específica, aplicar cambios al entorno productivo.

El esquema, los endpoints y los formularios de edición se implementaron y probaron contra D1/R2 locales en la rama `feature/rediseno-integral`. No se ejecutó migración de datos productivos ni se cambió D1, R2, Pages, Workers o configuración de Cloudflare en producción. La posible migración remota sigue pendiente de revisión, respaldo, plan de reversión y autorización específica.

Las restricciones SQL se probaron en la D1 local: claves foráneas a los seis servicios fijos, slots 1–5 únicos por servicio con múltiples `NULL`, exclusión de un segundo logo activo y rechazo de textos vacíos. También se comprobó la desactivación del logo anterior antes de activar otro. La prueba integral local cubre Worker/API, CRUD, edición de textos, foto de Sobre nosotros, navegación SPA, filtros, lightbox y cotizador; no valida aún una migración productiva ni el comportamiento de Cloudflare remoto.

## 11. Decisiones confirmadas y pendientes

### Decisiones confirmadas

- Admin solo edita valores de claves ya definidas; no puede crear, eliminar ni dejar un texto en blanco.
- La lista editable concreta acordada es:
  - Inicio: `home.eyebrow`, `home.title`, `home.titleAccent`, `home.subtitle`.
  - Perfil: `profile.tagline` y `profile.specialties` como subtítulo/descripción.
  - Servicios: para cada ID estable (`mural`, `escultura`, `cuadro`, `restauracion`, `logo`, `fachada`), se pueden editar lema/subtítulo y descripción. El título solo se habilita si es un título editorial distinto del nombre comercial; en los valores actuales el título repite el nombre y queda fijo. `titleAccent` se edita únicamente con validación de pertenencia al título.
  - Archivo: `archive.eyebrow`, `archive.title`, `archive.titleAccent`, `archive.subtitle`.
  - Sobre nosotros: `about.photoCaption`, `about.eyebrow`, `about.title`, `about.titleAccent`, `about.description`.
  - Contacto: `contact.eyebrow`, `contact.title`, `contact.description`.
- Son fijos `brand.organization`, `brand.artist`, `brand.monogram`, `profile.role`, `profile.name`, `profile.avatarFallback`, nombres de servicios, nombres de secciones/navegación, botones y nombres/etiquetas de campos del cotizador. El nombre del artista del perfil se deriva de la configuración de marca; no se mantiene como texto editable duplicado.
- No se han identificado claves concretas para etiquetas de campos editables fuera del cotizador. Si se necesita esa edición, se añadirán a la allowlist antes de implementar el formulario; no se permitirán claves abiertas.
- Las estadísticas, enlaces/etiquetas de contacto y datos de contacto no están en la lista editable actual. Los textos iniciales permanecen genéricos hasta confirmar contenido final.
- El catálogo tiene seis servicios fijos. Admin no puede agregar, quitar, reordenar ni renombrarlos. `Front/src/config/servicios.ts` mantiene la presentación y D1 solo materializa los IDs para la relación con obras.
- Cada obra pertenece a un único servicio y se conserva la lógica de cinco posiciones destacadas por servicio.
- La fotografía de Sobre nosotros y el retrato de las tarjetas de perfil se pueden reemplazar desde Admin mediante los espacios fijos `about.photo` y `profile.photo`.
- Se conserva el apartado editable de logos y la selección de logo activo.

### Detalles pendientes que no bloquean el modelo

- Verificar biografía, cifras, ubicaciones, años, correo y URLs sociales antes de cargarlos como datos reales.
- Definir el texto alternativo de la foto de Sobre nosotros; no forma parte de las claves editables acordadas.
- Confirmar qué imágenes de servicio serán oficiales antes de sustituir los fixtures visuales.
- Resolver la discrepancia del documento histórico `03-modelo-de-datos-y-api.md`, que describe `precios` y `testimonios` como futuras mientras el esquema actual no las incluye.
- Confirmar con el artista los textos genéricos y los valores iniciales de la allowlist antes de publicarlos como definitivos.

## 12. Relación con los documentos del proyecto

- `10-plan-refactorizacion-arquitectura.md`, sección 18: especificación del flujo público, categorías, contenido UI/UX, carga de galerías y datos por confirmar.
- `03-modelo-de-datos-y-api.md`: describe el contrato histórico; debe actualizarse antes de considerar documentado el modelo nuevo para producción.
- `arquitectura-slots.md` y `requisitos-slots.md`: describen el comportamiento existente de cinco posiciones por categoría, conservado mediante `destacado_slot` en el modelo destino.
