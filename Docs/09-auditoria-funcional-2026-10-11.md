# Auditoría funcional — 11 de octubre de 2026

**Dictamen:** hay una implementación sustancial del backend y de las interfaces, pero el estado local actual **no cumple todavía la aceptación funcional completa**. La carga inicial de los dos paneles está rota y existen defectos de edición, navegación de galería y mantenimiento de archivos. Compilar correctamente no equivale a completar los flujos de usuario.

## Alcance y evidencia

Se revisaron los doce documentos existentes en `Docs/`: `00` a `08`, `arquitectura-slots.md`, `requisitos-slots.md` e `impacto-archivos.md`. También se leyeron los Markdown de Front (README, AGENTS y CLAUDE), el código de frontend y backend, el esquema, la migración y la configuración relevante.

Se auditó el **árbol de trabajo local, incluyendo modificaciones sin commit y archivos nuevos**. HEAD al iniciar: `c0c8d6f` (`feat(admin): migrar a SPA y añadir gestión de logos`). Los cambios locales posteriores incorporan slots y convierten la navegación administrativa en páginas separadas. No se presume que estos cambios estén desplegados.

No se evaluaron estética, colores, tipografía ni fidelidad a mockups. Sí se evaluaron interacciones, lectura/escritura, persistencia y requisitos de acceso. No se modificó código de producto ni se escribieron datos en producción.

Pruebas realizadas:

- `Back: npm.cmd run typecheck`: aprobado.
- `Front: npm.cmd run build`: aprobado; genera nueve páginas estáticas.
- `Front: npm.cmd run astro -- check`: 0 errores, 0 warnings y 11 hints en 38 archivos.
- `.audit/backend.mjs`: ejecuta el router y los handlers reales empaquetados, usando SQLite en memoria como adaptador de D1, almacenamiento simulado y secretos exclusivos de prueba. Doce comprobaciones, incluidas reproducciones de defectos; todas confirmaron la condición esperada. No equivale a probar D1/R2 desplegados ni concurrencia.
- `.audit/browser.mjs`: ejecuta el build real en Edge headless a 390 × 844, con API interceptada, datos ficticios y service worker bloqueado. Confirma carga inicial, búsqueda, navegación de galería y payload de edición. Sin errores JavaScript de ejecución en los casos recorridos.
- Resultados reproducibles: `.audit/backend-results.json` y `.audit/browser-results.json`. Los resultados `ok: true` de reproducciones de defectos significan que **se reprodujo el problema**, no que el requisito está cumplido.

## Estado frente a lo prometido

