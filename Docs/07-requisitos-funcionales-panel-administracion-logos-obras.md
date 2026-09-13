 DOCUMENTO 2: Requisitos Funcionales — Sección de Logos (Eje 1)
Archivo sugerido: docs/admin/02-requisitos-logos.md
Propósito: Definir cada requisito funcional del nuevo agregado (sección de Logos), con su diseño visual asociado.

1. Modelo de Datos
1.1 Nueva tabla en D1: logos
sql
CREATE TABLE IF NOT EXISTS logos (
  id              TEXT    PRIMARY KEY,
  nombre          TEXT    NOT NULL,
  imagen_key      TEXT    NOT NULL,
  activo          INTEGER NOT NULL DEFAULT 0,
  fecha_creacion  TEXT    NOT NULL,
  fecha_actualizacion TEXT
);

CREATE INDEX IF NOT EXISTS idx_logos_activo ON logos(activo);
Campos:

Campo	Tipo	Descripción
id	TEXT	UUID generado por el Worker
nombre	TEXT	Nombre descriptivo (ej. "Logo Principal 2026")
imagen_key	TEXT	Referencia al archivo en R2 (ej. logos/abc123.webp)
activo	INTEGER	0 = inactivo, 1 = activo. Solo un logo puede estar activo.
fecha_creacion	TEXT	ISO 8601
fecha_actualizacion	TEXT	ISO 8601, se actualiza al editar o activar
1.2 Almacenamiento en R2
Prefijo: logos/ para separar de obras/.

Formato: WebP (mismo flujo de sanitización que las obras).

Nomenclatura: logos/{uuid}/{timestamp}-{nombre-sanitizado}.{extension}, igual patrón que la tabla obras.

2. Requisitos Funcionales
RF-01: Subir un nuevo logo
Descripción: El administrador puede subir un nuevo logo al sistema.
Diseño asociado: Formulario vista-formulario-logo.
Campos:

Nombre del logo (input text, requerido).

Imagen del logo (input file, requerido, acepta PNG/JPG/WebP).

Toggle "Activar este logo al guardar" (desactivado por defecto).

Comportamiento:

El frontend sanitiza la imagen (redimensiona si es necesario, convierte a WebP, elimina metadatos).

El frontend llama a POST /api/logos/upload-url para obtener la URL firmada de R2 y la imagenKey.

El frontend sube la imagen directamente a R2 con un PUT.

El frontend llama a POST /api/logos con { nombre, imagenKey, activo }.

El Worker inserta la fila en D1. Si activo = 1, desactiva todos los demás logos.

El frontend vuelve a vista-dashboard-logos y recarga la lista.

Estado por defecto: El logo se sube inactivo (activo = 0) a menos que el usuario active el toggle.

RF-02: Listar logos en el almacén
Descripción: El administrador puede ver todos los logos subidos, paginados.
Diseño asociado: vista-dashboard-logos, bloque "Almacén de Logos".
Comportamiento:

La lista muestra 10 logos por página.

Cada tarjeta muestra: miniatura del logo, nombre, estado (ACTIVO / INACTIVO), botones de acción.

Paginación numérica en la parte inferior: ← 1 2 3 ... 10 →.

RF-03: Mostrar el logo activo destacado
Descripción: En la parte superior del almacén, se muestra el logo actualmente activo.
Diseño asociado: vista-dashboard-logos, bloque "Logo Activo".
Comportamiento:

Se consulta GET /api/logos?activo=1 (o similar) para obtener el logo activo.

Si no hay logo activo, se muestra la imagen default (public/logo-default.png o similar) con un mensaje "No hay logo activo".

RF-04: Activar un logo
Descripción: El administrador puede activar un logo del almacén.
Diseño asociado: Botón "Activar" en cada tarjeta de logo inactivo.
Comportamiento:

El frontend llama a PUT /api/logos/:id/activar.

El Worker ejecuta una transacción:

UPDATE logos SET activo = 0 (todos).

UPDATE logos SET activo = 1, fecha_actualizacion = ? WHERE id = ?.

