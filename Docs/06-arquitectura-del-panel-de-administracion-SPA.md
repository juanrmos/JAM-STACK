📄 DOCUMENTO 1: Arquitectura del Panel de Administración (SPA)
Archivo sugerido: docs/admin/01-arquitectura-spa.md
Propósito: Documentar el patrón arquitectónico actual del panel de administración, declarar la forma de trabajo, y describir las implicaciones de extenderlo con la nueva sección de Logos.

1. Naturaleza del Panel
El panel de administración no es un conjunto de páginas independientes que se recargan al navegar. Es una Single Page Application (SPA) rudimentaria que intercambia vistas mediante JavaScript dentro de un único archivo src/pages/admin/index.astro.

Características clave:

No se recarga la página al cambiar de vista.

No se usan modales superpuestos.

Cada vista es un contenedor <div> oculto por defecto (display: none) que se activa con display: block cuando corresponde.

La navegación entre vistas se controla con la función global window.navegarAdmin(vista).

2. Vistas Actuales (Estado en Producción)
Vista	ID del contenedor	Contenido	Componente
Login	vista-login	Formulario de acceso con secreto de administrador	Login.astro
Dashboard de Obras	vista-dashboard	Lista de obras con miniatura, título, categoría y orden	Dashboard.astro
Formulario de Obra	vista-formulario	Formulario de subida de nueva obra	FormularioObra.astro
Flujo de navegación actual:

Al cargar /admin, la función arrancar() revisa si hay un token en localStorage.

Si hay token → muestra vista-dashboard y lanza el evento admin:load-dashboard.

Si no hay token → muestra vista-login.

Al hacer clic en "+ Nueva Obra" → window.navegarAdmin('formulario') oculta el dashboard y muestra el formulario.

Al guardar o cancelar → window.navegarAdmin('dashboard') oculta el formulario y muestra el dashboard, lanzando de nuevo el evento admin:load-dashboard.

3. Vistas Nuevas (Eje 1 — Logos)
Con la incorporación de la sección de Logos, el panel pasa de 3 vistas a 5 vistas:

Vista	ID del contenedor	Contenido	Componente nuevo
Login	vista-login	(sin cambios)	Login.astro
Dashboard de Obras	vista-dashboard-obras	(renombrado)	Dashboard.astro
Dashboard de Logos	vista-dashboard-logos	Logo activo arriba + almacén de logos abajo	DashboardLogos.astro
Formulario de Obra	vista-formulario-obra	(renombrado)	FormularioObra.astro
Formulario de Logo	vista-formulario-logo	Formulario de subida/edición de logo	FormularioLogo.astro
4. Reglas de Navegación (Nuevas)
La función window.navegarAdmin(vista) debe aceptar los siguientes valores:

typescript
type VistaAdmin =
  | 'login'
  | 'dashboard-obras'
  | 'dashboard-logos'
  | 'formulario-obra'
  | 'formulario-logo';
El header del admin (título "Corporacion Antony Rodriguez" + "PANEL DE ADMINISTRACIÓN", pestañas OBRAS/LOGOS, botón Cerrar Sesión) es común a todas las vistas excepto vista-login.

Las pestañas OBRAS y LOGOS controlan la navegación entre vista-dashboard-obras y vista-dashboard-logos. La pestaña activa tiene un subrayado dorado de 2px.

Los formularios (vista-formulario-obra y vista-formulario-logo) son vistas completas que reemplazan al dashboard. No son modales, no son overlays, no se superponen.

Al guardar o cancelar en un formulario:

Se oculta el formulario.

Se muestra el dashboard correspondiente (obras o logos).

Se lanza un evento (admin:load-dashboard-obras o admin:load-dashboard-logos) para que el dashboard recargue los datos desde la API.

5. Implicaciones Técnicas del Cambio
5.1 Refactorización de index.astro
El archivo actual tiene 3 contenedores. Debe pasar a tener 5. Esto implica:

Añadir dos nuevos <div> ocultos: vista-dashboard-logos y vista-formulario-logo.

Renombrar vista-dashboard a vista-dashboard-obras y vista-formulario a vista-formulario-obra (o mantener los IDs actuales y mapear, pero es más limpio renombrar).

Actualizar la función renderVista() para manejar los 5 casos.

Actualizar la función arrancar() para que el estado inicial sea coherente (si hay token, mostrar dashboard-obras por defecto).

5.2 Header del Admin
Actualmente el header del admin es el mismo que el de la página pública (LayoutBase.astro). Con la nueva sección, el header del admin debe ser exclusivo del panel y no debe mostrar los enlaces públicos (INICIO, SERVICIOS, GALERÍA, COTIZAR). Debe mostrar:

Izquierda: "Corporacion Antony Rodriguez" + "PANEL DE ADMINISTRACIÓN".

Centro: Pestañas OBRAS / LOGOS.

Derecha: Botón "Cerrar Sesión".

Esto requiere un nuevo componente: AdminHeader.astro (o modificar LayoutBase.astro para que acepte una prop modoAdmin: boolean).

5.3 Paginación
Ambas listas (Dashboard.astro y DashboardLogos.astro) deben implementar paginación numérica de 10 ítems por página. La paginación NO aparece en los formularios, solo en las vistas de lista.

5.4 Eventos de Recarga
Se deben estandarizar los nombres de los eventos:

admin:load-dashboard-obras → para recargar la lista de obras.

admin:load-dashboard-logos → para recargar la lista de logos.

6. Decisiones Pendientes de Refactorización
Tema	Estado
Renombrar IDs de contenedores	Pendiente de decisión
Crear AdminHeader.astro o modificar LayoutBase.astro	Pendiente de decisión
Unificar la lógica de paginación en un componente reutilizable	Pendiente de decisión
Manejo de errores si una vista no existe	Pendiente de decisión
Nota: Esta refactorización no se incluye en el documento de requisitos funcionales del Eje 1. Se documenta aquí como decisión de arquitectura para la fase de desarrollo.