| Requisito documental | Estado | Evidencia y límite |
|---|---|---|
| Galería dinámica sin redeploy (`01`, `02`) | Parcial | Consulta la API en el navegador y renderiza datos; navegación incompleta. Actualización real en despliegue pendiente de comprobar. |
| Seis categorías (`requisitos-slots`, RF-12) | Implementado | Categorías compartidas en frontend y enum en backend. |
| Cotización WhatsApp (`01`, §4) | Implementado en código | Botón con mensaje y cotizador con obra, medidas, interior/exterior, altura, dirección y referencia. Enlace inspeccionado en navegador; no se envió mensaje ni se verificó titularidad del número. |
| Crear obra desde celular en menos de dos minutos (`01`) | No aceptado todavía | Formulario, conversión WebP, URL firmada y guardado existen. No se cronometró una subida real desde celular y el retorno al listado está afectado por F1. |
| Video mediante enlace YouTube (`01`, `03`) | Parcial | Persistencia y conversión de enlaces watch/youtu.be a iframe; borrar enlace falla, validación de dominio insuficiente y Shorts no tiene conversión específica. Reproducción real no comprobada. |
| CRUD de obras (`03`; slots RF-01/02/06/07) | Parcial | Rutas, formularios, precarga y limpieza al reemplazar imagen implementadas. Edición de campos vacíos falla. |
| Crear sin slot y desplazar al ocupar slot | Verificado localmente | Conserva orden 0; insertar en 1 desplaza posiciones y expulsa la quinta a 0. |
| Mover slot y cambiar categoría | Verificado localmente | Movimiento mantiene posiciones únicas en escenario probado; cambio de categoría rellena origen. No se certifica concurrencia. |
| Borrar obra y reindexar | Implementado, prueba integral pendiente | Handler usa batch y selecciona reemplazo; interfaz no comunica correctamente errores HTTP. |
| Filtros, búsqueda, conteo y paginación (`slots` RF-03/05/10) | Parcial | Backend probado con filtro y búsqueda sin distinguir mayúsculas ASCII. Paginador está conectado por eventos; la carga inicial del panel impide el flujo normal. |
| Riel de cinco slots y edición desde slot (`slots` RF-04/08) | Parcial | Renderizado y enlaces implementados; no carga al entrar, depende de activar carga mediante filtros. |
| Flechas y carga diferida pública (`slots` RF-11; arquitectura §7) | Incumplimiento | Flecha deshabilitada según hasMore; no hay listener de scroll para cargar más. |
| Subir/listar/editar logos (`07`, RF-01/02/05) | Parcial | Backend y formularios presentes; listado no arranca, falta limpiar imagen anterior y no hay previsualización de imagen actual al editar logo. |
| Un único logo activo (`07`, RF-04) | Verificado localmente | Activación mediante batch de desactivación y activación; comprobado con dos logos. |
| Logo activo en portada y fallback (`07`, RF-03/07) | Parcial | Hero consulta logo activo y conserva `/images/hero-obra.jpg` como fallback. El fallback del panel apunta a `/logo-default.png`, archivo inexistente. |
| Eliminar logo D1 + R2 (`07`, RF-06) | Parcial | En prueba se elimina fila y se solicita borrado del archivo actual; fallos de R2 se silencian con log y respuesta de éxito. |
| Panel privado y doble autenticación (`00`–`03`) | No garantizado por el repositorio | Páginas estáticas con control client-side; bypass de Access cuando falta variable. Configuración perimetral real no revisada. |
| PWA para administrar | Base implementada; aceptación pendiente | Manifest, iconos, SW y notificación de actualización existen. Helper de instalación no se invoca. No se probó instalación, actualización ni experiencia real en teléfono. |
| Coste mensual cero (`00`, `01`) | No verificable aquí | Requiere consumo, facturación y configuración de Cloudflare; no se validaron los precios históricos de la documentación. |
| Sin pagos, biografía ni multiusuario | Coherente con alcance | No se consideran faltantes las funciones expresamente excluidas. Precios, testimonios y multidioma siguen fuera de v1. |

## Hallazgos priorizados

### F1 — Alta: los paneles no cargan al entrar

`Front/src/components/admin/Dashboard.astro:191` y `DashboardLogos.astro:163` esperan eventos `admin:load-dashboard-*`. Las nuevas páginas `src/pages/admin/obras/index.astro` y `src/pages/admin/logos/index.astro` solo montan componentes; ni ellas ni AdminLayout emiten esos eventos o llaman la carga inicial.

**Reproducción:** abrir cada ruta con un token ficticio en almacenamiento local y API simulada disponible. Obras: 0 consultas, 0 tarjetas. Logos: 0 consultas y mensaje permanente «Cargando almacén...». En Obras, escribir en el buscador sí carga cinco tarjetas. Volver al listado tras guardar recarga la página y vuelve a caer en el problema.

**Corrección propuesta:** inicializar explícitamente cada dashboard al montar su página y conservar eventos únicamente donde sean necesarios. Es el primer bloqueo a resolver para operar el sistema.

### F2 — Alta: galería impide avanzar aunque existan imágenes fuera de pantalla

`Front/src/components/Galeria.astro:96` deshabilita Siguiente cuando `hasMore` es falso; `:180` repite esto tras descargar la última tanda. `hasMore` describe datos pendientes en el servidor, no posición del scroll. El contenedor de scroll ya es el correcto, pero la condición del botón sigue siendo incorrecta.

