📄 DOCUMENTO 3: Impacto del Diseño Actual y Solicitud de Estado Front/Back
Archivo sugerido: docs/admin/03-impacto-y-estado-actual.md
Propósito: Documentar cómo el diseño actual del frontend y backend afecta la integración del nuevo agregado, y solicitar el estado actual de cada punto para planificar la refactorización.

1. Contexto
El Eje 1 (sección de Logos) no se puede implementar sin antes entender qué partes del frontend y backend actual necesitan modificarse. Este documento identifica cada punto de impacto y solicita el estado actual del código para planificar los cambios.

2. Puntos de Impacto en el Frontend
2.1 src/pages/admin/index.astro
Impacto: Debe pasar de 3 vistas a 5 vistas. La función renderVista() debe manejar los nuevos casos.
Estado solicitado:

¿Cuál es el contenido actual completo de index.astro?

¿La función renderVista() usa un switch o condicionales if/else?

2.2 src/layouts/LayoutBase.astro
Impacto: El header del admin actualmente es el mismo que el de la página pública. Con la nueva sección, debe ser exclusivo del admin.
Estado solicitado:

¿Cuál es el contenido actual completo de LayoutBase.astro?

¿El header se genera dinámicamente o está hardcodeado?

¿Existe alguna prop para diferenciar el modo admin del modo público?

2.3 src/components/admin/Dashboard.astro
Impacto: Debe renombrarse a DashboardObras.astro o adaptarse para convivir con DashboardLogos.astro. Además, debe añadirse paginación.
Estado solicitado:

¿Cuál es el contenido actual completo de Dashboard.astro?

¿Cómo se cargan las obras actualmente? (fetch a /api/obras)

¿Existe algún patrón de paginación ya implementado en la galería pública que podamos reutilizar?

2.4 src/components/admin/FormularioObra.astro
Impacto: Debe adaptarse al nuevo sistema de diseño (header del admin, contenedor centrado, etc.). Además, debe permitir edición (precargar datos).
Estado solicitado:

¿Cuál es el contenido actual completo de FormularioObra.astro?

¿Cómo maneja actualmente el estado del formulario?

¿Tiene alguna lógica de edición o solo de creación?

2.5 src/i18n/es.ts
Impacto: El texto del Hero se mantiene hardcodeado aquí. No se modifica en el Eje 1, pero hay que confirmar que no haya dependencias ocultas.
Estado solicitado:

¿Cuál es el contenido actual de es.ts en la sección del Hero?

¿Hay algún texto que dependa de la obra destacada?

2.6 src/components/Hero.astro (o similar)
Impacto: Debe modificarse para mostrar el logo activo en lugar de la obra destacada.
Estado solicitado:

¿Cuál es el nombre exacto del componente del Hero?

¿Cuál es su contenido actual completo?

¿Cómo se obtiene actualmente la obra destacada? (fetch a /api/obras?destacado=1)

3. Puntos de Impacto en el Backend
3.1 Back/src/index.ts
Impacto: Deben añadirse los nuevos endpoints de logos.
Estado solicitado:

¿Cuál es el contenido actual completo de index.ts?

¿Cómo se estructuran los handlers actuales? (ej. handlers/obras.ts)

¿Existe un patrón para validar payloads?

3.2 Back/schema.sql
Impacto: Debe añadirse la tabla logos.
Estado solicitado:

¿Cuál es el contenido actual completo de schema.sql?

¿Hay migraciones aplicadas o solo el schema base?

3.3 Back/src/handlers/obras.ts
Impacto: Sirve como referencia para crear handlers/logos.ts. Debemos entender cómo se maneja la subida a R2, la generación de UUIDs, y el borrado de imágenes.
Estado solicitado:

¿Cuál es el contenido actual completo de handlers/obras.ts?

¿Cómo se genera el uploadUrl firmado de R2?

¿Cómo se elimina una imagen de R2 actualmente? (¿Existe esa lógica?)

3.4 Back/src/lib/
Impacto: Puede haber utilidades reutilizables (ej. generación de UUIDs, sanitización, rate limiting).
Estado solicitado:

¿Qué archivos hay en Back/src/lib/?

¿Cuál es el contenido de cada uno?

3.5 Back/wrangler.toml (o similar)
Impacto: Debe confirmarse que el bucket R2 y la base D1 están configurados correctamente.
Estado solicitado:

¿Cuál es el contenido actual de wrangler.toml?

¿El bucket R2 tiene algún prefijo o estructura de carpetas definida?

4. Puntos de Impacto en el Diseño Visual
4.1 Sistema de Diseño
Impacto: El nuevo agregado debe respetar el sistema de diseño existente (colores, tipografías, espaciados).
Estado solicitado:

¿Existe un archivo de tokens de diseño (tokens.ts, variables.css, etc.)?

¿Cuáles son las variables CSS actuales? (--color-primario, --font-display, etc.)

4.2 Coherencia con el Mockup
Impacto: El mockup generado por Builder.io debe implementarse fielmente en el código.
Estado solicitado:

¿Hay algún framework de CSS en uso? (Tailwind, CSS puro, etc.)

¿Hay componentes reutilizables existentes que podamos usar? (botones, inputs, tarjetas)

5. Solicitud de Estado Actual
Para planificar la implementación, se solicita al equipo (o a la IA del IDE) que proporcione el estado actual de los siguientes archivos:

#	Archivo	Prioridad	Propósito
1	src/pages/admin/index.astro	Alta	Entender la SPA actual
2	src/layouts/LayoutBase.astro	Alta	Entender el header actual
3	src/components/admin/Dashboard.astro	Alta	Referencia para el nuevo dashboard
4	src/components/admin/FormularioObra.astro	Alta	Referencia para el nuevo formulario
5	src/components/Hero.astro (o similar)	Alta	Modificar para mostrar el logo
6	src/i18n/es.ts	Media	Confirmar textos hardcodeados
7	Back/src/index.ts	Alta	Añadir endpoints de logos
8	Back/schema.sql	Alta	Añadir tabla logos
9	Back/src/handlers/obras.ts	Alta	Referencia para handlers/logos.ts
10	Back/src/lib/ (todos)	Media	Reutilizar utilidades
11	Back/wrangler.toml	Media	Confirmar configuración de R2/D1
12	src/styles/tokens.css (o similar)	Media	Confirmar variables de diseño
Formato de respuesta esperado: Para cada archivo, se solicita el contenido completo o un resumen funcional que permita entender:

Qué hace.

Cómo se conecta con otros archivos.

Qué dependencias tiene.

Qué partes necesitan modificarse para el Eje 1.

6. Siguientes Pasos
Recopilar el estado actual de los 12 archivos solicitados.

Identificar qué partes se pueden reutilizar y cuáles deben refactorizarse.

Redactar el plan de implementación del Eje 1 (orden de cambios, dependencias, riesgos).

Una vez implementado el Eje 1, pasar al Eje 2 (edición, orden visual, etc.).