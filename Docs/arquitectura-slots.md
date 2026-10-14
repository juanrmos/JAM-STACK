1. Naturaleza del Panel
El panel de administración sigue siendo una Single Page Application (SPA) que intercambia vistas mediante JavaScript dentro de src/pages/admin/index.astro. No hay modales, no hay recargas de página.

1.1 Vistas actuales (post-implementación de Logos)
Vista	ID del contenedor	Componente
Login	vista-login	Login.astro
Dashboard de Obras	vista-dashboard-obras	Dashboard.astro (rediseñado)
Dashboard de Logos	vista-dashboard-logos	DashboardLogos.astro
Formulario de Obra	vista-formulario-obra	FormularioObra.astro (rediseñado)
Formulario de Logo	vista-formulario-logo	FormularioLogo.astro
1.2 Flujo de navegación
Login → Dashboard Obras → Formulario Obra (crear/editar)
                       → Dashboard Logos → Formulario Logo (crear/editar)

                       Reglas:

window.navegarAdmin(vista) controla qué vista se muestra.

El header del admin (AdminHeader.astro) es común a todas las vistas excepto login.

Las pestañas OBRAS y LOGOS cambian entre vista-dashboard-obras y vista-dashboard-logos.

Los formularios son vistas completas que reemplazan al dashboard.

Al guardar o cancelar, se vuelve al dashboard correspondiente y se lanza un evento para recargar los datos.

2. El Sistema de Slots
2.1 Concepto
Cada categoría tiene 5 slots de posicionamiento (orden = 1..5). Estos slots representan las primeras 5 posiciones destacadas en la galería pública. Las obras con orden = 0 van después de los destacados, ordenadas por fecha_creacion DESC.

Zona destacada (orden 1-5)     Zona cronológica (orden 0)
┌─────┬─────┬─────┬─────┬─────┐  ┌─────┬─────┬─────┬─────┐
│  1  │  2  │  3  │  4  │  5  │  │  6  │  7  │  8  │ ... │
└─────┴─────┴─────┴─────┴─────┘  └─────┴─────┴─────┴─────┘
   Seleccionables manualmente      Orden cronológico inverso

2.2 Categorías (v3, definitivas)
Código interno	Nombre visible	Orden galería
mural	Murales	1
fachada	Fachadas	2
cuadro	Cuadros al Óleo	3
escultura	Esculturas	4
restauracion	Restauración	5
logo	Diseños	6
Array final: ["mural", "fachada", "cuadro", "escultura", "restauracion", "logo"]

2.3 Aislamiento por categoría
Regla fundamental: Todo cálculo (WHERE categoria = ?) es siempre por categoría. Los slots de "mural" son independientes de los slots de "cuadro". Nunca se mezclan.

3. Dashboard Rediseñado
3.1 Estructura vertical

┌─────────────────────────────────────────────────────────────┐
│  "Tus Obras"                              [+ Nueva Obra]     │
├─────────────────────────────────────────────────────────────┤
│  [Filtro: Murales ▼]  [Buscador: Buscar por título...]      │
├─────────────────────────────────────────────────────────────┤
│  POSICIONES DESTACADAS                                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │
│  │  1  │ │  2  │ │  3  │ │  4  │ │  5  │                   │
│  │[img]│ │[img]│ │     │ │[img]│ │     │                   │
│  │[Edit]│ │[Edit]│ │     │ │[Edit]│ │     │                 │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                   │
├─────────────────────────────────────────────────────────────┤
│  TODAS LAS OBRAS DE ESTA CATEGORÍA                          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                        │
│  │    │ │    │ │    │ │    │ │    │                        │
│  └────┘ └────┘ └────┘ └────┘ └────┘                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                        │
│  │    │ │    │ │    │ │    │ │    │                        │
│  └────┘ └────┘ └────┘ └────┘ └────┘                        │
├─────────────────────────────────────────────────────────────┤
│              ← 1  2  3  ...  10 →                           │
└─────────────────────────────────────────────────────────────┘

3.2 Componentes
Bloque	Descripción
Encabezado	Título "Tus Obras" + Botón "+ Nueva Obra"
Filtros	Select de categoría (por defecto: Murales) + Input de búsqueda
Riel de slots	Fila horizontal de 5 slots. Ancho ~180px cada uno.
Grilla	5 columnas × 2 filas = 10 obras por página
Paginación	Numérica, 10 por página
3.3 Comportamiento del riel de slots
Los 5 slots caben horizontalmente en pantalla (en móvil: scroll horizontal).

Si un slot está ocupado: muestra miniatura + botón "Editar" (siempre visible).

Si un slot está vacío: fondo gris claro con número grande en el centro.

Tap en slot ocupado: Abre el formulario de edición de esa obra.

Tap en botón "Editar": Abre el formulario de edición de esa obra (misma acción).

3.4 Comportamiento de la grilla
Muestra todas las obras de la categoría (slots 1-5 + orden=0 juntas).

Cada tarjeta tiene: imagen cuadrada (escala de grises), título, categoría, iconos de editar/eliminar.

Click en icono editar: Abre el formulario de edición.

Click en icono eliminar: Confirmación + eliminación.

4. Formulario de Obra Rediseñado
4.1 Estructura vertical