**Reproducción:** cinco obras, `hasMore: false`, viewport móvil: cinco tarjetas, overflow horizontal real y Siguiente deshabilitado. Además, solo el click dispara carga diferida: deslizar con el dedo no descarga más obras, contra `arquitectura-slots.md` §7.2.

**Corrección propuesta:** separar disponibilidad de datos y capacidad de desplazamiento; cargar al acercarse al final también mediante scroll.

### F3 — Media: no se puede quitar descripción ni video existente

`Front/src/components/admin/FormularioObra.astro:293` y `:295` convierten cadena vacía en `undefined`; JSON elimina los campos. El backend interpreta ausencia como «no modificar» aunque sí admite `null`.

**Reproducción en navegador:** precargar una obra, vaciar ambos campos y guardar. Payload observado: solo título, categoría y orden. Prueba del handler confirma que se conserva la descripción original.

**Corrección propuesta:** enviar `null` o el valor vacío acordado al borrar campos en edición, diferenciándolo de campos no modificados.

### F4 — Media: reemplazar imagen de logo deja el archivo anterior

`Back/src/handlers/logos.ts:187` recupera solo el ID; `:213` actualiza imagen_key sin recuperar ni borrar la clave anterior. Incumple `07` RF-05. La limpieza sí existe en reemplazo de obras.

**Reproducción:** crear logo con `old.webp`, editar a `new.webp`; ninguna llamada de borrado para `old.webp`. El borrado posterior del logo sí solicita eliminar `new.webp`.

**Corrección propuesta:** recuperar clave anterior y borrarla después de confirmar actualización, con tratamiento explícito de fallos.

### F5 — Alta antes de desplegar: la privacidad y doble barrera no están garantizadas

`Back/src/middleware/verificarAccess.ts:17` permite acceso si falta `CF_ACCESS_TEAM`. `Front/src/lib/auth.ts:25` solo envía Bearer, sin los Service Tokens prometidos. La verificación interna de Access comprueba issuer pero no audience. Login se despacha antes de esa verificación en el router.

Las páginas `/admin/login` y las demás se generan como HTML estático; la redirección basada en localStorage no restringe la entrega del HTML. El manifest público también revela `/admin`. La prueba local confirma que, sin equipo Access, un JWT del Worker basta para escribir; sin JWT se rechaza correctamente.

**Límite:** esto no demuestra que producción esté expuesta: una política externa de Cloudflare podría protegerla, pero no fue inspeccionada. No se puede dar por cumplido el principio de `00` con la evidencia actual. Tampoco existe renovación de JWT: al recibir 401 se borra y recarga.

**Corrección propuesta:** cerrar el bypass en entornos reales y comprobar conjuntamente protección de páginas, login y API con el método de Access adoptado, sin poner secretos permanentes en código público.

### F6 — Media: errores HTTP de borrar/activar no se informan

`Dashboard.astro:153`, `DashboardLogos.astro:117` y `:141` esperan apiFetch pero no comprueban `response.ok`. Fetch no lanza excepción por 403/429/500, de modo que se recarga la lista sin explicar el fracaso. En Logos, respuestas no exitosas de lectura también pueden dejar mensajes de carga indefinidos.

Hallazgo por lectura de código; no se inyectaron esos fallos HTTP en navegador. Debe comprobarse antes de considerar cerrados los flujos de eliminación y activación.

### F7 — Media: migración produce slots duplicados sobre datos mixtos

`Back/migrations/001_asignar_orden_inicial.sql:14` recalcula únicamente filas con orden 0, pero el ranking cuenta todas las filas. No existe restricción de unicidad de slot por categoría.

**Reproducción SQLite:** una obra antigua ya ocupa 1; otra más nueva está en 0. La migración asigna 1 a la nueva y deja la antigua en 1. El desempate por ID mejora fechas idénticas, pero no resuelve este caso.

**Alcance:** defecto condicionado al estado inicial; no se afirma que ya haya ocurrido ni que la migración esté aplicada. Validar precondiciones o recalcular coherentemente toda la categoría antes de ejecutarla.

### F8 — Media: validación de video acepta dominios ajenos

