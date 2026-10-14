1. Modelo de Datos
1.1 Tabla obras (modificada)


CREATE TABLE IF NOT EXISTS obras (
  id              TEXT    PRIMARY KEY,
  titulo          TEXT    NOT NULL,
  descripcion     TEXT,
  categoria       TEXT,    -- mural, fachada, cuadro, escultura, restauracion, logo
  imagen_key      TEXT    NOT NULL,
  video_url       TEXT,
  orden           INTEGER NOT NULL DEFAULT 0,  -- 0 = sin slot, 1-5 = slot
  destacado       INTEGER NOT NULL DEFAULT 0,  -- sin uso, candidato a limpieza
  fecha_creacion  TEXT    NOT NULL
);

-- Índice compuesto para optimizar consultas por categoría y orden
CREATE INDEX IF NOT EXISTS idx_obras_categoria_orden ON obras(categoria, orden);

-- Índice para búsqueda por título
CREATE INDEX IF NOT EXISTS idx_obras_titulo ON obras(titulo);

1.2 Migración inicial
Script para asignar orden a obras existentes:

-- Asignar orden 1-5 a las primeras 5 obras de cada categoría (por fecha DESC)
-- El resto queda con orden = 0
UPDATE obras
SET orden = (
  SELECT COUNT(*)
  FROM obras AS o2
  WHERE o2.categoria = obras.categoria
  AND o2.fecha_creacion >= obras.fecha_creacion
)
WHERE orden = 0;

Nota: Si D1 no soporta ROW_NUMBER(), se usa el COUNT(*) correlacionado. Si hay más de 5 obras por categoría, las que queden con orden > 5 deben pasarse a 0:

sql
UPDATE obras SET orden = 0 WHERE orden > 5;

2. Requisitos Funcionales
RF-01: Crear obra sin slot
Descripción: El administrador sube una obra sin seleccionar posición.
Diseño asociado: Formulario vista-formulario-obra, sección de slots sin selección.
Comportamiento:

El frontend envía orden: 0 (o no envía orden).

El backend inserta directamente la obra con orden = 0 para esa categoría.

Ejecuta:

INSERT INTO obras (..., orden = 0, ...)

No hay cálculo de posición ni desplazamiento (shift) de otras filas.

RF-02: Crear obra con slot X (1-5)
Descripción: El administrador sube una obra seleccionando una posición específica.
Diseño asociado: Formulario vista-formulario-obra, slot X seleccionado.
Comportamiento:

El frontend envía orden: X.

El backend ejecuta batch:

UPDATE obras SET orden = orden + 1 WHERE categoria = ? AND orden >= X

UPDATE obras SET orden = 0 WHERE categoria = ? AND orden > 5

INSERT INTO obras (..., orden = X, ...)

RF-03: Listar obras con filtros y búsqueda
Descripción: El administrador puede filtrar por categoría y buscar por título.
Diseño asociado: Dashboard vista-dashboard-obras, filtros + buscador.
Comportamiento:

Filtro por categoría: select con las 6 categorías. Por defecto: "Murales".

Búsqueda por título: input text con LIKE '%titulo%' COLLATE NOCASE.

Paginación: 10 por página, numérica.

El COUNT total respeta los filtros.

RF-04: Mostrar riel de 5 slots
Descripción: El Dashboard muestra el riel de 5 slots de la categoría filtrada.
Diseño asociado: Dashboard vista-dashboard-obras, bloque "Posiciones Destacadas".
Comportamiento:

Se consulta GET /api/obras?categoria=X&limit=5&orden=1-5.

Los slots ocupados muestran miniatura + botón "Editar".

Los slots vacíos muestran número en el centro.

Tap en slot ocupado abre el formulario de edición.

RF-05: Mostrar grilla de obras
Descripción: El Dashboard muestra la grilla de todas las obras de la categoría.
Diseño asociado: Dashboard vista-dashboard-obras, bloque "Todas las obras".
Comportamiento:

Grid de 5 columnas × 2 filas = 10 por página.

Incluye obras con slots 1-5 y obras con orden = 0.

Cada tarjeta: imagen, título, categoría, iconos editar/eliminar.

RF-06: Editar obra
Descripción: El administrador puede editar una obra existente.
Diseño asociado: Formulario vista-formulario-obra precargado.
Comportamiento:

Se carga GET /api/obras/:id.

El formulario se precarga con los datos actuales.

El slot actual se marca con fondo gris oscuro.

Si el usuario cambia el slot:

Si A < B: UPDATE orden - 1 WHERE orden > A AND orden <= B

Si A > B: UPDATE orden + 1 WHERE orden >= B AND orden < A

UPDATE obras SET orden = B WHERE id = ?

Si el usuario cambia la categoría:

Reindexar categoría origen.

Insertar en categoría destino con la lógica de RF-01 o RF-02.

RF-07: Eliminar obra
Descripción: El administrador puede eliminar una obra.
Diseño asociado: Botón eliminar en la grilla o en el slot.
Comportamiento:

Confirmación: "¿Estás seguro de que deseas eliminar esta obra?"

Si la obra ocupaba un slot (1-5):

DELETE FROM obras WHERE id = ?

UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > X AND orden <= 5

Buscar la obra más nueva con orden = 0 y asignarle orden = 5 (si existe).

Si la obra estaba en orden = 0:

Solo DELETE.

RF-08: Tap en slot del Dashboard
Descripción: Al hacer tap en un slot ocupado del Dashboard, se abre el formulario de edición de esa obra.
Diseño asociado: Slot con miniatura en el Dashboard.
Comportamiento:

window.navegarAdmin('formulario-obra') con el ID de la obra.

El formulario se precarga con los datos y el slot actual marcado.

RF-09: Eliminar desde la grilla
Descripción: Al eliminar una obra desde la grilla, si ocupaba un slot, el slot queda vacío y se reindexa (según RF-07).
Diseño asociado: Icono de papelera en cada tarjeta de la grilla.

RF-10: Paginación numérica
Descripción: Ambas listas (obras y logos) usan paginación numérica.
Diseño asociado: Componente Paginacion.astro.
Comportamiento:

10 ítems por página.

Controles: ← Anterior, números de página, Siguiente →.

Página activa con fondo dorado.

RF-11: Corrección del bug de la galería pública
Descripción: Las flechas < > de la galería pública deben funcionar.
Diseño asociado: Galeria.astro, riel de obras.
Comportamiento:

Cambiar riel.scrollBy(...) por document.querySelector('.galeria__riel-scroll').scrollBy(...).

Verificar que el contenedor tenga overflow-x: auto.

RF-12: Actualizar categorías en la galería pública
Descripción: Actualizar ordenDefecto y categoriasMap con las 6 categorías v3.
Diseño asociado: Galeria.astro.
Comportamiento:

javascript
const categoriasMap = {
  mural: "Murales",
  fachada: "Fachadas",
  cuadro: "Cuadros al Óleo",
  escultura: "Esculturas",
  restauracion: "Restauración",
  logo: "Diseños"
};
const ordenDefecto = ["mural", "fachada", "cuadro", "escultura", "restauracion", "logo"];
3. Endpoints Nuevos o Modificados
Método	Ruta	Descripción
GET	/api/obras?categoria=X&limit=10&offset=0&buscar=Y	Lista paginada con filtros
GET	/api/obras?categoria=X&limit=5&orden=1-5	Obtiene los 5 slots
POST	/api/obras	Crear (con lógica de slot)
PUT	/api/obras/:id	Actualizar (con lógica de slot)
DELETE	/api/obras/:id	Eliminar (con reindexación)
4. Requisitos No Funcionales
Requisito	Descripción
RNF-01	El sistema debe usar env.DB.batch() para todas las operaciones de reordenamiento.
RNF-02	El índice (categoria, orden) debe crearse para optimizar consultas.
RNF-03	La migración inicial debe ejecutarse una sola vez.
RNF-04	La búsqueda debe ser case-insensitive (COLLATE NOCASE).
RNF-05	La paginación debe respetar los filtros activos.
5. Diseño Visual (Referencia al Mockup de Builder.io)
5.1 Dashboard
Encabezado: título + botón "+ Nueva Obra".

Filtros: select + buscador.

Riel de slots: 5 recuadros horizontales (~180px).

Grilla: 5 columnas × 2 filas.

Paginación: numérica.

5.2 Formulario
Slots debajo de "Categoría" (~100px cada uno).

Slot actual: fondo gris oscuro (#4A4A4A).

Botones: "Cancelar" + "Guardar".