El frontend recarga la lista y actualiza el bloque "Logo Activo".

RF-05: Editar un logo
Descripción: El administrador puede editar el nombre, la imagen o el estado de un logo.
Diseño asociado: Formulario vista-formulario-logo precargado con los datos del logo.
Comportamiento:

El frontend carga los datos del logo (GET /api/logos/:id).

El formulario se precarga con el nombre actual y la previsualización de la imagen.

Si el usuario reemplaza la imagen:

Se sube la nueva imagen a R2.

Se actualiza la imagen_key en D1.

Se elimina la imagen antigua de R2.

Si el usuario activa el toggle:

Se desactivan todos los demás logos.

Se activa el logo editado.

Al guardar, el frontend vuelve al dashboard y recarga la lista.

RF-06: Eliminar un logo
Descripción: El administrador puede eliminar un logo del almacén.
Diseño asociado: Botón "Eliminar" en cada tarjeta de logo.
Comportamiento:

Se muestra un modal de confirmación: "¿Estás seguro de que deseas eliminar este logo? Esta acción no se puede deshacer."

Si el usuario confirma:

El Worker elimina la fila de D1.

El Worker elimina la imagen de R2.

Si el logo eliminado era el activo, el Hero muestra la imagen default.

El frontend recarga la lista.

RF-07: El Hero muestra el logo activo
Descripción: La página principal muestra el logo activo en la sección Hero.
Diseño asociado: Hero.astro (modificado).
Comportamiento:

Al cargar la página, se consulta GET /api/logos?activo=1.

Si hay un logo activo, se muestra su imagen en el Hero (al costado del texto, manteniendo el layout actual).

Si no hay logo activo, se muestra la imagen default.

El texto del Hero se mantiene hardcodeado en i18n/es.ts (no es editable desde el admin en esta versión).

RF-08: Paginación en ambas listas
Descripción: Las listas de obras y logos usan paginación numérica.
Diseño asociado: Componente de paginación reutilizable en la parte inferior de cada dashboard.
Comportamiento:

10 ítems por página.

Controles: ← Anterior, números de página, Siguiente →.

La paginación NO aparece en los formularios.

3. Endpoints Nuevos en el Worker
Método	Ruta	Descripción
GET	/api/logos	Lista paginada de logos (?page=1&limit=10)
GET	/api/logos/:id	Obtiene un logo por ID
GET	/api/logos?activo=1	Obtiene el logo activo
POST	/api/logos/upload-url	Genera URL firmada para subir imagen a R2
POST	/api/logos	Crea un nuevo logo
PUT	/api/logos/:id	Actualiza un logo (nombre, imagen, activo)
PUT	/api/logos/:id/activar	Activa un logo y desactiva los demás
DELETE	/api/logos/:id	Elimina un logo (D1 + R2)
4. Diseño Visual (Referencia al Mockup)
4.1 Dashboard de Logos
Bloque superior: "Logo Activo" con contenedor centrado, borde discontinuo, imagen del logo, etiqueta "ACTIVO DESDE: [fecha]".

Bloque inferior: "Almacén de Logos" con grid de 3 columnas, tarjetas con miniatura, nombre, estado y botones.

Paginación: Barra inferior con números.

4.2 Formulario de Logo
Header del admin: Común a todas las vistas (excepto login).

Título: "Subir Nuevo Logo" / "Editar Logo".

Campos: Nombre, Imagen (zona de arrastre), Toggle de activación.

Botones: "Cancelar" y "Guardar Logo".

5. Requisitos No Funcionales
Requisito	Descripción
RNF-01	El sistema debe soportar hasta 50 logos sin degradación de velocidad (gracias al índice en activo y la paginación).
RNF-02	La sanitización de imágenes debe ocurrir en el navegador antes de subir a R2.
RNF-03	El borrado de un logo debe eliminar tanto el registro en D1 como la imagen en R2.
RNF-04	Solo un logo puede estar activo a la vez (garantizado por transacción en D1).