`Back/src/schemas.ts` usa `includes("youtube.com")`/`includes("youtu.be")`/`includes("tiktok.com")`. Se confirmó respuesta 201 para `https://example.org/youtube.com`. No verifica el hostname del proveedor ni que sea un enlace reproducible. TikTok además amplía el alcance documentado de YouTube.

**Corrección propuesta:** analizar URL y validar host y formatos admitidos. Probar watch, youtu.be, Shorts y enlaces inválidos; acordar si TikTok pertenece al alcance.

## Otros pendientes funcionales y de consistencia

- La promesa de URL de subida de un solo uso no está implementada: `Back/src/lib/storage.ts` firma PUT por 300 segundos, sin registro de consumo. No se probó una subida real ni reutilización contra R2.
- Si R2 falla al borrar obras/logos, el código continúa eliminando metadata y responde éxito. En edición de obra registra error de limpieza sin reintento. Subir imagen y fallar al guardar metadata también puede dejar huérfanos.
- `Dashboard.astro` y `DashboardLogos.astro` interpolan títulos/nombres en innerHTML sin escape; valores con HTML pueden alterar contenido/acciones del panel. Es un riesgo por inspección, no una explotación probada.
- `limit` y `offset` se parsean sin validación de rango; faltan respuestas de validación para valores inválidos. El contrato antiguo `?destacado=true` dejó de aplicarse en listado; documentar su retiro si slots lo sustituye.
- El admin usa un Worker remoto como fallback si falta `PUBLIC_API_BASE_URL`; Hero/Galería usan URL vacía y llaman al origen del frontend. Sin esa variable pueden leer fuentes diferentes. No se presume que falte en producción.
- `07` ejemplifica paginación de logos con `page`; implementación usa `offset`. La interfaz actual usa offset coherentemente, pero consumidores del contrato escrito necesitan su actualización.
- No se encontró suite funcional automatizada integrada en scripts. `test_edit.mjs` es una comprobación manual de una petición con supuestos de login y sin aserciones suficientes; no valida aceptación del conjunto.

## Documentos que requieren conciliación

- `06` y `arquitectura-slots` prometen SPA sin recargas; código actual usa rutas distintas y `window.location`. Es una desviación de arquitectura; el defecto funcional concreto es F1. No se presupone que deba revertirse a SPA sin conocer la decisión del equipo.
- `impacto-archivos` aún habla de asignación automática mediante MAX, mientras `requisitos-slots` RF-01 exige orden 0 cuando no se selecciona slot. Para esta auditoría prevaleció el requisito funcional explícito; el código lo cumple.
- Algunas tablas indican `ORDER BY orden ASC`, que pondría 0 primero. El concepto de slots exige 1–5 antes del historial; el CASE del código satisface esa intención y no se contó como defecto.
- `00` prohíbe login público; documentos posteriores describen `/admin` pero no acreditan protección perimetral efectiva. Debe quedar explícita la política definitiva.

## Orden de cierre y aceptación pendiente

1. Resolver arranque de Obras/Logos y repetir acceso → listado → crear → volver → editar → volver.
2. Resolver navegación por flecha y por gesto, con categorías de 1, 5, 6 y más obras.
3. Resolver borrado de campos, reemplazo de logos y errores HTTP; verificar persistencia tras recargar.
4. Validar migración sobre copia de datos y todos los cambios de slot/categoría, incluidos fallos y concurrencia.
5. Verificar Access, JWT, subida y borrado reales D1/R2 en entorno controlado.
6. Probar instalación y actualización PWA y cronometrar la subida desde el teléfono del administrador.
7. Actualizar contratos/documentos y verificar configuración del despliegue y costes con evidencia de Cloudflare.

**Cierre:** el avance es real, especialmente en reglas de backend. Todavía no se puede entregar como flujo administrativo completo ni certificar cumplimiento de todos los requisitos de v1. No se asigna un porcentaje de avance: los documentos mezclan versiones, arquitectura y aceptación, y ocultaría bloqueos de uso presentes.