┌─────────────────────────────────────────────────────────────┐
│  ← Volver a la lista                                        │
│  "Subir Nueva Obra" / "Editar Obra"                         │
│  Completa los datos para añadir una nueva pieza...          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Foto de la obra *                                  │   │
│  │  [Zona de arrastre]                                 │   │
│  │                                                     │   │
│  │  Título *                                           │   │
│  │  [Input text]                                       │   │
│  │                                                     │   │
│  │  Categoría *                                        │   │
│  │  [Select: Murales ▼]                                │   │
│  │                                                     │   │
│  │  POSICIÓN EN LA GALERÍA (OPCIONAL)                  │   │
│  │  Selecciona uno de los 5 primeros lugares...        │   │
│  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                │   │
│  │  │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │                │   │
│  │  │[img]│ │[img]│ │    │ │[img]│ │    │              │   │
│  │  └────┘ └────┘ └────┘ └────┘ └────┘                │   │
│  │                                                     │   │
│  │  Descripción técnica                                │   │
│  │  [Textarea]                                         │   │
│  │                                                     │   │
│  │  Video YouTube (opcional)                           │   │
│  │  [Input url]                                        │   │
│  │                                                     │   │
│  │                          [Cancelar]  [Guardar]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

4.2 Comportamiento de los slots en el formulario
Se cargan dinámicamente al seleccionar una categoría.

Son más pequeños que en el Dashboard (~100px).

Tap en slot: Selecciona esa posición (vibración + sombreado + mensaje de estado).

Slot actual (en edición): Fondo gris oscuro (#4A4A4A), sin texto.

Si no se selecciona slot: La obra va directamente a orden = 0.

5. Algoritmo de Reordenamiento
5.1 Casos de uso
#	Caso	Operación
1	Crear sin slot	INSERT con orden = 0 (sin shift)
2	Crear con slot X	shift orden >= X + INSERT en X
3	Editar sin cambiar slot	UPDATE campos
4	Editar cambiando slot (A→B)	Shift según A<B o A>B
5	Editar cambiando categoría	Reindexar origen + insertar en destino
6	Eliminar de slot X	DELETE + reindexar + rellenar con orden=0 más nueva
5.2 Pseudocódigo del caso 6 (eliminar de slot)
text
1. DELETE FROM obras WHERE id = ?
2. UPDATE obras SET orden = orden - 1 WHERE categoria = ? AND orden > X AND orden <= 5
3. SELECT id FROM obras WHERE categoria = ? AND orden = 0 ORDER BY fecha_creacion DESC LIMIT 1
4. Si existe, UPDATE obras SET orden = 5 WHERE id = ?

5.3 Transacción con env.DB.batch()
Todas las operaciones de reordenamiento usan env.DB.batch() para garantizar atomicidad. Si una sentencia falla, todas hacen rollback.

6. Backend
6.1 Cambios necesarios
Cambio	Detalle
ORDER BY	Cambiar de fecha_creacion DESC a orden ASC, fecha_creacion DESC
Zod	Modificar orden para permitir 0 como "sin slot"
Índice	Crear (categoria, orden) para optimizar
Migración	Asignar orden a obras existentes basado en fecha_creacion DESC por categoría
Búsqueda	LIKE '%titulo%' COLLATE NOCASE
6.2 Endpoints nuevos o modificados
Método	Ruta	Descripción
GET	/api/obras?categoria=X&limit=10&offset=0&buscar=Y	Lista paginada con filtros
GET	/api/obras?categoria=X&limit=5&orden=1-5	Obtiene los 5 slots de una categoría
POST	/api/obras	Crear (con lógica de slot)
PUT	/api/obras/:id	Actualizar (con lógica de slot)
DELETE	/api/obras/:id	Eliminar (con reindexación)
7. Galería Pública
7.1 Cambios necesarios
Cambio	Detalle
Bug de flechas	scrollBy debe aplicarse a .galeria__riel-scroll, no a .galeria__riel
Categorías	Actualizar ordenDefecto y categoriasMap con las 6 categorías v3
ORDER BY	Cambiar a orden ASC (consistente con backend)
Carga diferida	Se mantiene (5 obras iniciales por riel, más al hacer scroll)
7.2 Comportamiento esperado
Cada riel muestra las primeras 5 obras de la categoría (slots 1-5).

Al hacer scroll o clic en flecha, se cargan más obras (orden=0).

Las flechas funcionan correctamente.

8. Decisiones Cerradas
Aspecto	Decisión
Categorías	6: mural, fachada, cuadro, escultura, restauracion, logo
Slots	5 por categoría, aislados
Ubicación slots	Dashboard (riel) + Formulario (debajo de Categoría)
Selección	Tap, nunca drag-and-drop
Al elegir slot ocupado	Shift hacia abajo
Al eliminar slot	Reindexar + rellenar con orden=0 más nueva
Slot actual en edición	Fondo gris oscuro (#4A4A4A)
Tap en slot (Dashboard)	Abre formulario de edición
Botón "Editar" del slot	Siempre visible
Grilla	5 columnas × 2 filas = 10 por página
Filtros	Por categoría (default: mural) + buscador por título
Paginación	Numérica, 10 por página
Checkbox "Destacada"	Eliminado del HTML/JS, se queda en BD
Campo destacado	Candidato a limpieza futura