# Plan de refactorización de arquitectura y entornos

**Rama de trabajo:** `codex/refactor-arquitectura-publico`

**Fecha:** 11 de octubre de 2026

**Estado:** fase pública y compartidos implementada localmente el 11 de octubre de 2026 (sección 14); separación visual administrativa implementada después (sección 15). Persisten tareas funcionales administrativas y de integración. Las secciones 2–13 conservan el diagnóstico y la propuesta que guiaron el trabajo.

## 1. Alcance y orden

Primero se preparará un entorno de prueba local y se refactorizará la **vista pública**. Una vez estabilizados sus flujos, se trabajará en la vista **administrativa**. El objetivo es separar presentación, interacciones, acceso a datos y reglas de negocio sin cambiar inadvertidamente lo que ve o hace el usuario.

La rama se creó desde `main` (`c0c8d6f`). Había cambios locales sin commit al crearla. Cambiar de rama no guarda esos cambios en el historial; antes de alternar ramas se deberá preparar un commit de base con selección explícita de archivos del proyecto, excluyendo dependencias y artefactos de prueba.

## 2. Cómo funciona hoy el Worker y las imágenes

Hay dos clases de URL con propósitos distintos:

1. **Subida:** al solicitar `POST /api/obras/upload-url` o `/api/logos/upload-url`, el Worker crea una clave como `obras/<uuid>/<timestamp>-<nombre>.webp` y firma una URL de `PUT` con validez de 300 segundos. El navegador sube el archivo a R2 usando esa URL. La base D1 guarda la **clave del objeto**, no la URL firmada. La firma utiliza `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET_ENDPOINT` (`Back/src/lib/storage.ts`). El código no lleva un registro de usos de la URL; la caducidad no implica por sí sola un solo uso.
2. **Lectura pública:** al listar u obtener una obra o logo, el Worker consulta D1 y construye `imagenUrl` concatenando `R2_PUBLIC_URL` con la `imagen_key`. Ejemplo conceptual: `https://imagenes.ejemplo/obras/uuid/foto.webp`. Se construye el texto de la URL para **cada registro devuelto en la respuesta**, pero no se crea un enlace nuevo en Cloudflare ni se guarda una URL nueva por imagen. Mientras el dominio base y la clave no cambien, el resultado es el mismo. El navegador recibe esa URL y descarga la imagen directamente del dominio público de R2; el Worker no transmite los bytes en ese flujo.

El mismo helper `generarUrlPublica` se utiliza para obras y logos. Si falta `R2_PUBLIC_URL`, hoy se genera `/<clave>`, que apuntaría al origen de la página. Por eso debe validarse la configuración en vez de aceptar silenciosamente el valor vacío.

```text
Subida: admin → Worker pide firma → navegador hace PUT a R2 → Worker guarda clave en D1
Lectura: página → Worker consulta D1 → devuelve imagenUrl → navegador descarga de R2
```

**Implicación local:** Wrangler puede proporcionar bindings locales de D1 y R2, pero el mecanismo actual de lectura espera un dominio público de imágenes y la firma de subida espera un endpoint S3. Para probar todo sin producción hace falta una forma local de servir objetos del bucket y, durante la fase admin, un camino de subida local. Esas diferencias deben quedar encerradas en un adaptador de almacenamiento, no repartidas por las vistas.

## 3. Estructura actual resumida

```text
PortafolioDigital/
├─ Docs/                         Requisitos y documentación
├─ Front/
│  ├─ public/                    Imágenes estáticas, iconos, manifest y SW
│  └─ src/
│     ├─ pages/                 Inicio y rutas de admin
│     ├─ layouts/               LayoutBase y AdminLayout
│     ├─ components/            Secciones públicas
│     │  └─ admin/              Dashboards, formularios y paginación
│     ├─ config/                site.ts y tokens.ts
│     ├─ i18n/                  Textos
│     ├─ lib/                   auth, categorías y PWA
│     ├─ data/                  Datos de ejemplo no integrados
│     └─ styles/                global.css
└─ Back/
   ├─ schema.sql y migrations/  Esquema y migraciones D1
   ├─ wrangler.toml             Bindings
   └─ src/
      ├─ index.ts              Router, CORS y acceso
      ├─ schemas.ts, types.ts
      ├─ handlers/             Auth, obras y logos
      ├─ middleware/            Access y JWT
      └─ lib/                   Storage y rate limiting
```

Actualmente `Galeria.astro`, ambos dashboards y ambos formularios concentran estructura visible, CSS, consultas, estado e interacciones. `LayoutBase.astro` mezcla base de página, navegación pública, pie y PWA. Los componentes `TarjetaObra.astro`, `VideoEmbed.astro` y `FormaGeometrica.astro` existen, pero no se usan en la página pública actual. El backend mezcla HTTP, SQL y reglas de negocio en sus handlers; además, estos importan `jsonResponse` desde el router que los importa.

## 4. Estructura objetivo

La carpeta `visual/` será dueña de los componentes de presentación, estilos y tokens. Se dividirá por sección cuando esa división permita localizar un defecto visual sin recorrer archivos grandes. Los componentes visuales reciben datos y emiten acciones; no deciden dónde se consultan ni cómo se guardan.

```text
Front/src/
├─ pages/                              Rutas y composición
├─ layouts/
│  ├─ DocumentLayout.astro             HTML común sin navegación
│  ├─ PublicLayout.astro               Composición de cabecera y pie públicos
│  └─ AdminLayout.astro                Shell administrativo en su fase
├─ visual/
│  ├─ tokens/                          Variables de diseño
│  ├─ styles/
│  │  ├─ base.css
│  │  ├─ public/
│  │  │  ├─ header.css
│  │  │  ├─ footer.css
│  │  │  ├─ hero.css
│  │  │  ├─ servicios.css
│  │  │  ├─ galeria.css
│  │  │  ├─ galeria-riel.css
│  │  │  ├─ galeria-tarjeta.css
│  │  │  ├─ video-dialog.css
│  │  │  ├─ cotizador.css
│  │  │  └─ whatsapp-button.css
│  │  └─ admin/
│  │     ├─ layout.css
│  │     ├─ obras-lista.css
│  │     ├─ obras-slots.css
│  │     ├─ obra-formulario.css
│  │     ├─ logos-lista.css
│  │     ├─ logo-formulario.css
│  │     └─ paginacion.css
│  └─ components/
│     ├─ shared/                       Avisos visibles transversales
│     ├─ public/
│     │  ├─ PublicHeader.astro
│     │  ├─ PublicFooter.astro
│     │  ├─ HeroView.astro
│     │  ├─ ServiciosView.astro
│     │  ├─ GaleriaView.astro
│     │  ├─ GaleriaRiel.astro
│     │  ├─ ObraCard.astro
│     │  ├─ VideoDialog.astro
│     │  ├─ CotizadorView.astro
│     │  └─ WhatsappButton.astro
│     └─ admin/
│        ├─ AdminShell.astro
│        ├─ ObrasListView.astro
│        ├─ SlotsView.astro
│        ├─ ObraFormView.astro
│        ├─ LogosListView.astro
│        ├─ LogoFormView.astro
│        └─ PaginationView.astro
├─ features/
│  ├─ hero/                             Carga del logo activo y fallback
│  ├─ galeria/                          Carga, navegación y video
│  ├─ cotizacion/                       Mensaje WhatsApp
│  ├─ obras/                            Filtros, slots y formulario
│  ├─ logos/                            Estado, activación y formulario
│  └─ pwa/                              Registro y actualización
├─ services/
│  ├─ api/                              Cliente HTTP y contratos
│  ├─ auth/                             Sesión del admin
│  └─ images/                           Conversión y subida
├─ config/                              Datos de negocio y entorno
└─ i18n/                                Textos

Shared/contracts/                       Códigos estables si ambos builds lo admiten

Back/src/
├─ routes/                              HTTP y respuestas
├─ services/                            Reglas de obras y logos
├─ repositories/                        Consultas D1
├─ storage/                             R2 y adaptador local
├─ middleware/                          Acceso y autenticación
└─ schemas/                             Validación de solicitudes
```

`Front/public/` conservará los archivos que Astro sirve directamente, agrupando fotos e iconos por uso. Un fallo de color o separación de una tarjeta se resolverá en su CSS; uno de la estructura visible, en su componente de `visual/`; uno de selección o carga, en `features/`; uno de persistencia, en el backend. No se crearán archivos diminutos sin una responsabilidad independiente.

## 5. Configuración por entorno: dónde vive cada variable

**Front:** un módulo `Front/src/config/env.ts` (por crear) leerá `import.meta.env.PUBLIC_API_BASE_URL`, validará que exista y ofrecerá una única `apiBaseUrl` a `services/api/`. Se eliminará el fallback remoto de `Front/src/lib/auth.ts`; Hero y Galería dejarán de construir por su cuenta la base de la API. La URL de la API es pública: puede aparecer en JavaScript del navegador. Los secretos nunca deben usar el prefijo `PUBLIC_`.

**Desarrollo local del Front:** un archivo de modo desarrollo, por ejemplo `Front/.env.development.local`, contendrá `PUBLIC_API_BASE_URL=http://127.0.0.1:8787`. Debe figurar en `.gitignore`. `Front/.env.example` documentará el nombre de la variable sin apuntar a producción. El `Front/.env` existente apunta a una API remota; antes de ejecutar el entorno local habrá que sustituirlo o retirar su uso después de confirmar dónde está registrada la configuración productiva. El módulo `env.ts` debe rechazar una URL remota al ejecutar el modo de desarrollo local, salvo una decisión explícita de probar contra otro entorno.

**Producción del Front:** `PUBLIC_API_BASE_URL` se configurará como variable del proyecto Cloudflare Pages para el build de producción. No dependerá de un archivo ignorado en la computadora ni de la rama Git. La configuración real de Pages todavía no se ha verificado; se comprobará antes de retirar cualquier valor local existente.

**Back:** `Back/wrangler.toml` mantendrá la configuración de despliegue. Para desarrollo se propone `Back/wrangler.local.toml` con nombres de bindings locales y comandos que lo seleccionen explícitamente, sin `--remote`. Los secretos de prueba estarán en `Back/.dev.vars` ignorado por Git; `Back/.dev.vars.example` tendrá solo nombres y ejemplos inocuos. Los secretos de producción (`JWT_SECRET`, `ADMIN_SECRET`, claves S3 de R2) permanecerán en Cloudflare. `R2_PUBLIC_URL` es configuración pública del Worker, no un secreto; se documentará y validará expresamente.

| Variable o recurso | Local | Producción |
|---|---|---|
| `PUBLIC_API_BASE_URL` | Archivo de entorno de desarrollo del Front | Variable de Cloudflare Pages |
| D1 `DB` | Binding local con datos de prueba | Binding del Worker desplegado |
| R2 `BUCKET` | Binding local con imágenes de prueba | Bucket productivo |
| `R2_PUBLIC_URL` | URL del servidor local de imágenes | Dominio público configurado para R2 |
| `R2_BUCKET_ENDPOINT` y claves S3 | El camino de subida local evitará necesitarlas | Secretos/configuración del Worker para subida firmada |
| JWT y secreto admin | Valores exclusivos de prueba, al llegar a la fase admin | Secretos del Worker desplegado |

No se usarán credenciales productivas para las pruebas locales. En particular, cambiar de rama no cambia archivos ignorados ni secretos alojados en Cloudflare. Tampoco se considerará listo un entorno solo porque compila: se probará qué host recibe cada solicitud.

## 6. Secuencia de trabajo propuesta

1. Preparar y verificar configuración local: Front → Worker local → D1 local → imágenes locales, sin peticiones a hosts productivos. Registrar los comandos reproducibles.
2. Tomar una referencia funcional de la vista pública con obras de prueba: Hero, Servicios, Galería, video y WhatsApp.
3. Extraer tokens, estilos y componentes públicos a `visual/`, comprobando el mismo comportamiento después de cada movimiento.
4. Extraer consultas, estado de carruseles y video a `features/galeria` y `services/api`.
5. Separar el backend por rutas, reglas, consultas y almacenamiento solo donde facilite las pruebas del flujo público.
6. Iniciar la fase administrativa: formularios, subida local de imágenes, logos, slots, autenticación y listas.
7. Antes de integrar hacia producción, verificar variables de Pages, bindings y secretos del Worker, build de producción y flujos reales. La integración a la rama `production` se hará mediante revisión/PR según la guía Gitflow; no se enviarán cambios directamente a `main`.

## 7. Criterio de aceptación de la preparación local

- El navegador local consulta únicamente la API local.
- La API local lee D1 local y sirve imágenes de R2 local o del adaptador local acordado.
- Ningún comando de desarrollo usa `--remote` ni requiere secretos de producción.
- Una configuración faltante detiene el arranque o muestra un error identificable; nunca redirige silenciosamente a producción.
- La configuración del despliegue se mantiene identificada y verificable al volver a la rama de producción.

## 8. Primera división de trabajo: público y administración

La división sigue las rutas y los flujos reales. Se comparte la infraestructura necesaria, pero cada ámbito conserva sus componentes y reglas de interacción.

| Ámbito | Entrada actual | Qué incluye | Estado de este plan |
|---|---|---|---|
| Vista pública | `Front/src/pages/index.astro` | Layout público, Hero, Servicios, Galería, Cotizador, WhatsApp y sus dependencias | Inventario y plan por sección detallados abajo. |
| Vista administrativa | `Front/src/pages/admin/**` | Login, listados, formularios, slots, logos, paginación y subida | Identificada; su diseño de refactorización detallado queda para la fase posterior. |
| Compartido | Configuración de entorno, cliente HTTP, tokens, tipos de datos y Worker | Contratos que usan ambos ámbitos | Cambiar por pasos y comprobar a los dos consumidores antes de retirar código anterior. |

La separación público/admin debe ser real en composición y estilos: `LayoutBase.astro` sirve hoy también al admin, que oculta la cabecera y el pie públicos con CSS. A largo plazo habrá una base HTML mínima compartida y dos shells explícitos. **Durante esta primera fase solo se extraerá el shell público; el admin deberá seguir montando y funcionando.** No se moverán ni reescribirán aún dashboards, formularios o autenticación.

## 9. Archivos y responsabilidades compartidas

«Compartido» significa que el archivo alimenta tanto al público como al admin, que proporciona una regla común a varias secciones, o que establece un contrato entre Front y Back. No significa que toda la interfaz de ambos lados deba vivir en un mismo componente. Las piezas compartidas se prepararán antes de migrar a sus consumidores y conservarán una vía compatible mientras el admin siga con su estructura actual.

```text
Documento y estilos base ─── página pública + páginas admin
Configuración y textos ───── secciones públicas + componentes admin
Categorías ───────────────── Galería + formularios/listas admin + validación Back
API y contratos ──────────── Hero/Galería + admin ↔ Worker
URL de imagen ────────────── Hero/Galería + admin ↔ D1/R2
PWA ──────────────────────── LayoutBase → rutas públicas y admin
Datos de prueba ──────────── desarrollo local y comprobaciones de ambos ámbitos
```

### C1. Documento HTML y límites entre shells

**Actual y relaciones:** `Front/src/layouts/LayoutBase.astro` genera `<html>`, `<head>`, tokens, cabecera pública, `<main>`, pie y PWA. Lo usan `pages/index.astro`, `pages/admin/login.astro` y `AdminLayout.astro`; este último oculta cabecera y pie con CSS. Por tanto, modificar la base para la página pública puede cambiar el admin aunque no se edite ninguna ruta administrativa.

**Refactorización:** extraer un `DocumentLayout.astro` mínimo, dueño de HTML, metadatos compartidos, carga de base CSS y slot. Componer un `PublicLayout.astro` con `PublicHeader` y `PublicFooter`. Mantener `AdminLayout` y Login funcionales durante la transición y, cuando se diseñe la fase admin, hacer que compongan su propio shell sin ocultar elementos públicos. Los metadatos que solo corresponden a la portada no se forzarán sobre las páginas admin. Los eventos de abrir Cotizador pertenecen al flujo público, no al documento compartido.

**Verificación del contrato:** comparar `/`, `/admin/login`, `/admin/obras` y `/admin/logos`: estructura base válida, un solo `<main>`, título y metadatos adecuados, sin navegación pública visible en admin. Esta verificación no presupone que los dashboards ya carguen datos; ese defecto se registra en la auditoría.

### C2. Tokens, CSS base y recursos visuales

**Actual y relaciones:** `config/tokens.ts` alimenta las variables CSS inyectadas por `LayoutBase`; `styles/global.css` aporta reset y reglas generales. Los estilos de cabecera/pie y de cada sección están en bloques `<style>`; algunos elementos generados por JavaScript usan `:global()`, otros aplican estilos inline. Los archivos de `public/images/` e `icons/` se sirven directamente y son usados por Hero, Servicios y PWA.

**Refactorización:** colocar tokens en `visual/tokens/` y reset/base en `visual/styles/base.css`. Dejar una sola fuente de variables; los CSS de `visual/styles/public/` y `visual/styles/admin/` consumen tokens sin redefinirlos. Extraer cada estilo por responsabilidad visible, sin imponer un CSS único para toda la vista pública. Mantener recursos que Astro sirve por URL bajo `public/`, con rutas estables o un cambio de rutas verificado. Los estilos inline que representen estado (abierto, error, deshabilitado) pasarán a clases semánticas; la lógica solo alternará esas clases.

**Verificación del contrato:** los tokens siguen disponibles en público y admin; imágenes e iconos resuelven; un cambio en `hero.css` no modifica tarjetas o formularios. La extracción visual requiere comprobar apariencia además de funcionalidad cuando se implemente, aunque esta etapa sea solo de planificación.

### C3. Configuración de negocio, textos y entorno

**Actual y relaciones:** `config/site.ts` mezcla nombre del estudio, contacto, interruptores de secciones y `PUBLIC_API_BASE_URL`. `i18n/es.ts` mezcla textos de navegación, Hero, Servicios, Galería, pie y Cotizador. Hero/Galería leen `siteConfig.api.baseUrl`; `lib/auth.ts` lee ese mismo valor pero añade un fallback a un Worker remoto. El número de WhatsApp se usa en Cotizador y botón flotante.

**Refactorización:** crear `config/env.ts` como única lectura y validación de variables de entorno; `site.ts` queda para datos e interruptores de negocio. Mantener los textos en un diccionario organizado por dominio (`nav`, `hero`, `servicios`, etc.) sin obligar a fragmentarlo en muchos archivos; mover el catálogo de servicios fuera de las etiquetas de interfaz cuando se refactorice P2. Toda URL de API se obtendrá del mismo `env.ts`; ninguna parte del Front tendrá un hostname remoto de respaldo. Conservar una función compartida de construcción de enlace WhatsApp para los dos caminos de contacto, sin poner estilos ni DOM en ella.

**Verificación del contrato:** en desarrollo la URL configurada es local; si falta, aparece un error claro antes de consultar la red. Público y admin resuelven la misma base de API. El nombre, los textos y el teléfono se cambian en un solo lugar. La variable productiva permanecerá en Pages; cambiar de rama no debe alterar archivos ignorados ni secretos.

### C4. Categorías y vocabulario de obras

**Actual y relaciones:** `Front/src/lib/categorias.ts` contiene códigos y etiquetas para la Galería y el admin. `Back/src/schemas.ts` repite los seis códigos en los esquemas Zod de creación y edición. El Worker filtra por categoría, pero el parámetro de consulta llega como texto; el frontend determina el orden visible de rieles.

**Refactorización:** declarar los seis códigos controlados en una fuente de contrato pura, por ejemplo `Shared/contracts/categorias.ts`, consumida por Front y Back solo después de comprobar su compatibilidad con los dos builds. Mantener etiquetas en el diccionario español del Front y el orden visible en la configuración de Galería; el backend no necesita copiar etiquetas visuales. Si importar un módulo común complica los builds, conservar un contrato documentado con una comprobación automática de paridad, en lugar de introducir un paquete compartido a cualquier costo.

**Verificación del contrato:** una categoría admitida por el formulario también es admitida por Zod, aparece con la misma etiqueta en público y admin y filtra las obras correctas. El orden de los seis rieles no cambia durante la extracción.

### C5. Cliente HTTP y forma de las respuestas

**Actual y relaciones:** Hero y Galería hacen `fetch` directamente; `lib/auth.ts` envuelve `fetch` para admin, inyecta Bearer y responde a 401. El Worker en `Back/src/index.ts` publica `GET /api/obras` y `GET /api/logos` sin autenticación; las rutas de escritura y consulta individual están protegidas. Los handlers devuelven `obras`/`logos`, `total`, `hasMore` e `imagenUrl`. También importan `jsonResponse` desde el router que los importa, formando un ciclo.

**Refactorización:** `Front/src/services/api/client.ts` tendrá base URL, manejo común de red/HTTP y lectura de JSON; `obras.ts` y `logos.ts` tendrán métodos y tipos de respuesta. El adaptador de autenticación admin se añadirá encima del transporte común sin obligar a la lectura pública a portar un JWT. Los controladores de secciones recibirán datos tipados y distinguirán vacío de error. En Back, la utilidad de respuesta saldrá de `index.ts` a un módulo independiente antes de dividir rutas y servicios. Se preservarán rutas y forma de respuesta mientras migran los consumidores.

**Verificación del contrato:** Hero y Galería hacen las mismas peticiones de lectura; los listados admin siguen recibiendo su forma de respuesta; errores HTTP no se interpretan como listas vacías. Se prueba lectura pública con y sin obras y rechazo de una escritura sin autorización. Resolver el problema existente de carga inicial del admin corresponde a su fase, pero el nuevo cliente no debe agravarlo.

### C6. Identidad de la imagen y almacenamiento

**Actual y relaciones:** D1 guarda `imagen_key`; `Back/src/lib/storage.ts` construye `imagenUrl` pública para listados de obras y logos, y firma URLs temporales de subida. Hero y Galería consumen `imagenUrl`; los formularios admin consumen también URLs de subida. La URL pública depende de `R2_PUBLIC_URL`, y la ruta local de R2 no dispone hoy del mismo mecanismo de lectura pública. Front tiene imágenes estáticas de fallback/servicios separadas de las imágenes dinámicas.

**Refactorización:** fijar un contrato único para claves, URL pública y fallback. Un adaptador de almacenamiento del Worker resolverá la lectura según entorno: URL del dominio público de R2 en producción y ruta local controlada en desarrollo. La firma de subida seguirá aislada del renderizado de imágenes y se abordará en la fase admin; no se añadirán credenciales R2 al navegador. Los componentes visuales reciben solo URL y texto alternativo; no concatenan claves ni conocen buckets. La configuración `R2_PUBLIC_URL` será validada cuando corresponda. No se moverán fallbacks estáticos al bucket dinámico.

**Verificación del contrato:** una misma obra muestra una URL resoluble en Galería y admin, y un mismo logo en Hero y admin; en local no se solicitan imágenes productivas; en producción la API no devuelve `/<clave>` por ausencia de configuración. Un reemplazo de imagen conserva la referencia correcta antes de limpiar el objeto anterior.

### C7. PWA, caché y ciclo de actualización

**Actual y relaciones:** `LayoutBase.astro` inserta manifest, registra `/sw.js` y muestra un aviso de actualización; se ejecuta en la portada y en rutas admin que usan el mismo layout. `public/manifest.json` tiene `start_url` y `scope` de admin, mientras el registro de `/sw.js` opera desde la raíz. El helper de instalación en `lib/pwa/installPrompt.ts` no tiene consumidor. El service worker puede mantener recursos estáticos en caché entre cambios de rama o despliegue local.

**Refactorización:** definir explícitamente qué rutas necesitan PWA y desde qué shell se registra. Colocar el controlador de registro/actualización en `features/pwa/`, dejar `manifest.json` y `sw.js` bajo `public/` y separar el aviso visible en `visual/components/` y su CSS. Para la verificación local de refactorización, usar un navegador limpio o impedir que un SW previo sirva archivos antiguos; evitar que un modo de desarrollo nuevo se confunda con una versión cacheada. La instalación se planificará con la fase admin, coherente con el alcance del manifest, sin añadir un botón público por accidente.

**Verificación del contrato:** una ruta solo registra el SW cuando así se decidió, el aviso de nueva versión no aparece duplicado y una recarga local muestra el build actual. La fase admin validará instalación real desde móvil.

### C8. Datos de prueba y frontera de los cambios

**Actual y relaciones:** `Front/src/data/mockObras.ts` define objetos con `imagenUrl` locales, pero no lo importa la página activa. Existen scripts de prueba locales y el esquema/migraciones D1 en Back. La rama conserva cambios anteriores sin commit; archivos ignorados de entorno siguen presentes al cambiar de rama.

**Refactorización:** establecer un conjunto pequeño de obras y logos ficticios para la API/D1 local, con casos de categoría vacía, más de cinco obras, video y logo ausente. Mantener esos datos fuera de las vistas y separados de producción. Antes de iniciar movimientos de arquitectura, registrar una referencia funcional y un commit de base seleccionando código y documentación deliberadamente; no incluir `node_modules`, `.audit` ni archivos de secretos por accidente.

**Verificación del contrato:** los casos locales son reproducibles desde instrucciones del repositorio, sin red productiva, y permiten comparar cada sección antes/después. No se considera un mock visual como sustituto definitivo de comprobar el contrato real del Worker.

## 10. Mapa de composición de la vista pública actual

```text
pages/index.astro
└─ layouts/LayoutBase.astro
   ├─ <head>: título, metadatos, fuentes, iconos y manifest
   ├─ variables visuales desde config/tokens.ts
   ├─ styles/global.css
   ├─ cabecera pública
   │  ├─ enlaces a #inicio, #servicios y #galeria
   │  └─ botón #nav-cotizar-btn ───────────┐
   ├─ <main> / slot                       │
   │  ├─ Hero.astro (#inicio)             │
   │  │  ├─ textos: i18n/es.ts           │
   │  │  ├─ GET /api/logos?activo=1      │
   │  │  └─ botón #hero-cotizar-btn ──┐  │
   │  ├─ Servicios.astro (#servicios)  │  │
   │  │  └─ i18n/es.ts + imágenes      │  │
   │  ├─ Galeria.astro (#galeria)       │  │
   │  │  ├─ lib/categorias.ts          │  │
   │  │  ├─ GET /api/obras             │  │
   │  │  ├─ rieles y tarjetas          │  │
   │  │  └─ diálogo de video           │  │
   │  ├─ Cotizador.astro ◀─────────────┴──┘
   │  │  └─ formulario → URL de WhatsApp
   │  └─ BotonWhatsapp.astro
   │     └─ enlace directo a WhatsApp
   ├─ pie público
   └─ registro y aviso de actualización PWA
```

`siteConfig.secciones.galeria` controla solamente si se monta Galería. Hero, Servicios, Cotizador y botón de WhatsApp se montan siempre. La vista pública no tiene una sección independiente con `id="contacto"`: **el flujo de contacto actual es Cotizador + botón flotante**. Se mantendrá esa realidad en el inventario, sin inventar una sección nueva. Tampoco existen en esta página precios, testimonios o biografía; están fuera del alcance activo.

Las dependencias de datos son distintas: Servicios lee contenido estático desde `i18n/es.ts`; Hero y Galería consultan la API después de cargar la página; Cotizador y el botón usan el teléfono de `siteConfig`. Hero y Galería obtienen la base de API desde `siteConfig.api.baseUrl`, mientras el cliente administrativo usa además un fallback remoto en `lib/auth.ts`. Esta diferencia se resolverá en la capa compartida de entorno antes de mover las secciones.

## 11. Plan por sección pública, una por vez

Cada paso termina con una verificación funcional y se revisa antes de iniciar el siguiente. Los nombres de archivo propuestos indican responsabilidades, no obligan a mantener un archivo si al implementarlo resulta innecesario. Se conserva el comportamiento existente salvo defectos explícitamente identificados en `09-auditoria-funcional-2026-10-11.md`.

### P0. Base pública: documento, cabecera, pie y PWA

**Archivos actuales:** `pages/index.astro`, `layouts/LayoutBase.astro`, `layouts/AdminLayout.astro`, `styles/global.css`, `config/tokens.ts`, `config/site.ts`, `i18n/es.ts`, `lib/pwa/*`, `public/manifest.json` y `public/sw.js`.

**Relación:** `LayoutBase` envuelve todas las secciones públicas. Inyecta tokens como variables CSS, define `<head>`, cabecera, `<main>`, pie y registro del service worker. La cabecera enlaza a las secciones y su botón de cotización depende de `Cotizador.astro`, aunque ese componente se monta en el slot. `AdminLayout` reutiliza esta base y oculta la cabecera/pie con estilos.

**Separación prevista:**

1. Extraer una base de documento compartida que solo maneje estructura HTML, metadatos comunes y el slot, sin navegación específica del público ni del admin.
2. Crear un shell público que componga `PublicHeader`, contenido y `PublicFooter`. Sus marcas visibles estarán en `visual/components/public/`, y sus reglas en `visual/styles/public/header.css` y `footer.css`.
3. Mover reset y estilos generales a `visual/styles/base.css`; mover tokens a `visual/tokens/` sin duplicar valores. Mantener datos de negocio y textos fuera de `visual/`.
4. Dejar registro y actualización PWA en `features/pwa/` y decidir explícitamente desde el shell en qué rutas se activan; conservar `public/manifest.json` y `sw.js` como archivos servidos por Astro.
5. Cambiar el acoplamiento por IDs `#nav-cotizar-btn`/`#hero-cotizar-btn` por una interfaz de acción compartida con Cotizador cuando se trabaje esa sección. No retirar los IDs antes de migrar sus consumidores.

**Comprobación para cerrar P0:** cabecera, anclas, pie y enlace de cotización siguen funcionando en `/`; rutas admin siguen montando sin pérdida de su header; el aviso PWA no se duplica y las variables visuales siguen disponibles. Esta etapa no corrige todavía el defecto funcional del dashboard administrativo.

**Aplicación con compartidos:** preparar primero C1 (documento mínimo) y C2 (tokens/base CSS), con comprobación de público **y** admin antes de reemplazar `LayoutBase`. Usar C3 para que el título y la API no dependan de valores mezclados en el shell. Tratar C7 como una migración de registro y aviso PWA, sin activar una instalación pública que el manifest actual no describe. C8 proporciona la referencia local que se comparará tras cada movimiento. La cabecera conserva temporalmente su disparador de Cotizador hasta P6.

### P1. Hero

**Archivo actual:** `components/Hero.astro`. Depende de `i18n/es.ts`, `siteConfig.api.baseUrl`, `GET /api/logos?activo=1`, la imagen de reserva `/images/hero-obra.jpg` y `Cotizador` por `#hero-cotizar-btn`.

**Relación con la base:** se monta primero en el `<main>` y aporta `id="inicio"`, destino de la navegación. La imagen inicial forma parte del HTML estático; después un script la reemplaza si hay logo activo. Es la única sección pública que consulta logos.

**Separación prevista:** la estructura visible y CSS pasarán a `visual/components/public/HeroView.astro` y `visual/styles/public/hero.css`. Un pequeño controlador de `features/hero/` consultará el logo mediante `services/api/logos.ts` y decidirá entre URL recibida y fallback. El texto seguirá en `i18n/es.ts`; la acción «cotizar» se conectará al flujo de cotización, sin que Hero conozca el DOM interno del formulario. Se conservará `id="inicio"`.

**Comprobación para cerrar P1:** con logo activo, sin logo y con fallo de API se muestra la imagen que corresponde; el título sigue presente en HTML, la navegación a Inicio funciona y el CTA abre Cotizador. Se verificará que la consulta usa la API local durante desarrollo.

**Aplicación con compartidos:** HeroView recibirá textos de C3 y URL del logo de C5; C6 decide si la imagen viene del bucket local, del dominio R2 o del fallback estático. La consulta sale del componente visual después de que exista el cliente HTTP común. Los tokens/CSS vienen de C2. El CTA sigue compatible con Cotizador hasta que P6 cambie el mecanismo de apertura. C8 cubrirá logo activo, ausente y error.

### P2. Servicios

**Archivo actual:** `components/Servicios.astro`. Lee seis entradas de `i18n/es.ts`; cada entrada referencia una imagen en `public/images/servicio-*.jpg`. No consulta la API. Aporta `id="servicios"`.

**Relación con la base:** se monta después de Hero y es el destino del enlace «Servicios» de la cabecera. El contenido de las tarjetas y sus rutas de imagen están mezclados con el diccionario de textos, mientras toda la presentación está en el propio Astro.

**Separación prevista:** `visual/components/public/ServiciosView.astro` representará la sección; si ayuda a mantener cada tarjeta, se extraerá `ServicioCard.astro` con `servicios-card.css`. Los estilos del contenedor quedarán en `visual/styles/public/servicios.css`. Los datos de las seis entradas pasarán a una fuente de contenido/configuración específica de servicios; los textos generales y etiquetas de interfaz permanecerán en `i18n/es.ts`. No se creará un servicio de API para una sección que hoy es estática.

**Comprobación para cerrar P2:** aparecen las seis entradas previstas y sus seis imágenes, el enlace `#servicios` lleva a la sección y cambiar un título o imagen de servicio requiere editar solo su dato, no el componente visual.

**Aplicación con compartidos:** separar las seis entradas del diccionario de etiquetas de C3 y pasar cada entrada como dato al componente visual; no introducir `fetch` de C5. Conservar rutas de fotos bajo `public/` según C2/C6. La prueba de C8 debe detectar una entrada o imagen faltante. La base C1 mantiene el enlace `#servicios` durante toda la migración.

### P3. Galería: contenedor y datos

**Archivo actual:** `components/Galeria.astro`. Depende de `lib/categorias.ts`, `i18n/es.ts`, `siteConfig.api.baseUrl` y `GET /api/obras?categoria=&limit=&offset=`. Aporta `id="galeria"`. `pages/index.astro` la monta solo si `siteConfig.secciones.galeria` es `true`.

**Relación con la base:** la cabecera enlaza a `#galeria`. La sección crea por JavaScript los contenedores de rieles y tarjetas, carga cinco obras por categoría, mantiene `offset/hasMore/loading` y maneja errores. La respuesta del Worker trae `imagenUrl` ya resuelta a R2. El texto del título viene del diccionario; los nombres de las seis categorías vienen de `lib/categorias.ts`.

**Separación prevista:** `visual/components/public/GaleriaView.astro` será el contenedor visible y estados vacío/error/cargando; `visual/styles/public/galeria.css` tendrá solo su presentación. `features/galeria/` controlará carga y estado por categoría; `services/api/obras.ts` hará la consulta y tipará `obras`, `total` y `hasMore`. El orden y etiquetas de categorías seguirán en una sola fuente compartida, sin copias dentro de la vista. El interruptor `siteConfig.secciones.galeria` seguirá en la página que compone la vista.

**Comprobación para cerrar P3:** cada categoría con obras genera un riel, una categoría vacía no crea contenido espurio, la ausencia total muestra estado vacío, el error de API muestra un error identificable y ninguna consulta local llega al Worker de producción.

**Aplicación con compartidos:** `config/env.ts` de C3 entrega la única base de API; C5 define consulta y tipos; C4 entrega códigos, orden y etiquetas; C6 mantiene `imagenUrl` como contrato de la respuesta. Montar el contenedor visual solo con esos datos, preservando el interruptor de `siteConfig`. Sembrar con C8 categorías vacías y ocupadas antes de extraer el controlador. No duplicar categorías o host de API en GaleriaView.

### P4. Galería: riel y tarjetas de obra

**Archivos actuales:** el riel y las tarjetas se generan dentro de `Galeria.astro` mediante cadenas HTML y un `<template>`. `TarjetaObra.astro` existe, pero no se usa: representa un mosaico con `destacado`, diferente del riel actual.

**Relación con la sección:** cada riel muestra una categoría, sus botones anterior/siguiente y su contenedor de scroll; cada tarjeta muestra imagen, título y una marca si hay video. El mismo archivo decide los anchos, la forma por categoría, la navegación y cuándo pedir más datos.

**Separación prevista:** `GaleriaRiel.astro` y `ObraCard.astro` serán responsables de la estructura de riel y tarjeta, con CSS separado en `galeria-riel.css` y `galeria-tarjeta.css`. El controlador de `features/galeria/` manejará desplazamiento y carga diferida. Se elegirá conscientemente entre adaptar `TarjetaObra.astro` al riel o retirarlo; no se conservarán dos tarjetas de obra con contratos contradictorios. Si la creación dinámica requiere JavaScript, las plantillas o funciones de render deberán mantener una única definición de estructura y usar inserción segura para títulos y URLs.

**Defecto existente que no debe preservarse:** el botón Siguiente se deshabilita al agotarse los datos del servidor aunque queden tarjetas fuera de pantalla; el gesto de scroll no dispara la carga adicional. La capacidad de desplazarse y `hasMore` se tratarán como estados distintos.

**Comprobación para cerrar P4:** con 1, 5, 6 y más obras por categoría, las flechas desplazan siempre que haya contenido fuera de pantalla; al llegar al final se descargan las obras pendientes tanto por flecha como por gesto; los controles reflejan los límites reales del scroll. Las tarjetas mantienen imagen, título y señal de video.

**Aplicación con compartidos:** GaleriaRiel y ObraCard consumen estilos de C2, categoría de C4 y objetos `Obra` tipados por C5; sus imágenes son URL entregadas conforme a C6. `features/galeria` conserva estado y llama al cliente común para cargar más. C8 ofrece casos de 1, 5 y más de 5 obras. Antes de retirar el `<template>` actual se comprobará que el nuevo render conserva una sola estructura de tarjeta y no vuelve a deshabilitar la flecha por `hasMore`.

### P5. Galería: reproducción de video

**Archivos actuales:** el `<dialog>`, iframe y conversión de URL viven en `Galeria.astro`. `VideoEmbed.astro` existe, pero no está conectado al flujo. Los enlaces se originan en `videoUrl` de la API; el código intenta convertir formatos de YouTube y abre TikTok en otra pestaña.

**Relación con la sección:** el click sobre una tarjeta con video abre el diálogo. El diálogo no tiene fuente de datos propia; recibe el enlace de la obra seleccionada. Al cerrar, el código vacía `iframe.src` para detener la reproducción.

**Separación prevista:** `VideoDialog.astro` y `video-dialog.css` contendrán la presentación y estados de abierto/cerrado. `features/galeria/video.ts` convertirá y validará enlaces compatibles; el componente visual recibirá una URL de reproducción ya preparada. Se decidirá si `VideoEmbed.astro` se adapta como parte de `VideoDialog` o se retira, evitando dos transformadores de URL. La política de proveedores debe concordar con la validación del backend; `03-modelo-de-datos-y-api.md` promete YouTube, mientras el código acepta también TikTok.

**Comprobación para cerrar P5:** enlaces YouTube admitidos abren el reproductor correcto; un enlace inválido no abre un iframe arbitrario; cerrar detiene el video; volver a abrir otra obra no reutiliza el video anterior. La decisión sobre TikTok quedará documentada antes de implementar ese caso.

**Aplicación con compartidos:** el `videoUrl` sigue llegando dentro del contrato de obra de C5; la política de enlace debe concordar con la validación del Worker y no duplicarse entre `VideoDialog` y `VideoEmbed`. C2 se ocupa del diálogo, C8 aporta obras con URL válida, ausente e inválida. No trasladar la conversión de URL al cliente HTTP ni a la carpeta visual: pertenece a la función de reproducción.

### P6. Cotizador y flujo de contacto

**Archivo actual:** `components/Cotizador.astro`. Depende de `i18n/es.ts`, `siteConfig.contacto.whatsapp` y de botones definidos fuera del componente en `LayoutBase.astro` y `Hero.astro`. El formulario solicita obra, m², interior/exterior, altura, dirección y referencia. Construye el mensaje y abre `wa.me`.

**Relación con la base:** se monta después de Galería, pero actúa como panel accesible desde la cabecera y Hero. Tiene overlay y bloqueo del scroll del documento. No existe una ruta ni sección visible de Contacto separada.

**Separación prevista:** `CotizadorView.astro` y `cotizador.css` contendrán campos, overlay y estados visibles; `features/cotizacion/` controlará apertura, cierre, lectura de campos y construcción del mensaje. Un único módulo de enlace WhatsApp tomará el número de `siteConfig` y codificará el mensaje; también lo usará el botón flotante. El enlace entre CTA y cotizador será una acción identificable y probada, no una dependencia oculta de selectores repartidos por archivos.

**Comprobación para cerrar P6:** CTA de cabecera y Hero abren el mismo formulario; cerrar restaura el scroll; enviar incluye los seis datos y el número configurado; la página no intenta llamar a un backend de contacto. Se evitará abrir WhatsApp durante pruebas automáticas mediante interceptación del enlace.

**Aplicación con compartidos:** los puntos de apertura viven en el shell público de C1 y Hero de P1; ambos usarán una acción de `features/cotizacion`. El teléfono y texto base vienen de C3, el CSS de C2 y la composición del enlace es común con P7. Este flujo no usará C5 porque no envía una petición a la API. C8 permite verificar el mensaje sin abrir una conversación real.

### P7. Botón flotante de WhatsApp

**Archivo actual:** `components/BotonWhatsapp.astro`. Construye una URL `wa.me` desde `siteConfig.contacto.whatsapp` y `mensajeCotizacion`, y contiene su propio CSS y SVG. Es independiente de la apertura del Cotizador.

**Relación con la base:** `pages/index.astro` lo monta después de Cotizador, visible de manera flotante. Ambos llevan a WhatsApp, pero hoy construyen mensajes por rutas distintas: texto base en `siteConfig` frente a mensaje armado por el formulario.

**Separación prevista:** `WhatsappButton.astro` y `whatsapp-button.css` conservarán la presentación. `features/cotizacion/whatsapp.ts` será la fuente de la construcción del enlace y del número, con entradas distintas para mensaje general y cotización detallada. El componente visual recibirá un `href` ya preparado. No se mezclará aquí lógica de apertura del Cotizador.

**Comprobación para cerrar P7:** el botón tiene enlace válido, número correcto y mensaje prellenado; continúa disponible con Galería vacía o apagada; ambos caminos de contacto codifican correctamente caracteres y espacios.

**Aplicación con compartidos:** conservar el botón en la composición de C1, usar tokens y archivo CSS de C2, y obtener número y mensaje mediante C3 y el mismo formateador de `features/cotizacion` establecido en P6. No mover el teléfono al componente ni copiar la función que construye `wa.me`. C8 verificará mensaje general y detallado con datos ficticios.

### Elementos detectados fuera de las secciones activas

- `FormaGeometrica.astro`, `TarjetaObra.astro`, `VideoEmbed.astro` y `data/mockObras.ts` no son importados por la composición pública actual. No se migrarán automáticamente: cada uno se reutilizará con un contrato claro o se retirará después de comprobar que no tiene consumidores.
- `config/tokens.ts` y `styles/global.css` son infraestructura visual transversal; no constituyen secciones de contenido.
- `lib/pwa/*`, `manifest.json` y `sw.js` afectan el comportamiento de toda la página. La actualización PWA no se resolverá dentro de Hero o Galería.
- `public/images/hero-obra.jpg` es el fallback del Hero; las imágenes `servicio-*.jpg` son de Servicios. Las obras dinámicas y logos llegan por URL de la API/R2.

## 12. Orden de integración entre compartidos y secciones públicas

```text
C8 referencia local + C3 entorno
             ↓
C1 documento/shell + C2 tokens y CSS base + C7 límite PWA
             ↓
P0 base pública
             ↓
C5 lectura API + C6 lectura de imágenes → P1 Hero → P2 Servicios
             ↓
C4 categorías + C5 lectura de obras → P3 Galería datos
             ↓
P4 riel/tarjetas → P5 video → P6 Cotizador → P7 WhatsApp
```

Este orden marca dependencias, no exige ejecutar toda la refactorización compartida de una sola vez. Por ejemplo, para P1 basta con estabilizar la lectura pública de logos en C5; las escrituras admin siguen en su implementación anterior. Para P3 se estabiliza el contrato de lectura de obras, sin rediseñar todavía formularios ni reglas de slots. Cada reemplazo conserva el contrato anterior hasta migrar el último consumidor: público y admin pueden coexistir temporalmente sin dos fuentes de verdad.

Si una tarea compartida obliga a cambiar rutas, formato JSON, categorías o nombres de variables, se hará una transición compatible y se comprobarán ambos ámbitos en la misma etapa. Al terminar la vista pública, C1–C8 deben tener dueño y contrato explícitos; los pendientes exclusivos del admin se documentarán para su fase, sin declararlos completados por la refactorización pública.

## 13. Regla para ejecutar y revisar cada paso

Antes de comenzar una sección se tomará un ejemplo local verificable de su estado. Se moverá primero la presentación sin alterar el contrato de datos; después, la lógica y sus conexiones. En cada paso se comprobará el flujo funcional de la sección y las dependencias que atraviesa (anclas, CTA, API, imágenes o PWA). Solo entonces se pasará a la siguiente. Esto permite revisar el trabajo público sección por sección, antes de diseñar en detalle la fase administrativa.

Esta ampliación identificó **las responsabilidades compartidas, todas las piezas públicas y cómo coordinar la refactorización de cada una**. La implementación posterior se registra a continuación.

## 14. Implementación de la fase pública y compartidos

### 14.1 Alcance aplicado y compatibilidad

Implementado en `codex/refactor-arquitectura-publico`. Se conservaron los cambios sin commit que ya existían. Antes de editar se guardaron el diff previo y las huellas de los archivos admin en `.work/` (artefactos locales ignorados). No se creó el commit de base previsto ni se cambió de rama durante esta ejecución: sigue pendiente seleccionar y guardar los cambios antes de alternar ramas. No hubo commit, push ni despliegue.

**Cero modificaciones durante esta tarea en `components/admin/**`, `pages/admin/**` y `layouts/AdminLayout.astro`**, verificado mediante SHA-256 antes/después. Git sigue mostrando modificaciones previas en esos archivos; no pertenecen a esta refactorización. Sus defectos funcionales registrados en la auditoría siguen pendientes. Las funciones de escritura del Worker, autenticación, firmas de subida y reglas de slots conservan su implementación. Solo cambiaron importaciones comunes, la fuente del mismo enum de categorías y la extracción de los listados públicos.

`LayoutBase.astro` es un puente hacia `PublicLayout`, por lo que el admin puede seguir usándolo y ocultar cabecera/pie como antes. Separar definitivamente su shell corresponde a la siguiente fase. `lib/auth.ts` mantiene funciones, token, cabeceras y respuesta `Response`; ahora usa el transporte común y ya no tiene una URL productiva de reserva. `config/site.ts` contiene solo negocio: no quedan consumidores de `siteConfig.api`; la API se configura exclusivamente en `config/env.ts`.

### 14.2 Estructura efectiva

```text
PortafolioDigital/
├─ Shared/contracts/categorias.ts        Códigos y tipo compartidos Front/Back
├─ tests/
│  ├─ public-contracts.mjs               Entornos, videos y Worker/D1/R2 real local
│  └─ public-browser.mjs                 Flujos públicos y compatibilidad de shells
├─ Front/
│  ├─ .env.example                      Ejemplo local sin secretos
│  ├─ .env.development.local            Ignorado: API local de esta computadora
│  └─ src/
│     ├─ pages/index.astro              Composición e interruptor de Galería
│     ├─ components/                    Wrappers públicos sin markup/CSS duplicado
│     │  └─ admin/                      Implementación previa, sin tocar
│     ├─ layouts/
│     │  ├─ DocumentLayout.astro        HTML, metadatos y tokens compartidos
│     │  ├─ PublicLayout.astro          Cabecera, main, pie y PWA
│     │  ├─ LayoutBase.astro            Puente compatible
│     │  └─ AdminLayout.astro           Implementación previa, sin tocar
│     ├─ visual/
│     │  ├─ tokens/
│     │  │  ├─ index.ts
│     │  │  └─ cssVars.ts
│     │  ├─ components/
│     │  │  ├─ shared/
│     │  │  │  ├─ UpdateNotice.astro
│     │  │  │  └─ FontLinks.astro
│     │  │  └─ public/
│     │  │     ├─ PublicHeader.astro
│     │  │     ├─ PublicFooter.astro
│     │  │     ├─ HeroView.astro
│     │  │     ├─ servicios/
│     │  │     │  ├─ ServiciosView.astro
│     │  │     │  └─ ServicioCard.astro
│     │  │     ├─ galeria/
│     │  │     │  ├─ GaleriaView.astro
│     │  │     │  ├─ GaleriaRiel.astro
│     │  │     │  ├─ ObraCard.astro      Única plantilla de tarjeta activa
│     │  │     │  └─ VideoDialog.astro
│     │  │     ├─ cotizador/CotizadorView.astro
│     │  │     └─ WhatsappButton.astro
│     │  └─ styles/
│     │     ├─ base.css
│     │     ├─ shared/pwa-notice.css
│     │     └─ public/
│     │        ├─ header.css
│     │        ├─ footer.css
│     │        ├─ hero.css
│     │        ├─ servicios/{section,card}.css
│     │        ├─ galeria/{section,rail,card,video-dialog}.css
│     │        ├─ cotizador/{drawer,form}.css
│     │        └─ whatsapp-button.css
│     ├─ features/
│     │  ├─ hero/index.ts
│     │  ├─ galeria/
│     │  │  ├─ index.ts                 Estado, paginación y desplazamiento
│     │  │  ├─ render.ts                Clona plantilla y asigna datos seguros
│     │  │  └─ video.ts                 Política de proveedores y apertura/cierre
│     │  ├─ cotizacion/
│     │  │  ├─ index.ts                 Apertura, formulario y cierre
│     │  │  └─ whatsapp.ts              Mensaje y URL común
│     │  └─ pwa/                       Registro y actualización extraídos
│     ├─ services/api/
│     │  ├─ client.ts                  Transporte y errores HTTP
│     │  ├─ types.ts                   Contratos de lectura
│     │  ├─ obras.ts
│     │  └─ logos.ts
│     ├─ config/
│     │  ├─ site.ts                    Negocio
│     │  ├─ servicios.ts               Catálogo estático
│     │  ├─ env.ts                     Única lectura de variables
│     │  ├─ validateEnv.ts             Validación comprobable sin navegador
│     │  └─ tokens.ts                  Reexportación compatible
│     ├─ i18n/                         es.ts y etiquetas de categorías
│     ├─ lib/                          auth/categorías y puentes PWA
│     └─ styles/global.css             Importa la única base visual
└─ Back/
   ├─ wrangler.toml                   Configuración productiva preservada
   ├─ wrangler.local.toml             Bindings locales independientes
   ├─ fixtures/public.sql             Datos ficticios, fuera de migraciones
   └─ src/
      ├─ index.ts                     Router y seguridad existentes
      ├─ routes/
      │  ├─ response.ts               JSON sin dependencia circular
      │  ├─ obras-lectura.ts          HTTP y serialización del listado
      │  └─ logos-lectura.ts
      ├─ repositories/                obras.ts y logos.ts: consultas D1
      ├─ storage/local.ts             Lectura de objetos R2 en desarrollo
      ├─ lib/storage.ts               Firma previa y URL pública validada
      ├─ handlers/                    Escrituras previas, sin refactorizar
      └─ middleware/                  Seguridad previa, sin refactorizar
```

Se retiraron `TarjetaObra`, `VideoEmbed`, `FormaGeometrica` y `mockObras` después de verificar que no tenían consumidores. Las fotos, iconos, manifest y service worker conservan sus rutas. No se crearon carpetas visuales de admin vacías ni se anticipó su implementación.

Actualización visual posterior: las carpetas de Servicios, Galería y Cotizador siguen la estructura detallada arriba. El nombre comercial confirmado pasó a ser «Corporacion Antony Rodriguez» en configuración, cabecera, pie, Cotizador, panel y manifest. La cabecera pública usa dos filas hasta 640 px para que el nombre completo y los enlaces quepan desde 320 px. Los componentes y estilos propios del admin siguen pendientes de separación; solo se actualizó allí el texto de marca.

### 14.3 Resultado por sección

| Sección | Resultado implementado |
|---|---|
| C1–C2 / P0 | Documento y shell separados; tokens, CSS y componentes en `visual/`; puentes para consumidores anteriores. |
| C3–C4 | Entorno validado, datos del sitio y catálogo separados, códigos de categorías únicos y etiquetas españolas en Front. |
| C5–C6 | Transporte común, contratos tipados y listados del Worker separados de SQL; JSON sin ciclo router/handlers; imágenes desde R2 local. |
| C7 | PWA extraída, aviso visual independiente. Se conserva el registro raíz en hosts remotos y no se registra en localhost. Manifest sigue siendo administrativo. |
| C8 | Fixtures de 12 murales, 6 fachadas, 5 cuadros, 1 escultura, 2 categorías vacías y 1 logo activo; pruebas usan API y bucket reales emulados. |
| P1 | Logo activo mediante servicio; fallback estático ante API vacía, fallo HTTP o error de imagen. |
| P2 | Seis servicios en catálogo, vista y CSS separados. |
| P3 | Estado por categoría, vacío explícito, errores independientes y reintento. |
| P4 | Plantilla de tarjeta única, títulos con `textContent`; flechas dependen del scroll restante y carga por gesto o botón. |
| P5 | YouTube HTTPS: watch, youtu.be, embed y shorts con ID válido. TikTok HTTPS de hosts reconocidos mantiene apertura externa; nunca pasa al iframe. URLs inválidas no activan reproducción. Cierre por botón, exterior o Escape detiene el iframe. |
| P6–P7 | CTA mediante `data-action`, controlador separado, bloqueo de scroll por clase, cierre/restauración de foco y una función común de enlace WhatsApp. |

La validación de video en escrituras del backend continúa como estaba; endurecerla queda para la fase administrativa. El público restringe la reproducción de enlaces existentes sin cambiar el contrato JSON. Se mantuvieron contenidos y decisiones visuales existentes, incluidos textos de marca previos; esta fase no rediseña la interfaz.

### 14.4 Ejecutar el entorno local

Requisitos: dependencias instaladas en `Front`, `Back` y, para las pruebas de navegador, en la raíz (`playwright`). Las pruebas con importación directa de TypeScript se ejecutaron con Node 24.15.0 y Edge instalado.

1. Crear `Front/.env.development.local` a partir de `.env.example` con `PUBLIC_API_BASE_URL=http://127.0.0.1:8787`. Ya está preparado en esta computadora y está ignorado por Git. El `.env` remoto previo se conservó; el archivo específico de desarrollo lo sobreescribe en ese modo. Una variable exportada por el proceso tiene prioridad: si apunta a remoto, desarrollo falla expresamente.
2. Desde `Back`, ejecutar en orden:

   ```powershell
   npm.cmd run db:init:local
   npm.cmd run db:seed:local
   npm.cmd run media:seed:local
   npm.cmd run dev
   ```

   Los tres primeros comandos usan explícitamente `wrangler.local.toml` y `--local`. La semilla reemplaza únicamente sus IDs `fixture-*`; debe usarse en esta base de pruebas, nunca como migración productiva. La imagen se copia desde `Front/public/images/hero-obra.jpg` al bucket emulado. No se necesitan secretos ni claves R2 productivas.
3. Desde `Front`, ejecutar `npm.cmd run dev -- --background`. Administrar el servidor con `npm.cmd run astro -- dev status`, `logs` o `stop`. Abrir la URL local que reporte Astro (normalmente `http://localhost:4321`). Para probar un build estático usar `npm.cmd run build:local` y `npm.cmd run preview`.
4. Usar un perfil de navegador limpio. Si ese origen ya tenía un service worker, eliminar su registro y datos del sitio antes de comparar ramas; no registrar uno nuevo no elimina automáticamente uno antiguo. Las pruebas automatizadas crean un contexto limpio.

`GET /api/media/<clave>` devuelve bytes del bucket únicamente cuando `LOCAL_MEDIA=true` **y** el hostname de la solicitud es local. En producción responde 404. En el momento de esta fase todavía no había subida local; la implementación posterior se documenta en la sección 16.

### 14.5 Verificaciones y límites

Comprobaciones ejecutadas:

- `Front`: `npm.cmd run check` → 0 errores, 0 warnings y 4 hints previos en SW/admin.
- `Back`: `npm.cmd run typecheck` → correcto.
- `Front`: build local y build de producción → correctos. Build de producción con URL localhost → rechazado como se esperaba.
- Raíz: `node --test tests/public-contracts.mjs` → 3 pruebas correctas: configuración, política de video y Worker local con D1/R2, incluyendo rechazo 401 de escritura sin token.
- Raíz: `node tests/public-browser.mjs` → correcto con el Worker local iniciado y el Front compilado en modo desarrollo. Comprueba 1/5/6/12 obras, scroll/flechas, errores/reintento, logo activo/ausente/error, video/Escape, seis campos del cotizador y enlace WhatsApp sin enviar mensajes, seis servicios, shells admin y ausencia de solicitudes a Worker/R2 productivos.
- Raíz: `node tests/public-browser.mjs http://localhost:4321` → correcto también contra Astro en modo desarrollo, incluidos los imports del contrato compartido fuera de `Front`. Al cerrar esta tarea quedaron Astro en `localhost:4321` y el Worker en `127.0.0.1:8787` disponibles localmente.
- Capturas de público móvil/escritorio inspeccionadas en `.work/screenshots/`. No constituyen una prueba de igualdad de píxeles con la versión anterior ni una auditoría de diseño. Las fuentes de Google y proveedores de video son recursos externos de la interfaz; la separación comprobada se refiere a API, base de datos y almacenamiento propios.
- Huellas SHA-256 de archivos admin anteriores/posteriores: sin cambios.

`git diff --check` del árbol completo todavía señala espacios finales en cambios previos de administración y de escritura de obras; se conservaron para no mezclar limpieza de esos archivos con esta fase.

Las pruebas de errores/vacíos interceptan respuestas en navegador; las de lectura y paginación principales usan el Worker y almacenamiento locales. Las pruebas bloquean navegación externa, por lo que comprueban URL, apertura y cierre de reproductor, no reproducción real de un video remoto ni envío de WhatsApp.

Pendiente antes de producción: verificar variables reales de Pages, dominio de `R2_PUBLIC_URL`, bindings, secretos y Cloudflare Access; revisar los cambios y guardarlos en commits antes de cambiar de rama; integración por PR. Cambiar de rama no altera archivos ignorados ni la configuración de Cloudflare. `npm run build` utiliza el modo producción y rechaza API localhost; `build:local` nunca debe usarse para desplegar. La configuración productiva de `wrangler.toml` no se modificó. La instalación PWA real en móvil y los defectos administrativos de la auditoría quedan para su propia fase.

## 15. Separación visual de la administración

Se implementó la fase visual del panel en la rama de trabajo `codex/refactor-arquitectura-publico`, conservando los cambios locales previos. Esta sección describe el estado posterior a la sección 14; las referencias allí a «admin sin tocar» son históricas. No hubo commit, push ni despliegue.

### 15.1 Estructura efectiva

```text
Front/src/
├─ pages/admin/                         Rutas, redirección de login y composición
├─ layouts/
│  ├─ DocumentLayout.astro              HTML, metadatos, fuentes y tokens comunes
│  └─ AdminLayout.astro                 Guardia de sesión y composición del shell
├─ components/admin/                    Controladores y scripts existentes
│  ├─ AdminHeader.astro                  Cierre de sesión
│  ├─ Login.astro                        Autenticación
│  ├─ Dashboard.astro                    Consulta y eventos de obras
│  ├─ DashboardLogos.astro               Consulta y eventos de logos
│  ├─ FormularioObra.astro               Guardado, imagen y slots
│  ├─ FormularioLogo.astro               Guardado e imagen
│  └─ Paginacion.astro                   Navegación de páginas
└─ visual/
   ├─ templates/admin/                   HTML dinámico y escape de contenido
   │  ├─ html.ts
   │  ├─ obras.ts                         Slots y tarjetas de obras
   │  └─ logos.ts                         Logo activo y almacén
   ├─ components/admin/
   │  ├─ shell/AdminShell.astro
   │  ├─ header/AdminHeaderView.astro
   │  ├─ login/LoginView.astro
   │  ├─ obras/{ObrasListView,ObraFormView}.astro
   │  ├─ logos/{LogosListView,LogoFormView}.astro
   │  └─ shared/PaginationView.astro
   └─ styles/admin/
      ├─ shell/layout.css
      ├─ header/header.css
      ├─ login/{page,login}.css
      ├─ obras/{obras-lista,obras-slots,obras-tarjetas,obra-formulario,obra-slots}.css
      ├─ logos/{logos-lista,logo-activo,logos-almacen,logo-formulario}.css
      └─ shared/{paginacion,state}.css
```

Cada vista conserva los identificadores y clases usados por su controlador. Los CSS tienen un selector raíz `data-admin-view` que evita que las reglas homónimas de los dos dashboards o los dos formularios se crucen. Los estilos de elementos creados con `innerHTML` también se limitan a la vista correspondiente. Su HTML se genera en plantillas visuales separadas y escapa el contenido recibido de la API. Los archivos de slots, tarjetas, logo activo y almacén permiten corregir esas áreas sin editar el resto del listado. La visibilidad y los errores de formularios se alternan con clases, con sus reglas en CSS.

`AdminLayout` y la ruta de login componen directamente `DocumentLayout`; ya no montan la cabecera y el pie públicos para esconderlos. Ambos conservan el inicio de PWA y el aviso de actualización. El nombre comercial del encabezado y los títulos se obtiene de `config/site.ts`. Las páginas del panel tienen un solo `<main>`.

Al no quedar consumidores, se retiraron los puentes `layouts/LayoutBase.astro` y `styles/global.css`. Las referencias a ellos en las secciones de diagnóstico corresponden al estado anterior a ambas fases.

### 15.2 Cambio funcional acotado y verificación

Los controladores de obras y logos ahora ejecutan su primera carga al montarse. Antes solo escuchaban eventos `admin:load-dashboard-*`, que ninguna ruta emitía al entrar, causando los listados vacíos registrados en la auditoría. Se mantuvieron las consultas, IDs, eventos de paginación y formularios. A 320 px se redujo el espacio lateral del shell y los filtros de obras se apilan para evitar el desbordamiento horizontal; a 390 y 1280 px también se comprobó el ancho.

- `npm.cmd run build:local` genera las nueve rutas sin errores.
- `npm.cmd run check` informa 0 errores, 0 warnings y 4 hints existentes.
- `node tests/admin-visual.mjs` comprueba shell independiente, login, listados, formularios, CSS de slots/tarjetas/logos/paginación, carga inicial con respuestas locales simuladas y ausencia de desbordamiento en 320/390/1280 px. No usa credenciales ni servicios de producción.
- `node tests/public-browser.mjs` volvió a pasar con el Worker, D1 y R2 locales después del cambio de `DocumentLayout`, sin romper la portada ni las rutas compartidas.

Al cerrar esta fase todavía quedaba pendiente probar el recorrido autenticado real de creación/edición y subida con almacenamiento local. La sección 16 registra la solución y esas pruebas. Siguen pendientes los defectos funcionales de limpieza de datos e imágenes señalados en `09-auditoria-funcional-2026-10-11.md`, la comprobación de Cloudflare Access y la revisión antes de integración a producción. Esta fase no rediseña la estética del panel.

## 16. Pruebas completas del panel sin desplegar

El panel puede probarse contra el Worker, D1 y R2 locales. `Back/wrangler.local.toml` activa `LOCAL_MEDIA` y `LOCAL_UPLOAD`; `Back/wrangler.toml` no activa ninguna de esas rutas. La subida local usa un enlace de `PUT` firmado por el Worker y válido cinco minutos. El navegador envía el archivo al mismo Worker local, que comprueba firma, clave, tipo de imagen y tamaño máximo de 10 MiB antes de guardarlo en el binding R2 local. El contrato de `upload-url` y la clave que se guarda en D1 se conservan. En producción continúa el enlace firmado hacia R2 por S3 y la lectura mediante `R2_PUBLIC_URL`.

### 16.1 Preparar el entorno

1. En `Front/.env.development.local`, establecer `PUBLIC_API_BASE_URL=http://127.0.0.1:8787`. Este archivo está ignorado por Git y ya existe en esta computadora. La validación de entorno rechaza una API remota en modo desarrollo.
2. Desde `Back`, ejecutar `npm.cmd run secrets:init:local`. Crea `Back/.dev.vars` con valores aleatorios de `JWT_SECRET` y `ADMIN_SECRET` solo si no existe; no imprime los secretos y Git ignora el archivo. Nunca se copian secretos de Cloudflare. Para iniciar una base nueva ejecutar `npm.cmd run db:init:local`, `npm.cmd run db:seed:local` y `npm.cmd run media:seed:local`. En esta computadora la base y la imagen de muestra ya están preparadas.
3. Desde `Back`, ejecutar `npm.cmd run dev`. Este comando selecciona `wrangler.local.toml` y `--local`; la API queda en `http://127.0.0.1:8787`. Desde `Front`, ejecutar `npm.cmd run dev -- --background`; comprobar la URL con `npm.cmd run astro -- dev status` (normalmente `http://localhost:4321`).
4. Abrir `/admin/login` en el Front local. El valor de `ADMIN_SECRET` de `Back/.dev.vars` es la contraseña de prueba. El token de sesión queda en el navegador local; para una prueba limpia usar un perfil o contexto nuevo. Las escrituras, imágenes y cambios de D1 quedan en la persistencia local de Wrangler.

`CF_ACCESS_TEAM` queda sin configurar en local, por lo que la barrera de Cloudflare Access se omite únicamente para estas pruebas. Esa integración, las variables de Pages y el dominio de R2 productivo requieren comprobación separada antes de integrar o desplegar. Una prueba local no certifica la configuración de borde de Cloudflare.

### 16.2 Pruebas reproducibles y límites

Con el Worker local encendido, desde la raíz se pueden ejecutar `node tests/admin-local-api.mjs` y `node tests/admin-local-browser.mjs`. La segunda prueba usa el build estático de `Front`, por lo que antes requiere `cd Front; npm.cmd run build:local`. Ambas leen la contraseña local sin mostrarla y crean registros de prueba temporales que eliminan al terminar. No contactan la API ni R2 de producción.

El flujo real de API pasó: login, rechazo de subida sin firma y de tipo de imagen distinto al firmado, subida y lectura de bytes desde R2 local, creación, consulta, edición y borrado de una obra y un logo. La prueba de navegador pasó con Edge: login en la interfaz, subida de imagen, creación, listado y edición de obra y logo, sin solicitudes a los hosts productivos. `npm.cmd run typecheck` en `Back` pasó. El generador de secretos conservó correctamente un `.dev.vars` existente.

Estas pruebas demuestran que el recorrido principal puede ejecutarse sin producción; no sustituyen una revisión funcional de todos los casos de la auditoría. Siguen pendientes, entre otros, vaciar descripción/video al editar, limpieza del archivo al reemplazar un logo, revisión de migraciones de slots y comprobación de Access real. No se hizo commit, push ni despliegue durante esta preparación.

## 17. Sincronización de eliminaciones en el panel

La eliminación de una obra del almacén puede afectar también su posición destacada, y la eliminación de un logo puede afectar el bloque del logo activo. Los controladores de ambas vistas ahora comprueban el resultado HTTP de la mutación y esperan a recargar los bloques relacionados. Cada carga lleva una versión para descartar respuestas anteriores que lleguen tarde. Si la API rechaza el borrado, se informa del error y el elemento permanece visible. El Worker confirma primero la eliminación en D1 y después limpia la imagen de R2, de modo que un fallo de base de datos no deje un registro destacado apuntando a una imagen ya borrada.

El formulario nuevo de obra muestra el bloque de posiciones debajo de Categoría desde el inicio, con una indicación para elegir categoría. Al elegirla aparecen las cinco posiciones, incluso si están vacías; se seleccionan por toque o teclado. Se añadió la zona de arrastre de imagen y el botón Cancelar previstos en `arquitectura-slots.md`. En edición, el slot actual se marca correctamente después de cargar la obra y se presenta como bloque oscuro. La estructura de rutas del panel evolucionó desde la SPA descrita en ese documento, pero mantiene el recorrido de lista a formulario y regreso.

Verificación: `tests/admin-delete-sync.mjs` comprueba borrado de obra destacada en mural y cuadro, rechazo HTTP sin quitar la obra, borrado de logo activo y selección de slots en creación/edición. `tests/admin-visual.mjs` y `tests/admin-local-browser.mjs` también pasaron; este último usa el Worker, D1 y R2 locales con subidas reales. No se desplegó a producción.

La preparación para integrar estos cambios en `production`, con puertas de prueba, revisión de Cloudflare y recuperación, se documenta en `12-procedimiento-promocion-production.md`. Su estado inicial es no listo para merge por los defectos y configuraciones aún pendientes.

## 18. Decisiones para el nuevo flujo público

**Fecha:** 17 de octubre de 2026. Estas decisiones orientan el prototipo nuevo; no describen funcionalidades ya implementadas salvo donde se indica.

### 18.1 Identidad, contacto y categorías

- El número de WhatsApp confirmado es `+51 949 772 875` y se conserva como destinatario. `siteConfig.contacto.whatsapp` puede almacenarlo con formato legible; `features/cotizacion/whatsapp.ts` elimina los caracteres no numéricos antes de construir el enlace `wa.me`.
- Los identificadores internos de categorías permanecen estables: `mural`, `escultura`, `cuadro`, `restauracion`, `logo` y `fachada`. No se renombran los valores almacenados en D1 ni los contratos del Worker para cambiar el texto comercial.
- La configuración pública de servicios será una sola fuente en `Front/src/config/servicios.ts` para cada ID, nombre público, número y orden del dock, recurso visual y categoría que se precarga en el cotizador. Los seis servicios comparten la misma plantilla de galería; no hay una variante comercial. El dock, las vistas de servicio y los filtros públicos derivarán sus nombres de ese catálogo; no mantendrán mapas paralelos en `i18n/categorias.ts` o `i18n/es.ts`. Los lemas, títulos editoriales habilitados y descripciones editables se leerán de D1 mediante las claves fijas de `textos`, según `13-propuesta-reestructuracion-base-datos.md`. La tabla D1 `servicios` solo materializará los seis IDs para relacionar obras, sin duplicar nombres ni orden.
- El contrato compartido seguirá siendo dueño de los IDs y del tipo `Categoria`. Las etiquetas administrativas pueden permanecer neutrales y separadas para que el cambio de nombres de marketing no altere incidentalmente el panel. Los tipos de las respuestas de obras deben usar `Categoria` en lugar de `string` donde corresponda.
- Orden comercial del dock: `mural`, `escultura`, `cuadro`, `restauracion`, `logo`, `fachada`, con los nombres «Murales monumentales», «Esculturas», «Cuadros personalizados», «Restauración», «Letras y logotipos» y «Pintado de fachadas».

### 18.2 Navegación SPA y carga actual de galerías

Se conserva la experiencia de una sola página sin recargas, con header, dock y WhatsApp persistentes, pero el código y los datos se dividen por vista y responsabilidad. SPA describe cómo se navega; no obliga a renderizar ni descargar todo el catálogo al entrar. La entrada Astro compone el shell y la vista activa, mientras controladores separados gestionan navegación, cotizador, archivo, galerías de servicio y lightbox.

Se conserva el patrón de carga que ya usa el sitio público: al iniciar la página, la galería consulta en paralelo las seis categorías y solicita hasta cinco obras por categoría. El Hero también consulta el logo activo. No se cambia esta carga inicial por consultas diferidas al entrar a cada vista; la decisión se basa en que el comportamiento actual ha sido aceptable con el catálogo disponible. El navegador conserva la carga diferida de imágenes que ya declaran `loading="lazy"`. Los cambios de vista pueden iniciar su transición de 400 ms mientras se resuelven sus datos, mostrando un estado de carga local si hace falta.

La lectura de los nuevos textos editables será una consulta adicional agrupada y reutilizada por las vistas; no modificará ni repetirá las seis consultas de obras ni la del logo activo. Mientras se resuelve, la interfaz tendrá contenido genérico de respaldo para evitar una vista vacía.

La implementación mantendrá explícitamente ese contrato de carga: `Front/src/features/galeria/index.ts` inicializa los seis rieles mediante `Promise.all`, cada petición obtiene hasta cinco obras y el Hero consulta el logo activo. La separación en vistas no debe duplicar las solicitudes ni cambiar silenciosamente su momento de ejecución. Se mantendrán estados independientes de carga, vacío, error y reintento por vista/categoría.

Las vistas y controladores se separarán por feature para que una falla de galería, cotización o lightbox no dependa de un módulo monolítico. La navegación deberá conservar el retorno con Atrás/Adelante del navegador y, al cerrar un lightbox, restaurar la vista, el filtro y la posición desde la que se abrió. En móvil, el gesto entre servicios no interceptará el desplazamiento vertical, las miniaturas, carruseles ni controles interactivos; toda acción tendrá alternativa accesible por botones y teclado. Las transiciones respetarán `prefers-reduced-motion`.

### 18.3 Flujo funcional de navegación

Este flujo especifica cómo se conectan las vistas propuestas. Es una experiencia de una sola página: las vistas principales cambian sin recargar el documento, y el header, el dock inferior y el botón flotante de WhatsApp permanecen disponibles según la composición responsive.

1. **Entrada:** abrir `/` presenta Inicio. Desde allí se llega a Inicio, Obras, Sobre nosotros o Contacto mediante el header; se puede abrir el cotizador, seleccionar cualquiera de los seis servicios desde el dock o iniciar una conversación desde WhatsApp.
2. **Header:** el monograma AR y el nombre de la corporación devuelven a Inicio. Inicio muestra la portada; Obras abre el archivo; Sobre nosotros abre la presentación del artista; Contacto abre las opciones de contacto. Cotizar proyecto abre el cotizador en el paso Obra sin categoría precargada. En móvil el menú se despliega y se cierra después de seleccionar un destino.
3. **Inicio:** el CTA abre el cotizador en Obra; la tarjeta de perfil abre Sobre nosotros; una tarjeta del dock abre la categoría correspondiente; WhatsApp abre un mensaje inicial usando el número confirmado `+51 949 772 875`.
4. **Dock de servicios:** seleccionar una tarjeta establece la categoría activa y presenta su vista con una transición aproximada de 400 ms. La tarjeta seleccionada se reconoce por número y estilo. En móvil, la tira horizontal admite desplazamiento y ajuste para centrar la tarjeta activa.
5. **Los seis servicios usan una plantilla de galería común:** Murales monumentales, Esculturas, Cuadros personalizados, Restauración, Letras y logotipos y Pintado de fachadas muestran Volver al inicio, la información del servicio, Cotizar este servicio, miniaturas, perfil compacto y una obra activa grande. Elegir miniatura o usar las flechas cambia la imagen activa con fundido de 400 ms; pulsar la imagen abre el lightbox. La primera obra devuelta por la API —ordenada con posiciones destacadas primero— ocupa el Hero. El CTA abre el cotizador con esa categoría precargada. El perfil compacto abre Sobre nosotros y Volver al inicio abre Inicio. En móvil el contenido puede desplazarse verticalmente; un gesto horizontal fuera de miniaturas, controles y elementos interactivos cambia al servicio anterior o siguiente.
6. **Obras:** Obras en el header abre el mosaico. Todas y los filtros de categoría limitan las tarjetas visibles. Seleccionar una obra abre el lightbox; cerrarlo vuelve al archivo conservando filtro y posición.
7. **Sobre nosotros:** se abre desde el header o una tarjeta de perfil. Conversemos sobre tu proyecto dirige a Contacto. El header y el dock siguen permitiendo navegación a las demás vistas.
8. **Contacto:** se abre desde el header. Cotizar y las acciones que solicitan información conducen al cotizador. El usuario puede seguir navegando por header y dock.
9. **Cotizador:** el panel lateral tiene los pasos Obra, Medidas y Contacto. Obra recoge servicio/proyecto y detalles; Medidas recoge metros cuadrados aproximados, interior/exterior y piso/altura; Contacto recoge nombre, teléfono o WhatsApp y correo. Continuar avanza, Volver retrocede. Si se abre desde un servicio, este se precarga. Enviar por WhatsApp crea un resumen de las respuestas y abre WhatsApp para que el usuario lo envíe. Como aún no se configuró un destinatario comercial distinto, se utiliza el número confirmado del sitio. Cerrar, Escape o clic fuera descartan el panel.
10. **Lightbox:** se abre desde una obra de galería o el mosaico. Muestra imagen y datos disponibles. Flechas recorren el conjunto de obras; cerrar, Escape o clic fuera cierra la vista y restaura la página, filtro y posición de origen.
11. **Móvil:** el header usa menú desplegable; el dock se desplaza horizontalmente y el contenido largo admite desplazamiento vertical. Los gestos de cambio de servicio solo se reconocen fuera de galerías y controles, y cada gesto tiene una alternativa mediante botones accesibles.

El historial del navegador debe reflejar los cambios de vista para que Atrás y Adelante funcionen sin recargar la página. El estado de servicio, filtro y obra seleccionada debe poder restaurarse. La apertura del cotizador es un panel superpuesto y no cambia la vista base.

### 18.4 Especificación UI/UX del rediseño público

Esta especificación recoge el resultado visual y la interacción acordados. Su implementación local en la rama `feature/rediseno-integral` se registra al final de esta sección; esa implementación sigue en validación y no se ha publicado.

#### Sistema visual y estructura persistente

- La paleta usa verde azulado profundo `#12262A`, superficies verde azulado, crema `#FAF8F2` y dorado `#D9A520`. Los títulos usan Cormorant Garamond y la interfaz DM Sans.
- Header, dock inferior y botón flotante de WhatsApp son elementos persistentes durante la navegación. Las vistas cambian con transiciones de 400 ms, reducidas o eliminadas cuando el sistema solicita `prefers-reduced-motion`.
- El header presenta monograma AR, nombre «Corporación Artística Antony Rodríguez», enlaces Inicio, Obras, Sobre nosotros y Contacto, y CTA Cotizar proyecto. En móvil los enlaces pasan a un menú desplegable.
- El dock contiene las seis categorías con número, imagen y nombre. Cada imagen de portada se edita desde Admin > Contenido > Servicios en un espacio fijo `service.<id>.cover`; si todavía no se cargó una, se usa la ruta local configurada para esa categoría. Cambiar estas imágenes no permite crear, eliminar, renombrar ni reordenar servicios. En móvil el dock pasa a una tira horizontal desplazable. WhatsApp permanece en una posición flotante separada del dock, las imágenes y otros controles.
- En móvil las vistas largas admiten desplazamiento vertical; las galerías horizontales conservan su propio desplazamiento y no deben confundirse con gestos de cambio de servicio.

#### Vista 1 — Inicio

La portada ocupa la pantalla disponible con una fotografía de fondo y un degradado oscuro hacia la izquierda para mantener el texto legible y dejar visible la obra al otro lado. La columna principal comienza 40 px debajo del header y presenta, en este orden: etiqueta «Artista plástico / Huánuco»; título «Capturando la esencia en cada trazo», con «esencia» en cursiva dorada; descripción breve de servicios; CTA dorado «Cotizar proyecto»; y tarjeta de perfil separada del CTA por 32 px.

La tarjeta de perfil tiene hasta 400 px, fondo crema translúcido con blur, borde fino y barra dorada a la izquierda. Contiene avatar cuadrado, cargo, nombre, frase y especialidades. Al pasar el cursor se ilumina el borde y se desplaza la flecha; al activarla abre Sobre nosotros. Si no existe fotografía autorizada, usa monograma AR. El dock permite entrar directamente a cualquiera de las seis categorías.

#### Vista 2 — Obras

El archivo visual muestra título «Obras con historia», una introducción breve y filtros Todas, Murales, Esculturas, Cuadros, Restauración, Letras o Fachadas. Debajo aparece un mosaico fotográfico. Al pasar el cursor, la tarjeta presenta un degradado con categoría y título; al seleccionarla, abre el lightbox con la obra ampliada y los datos disponibles. El archivo tiene desplazamiento interno dentro del marco general de la aplicación y conserva filtro y posición al cerrar el lightbox.

#### Vista 3 — Sobre nosotros

La composición enfrenta una fotografía con la presentación del artista. El texto describe su práctica desde Huánuco y su relación con realismo, memoria y espacios cotidianos. Incluye tres indicadores destacados y un enlace para continuar a Contacto. El contenido se alcanza desde el header y desde las tarjetas de perfil. Las fotografías y cifras requieren verificación antes de publicación.

#### Vista 4 — Contacto

La vista presenta bienvenida, invitación a conversar sobre el proyecto y CTA para iniciar una cotización. A su lado agrupa opciones para solicitar información por teléfono o WhatsApp, conversar sobre una idea, consultar la ubicación en Huánuco y visitar Instagram y Behance. No se inventan números, correos, ubicaciones exactas ni perfiles. Las acciones de solicitud de información llevan al cotizador; WhatsApp usa el número confirmado `+51 949 772 875`.

#### Vistas 5–10 — Plantilla de galería común

Los seis servicios comparten fondo grafito `#141616`, columna de información izquierda y obra principal derecha. La columna incluye Volver al inicio, número y nombre del servicio en dorado, título, descripción breve, CTA «Cotizar este servicio», miniaturas y perfil compacto. La galería muestra la obra activa en gran tamaño, borde dorado y degradado inferior con título, ubicación y año únicamente cuando estén verificados. Cambiar miniatura aplica fundido de 400 ms; pulsar la obra abre el lightbox.

El perfil compacto contiene avatar AR, cargo, nombre y flecha; no incluye frase ni especialidades y abre Sobre nosotros. El CTA precarga la categoría. Murales monumentales usa el lema «Historias en grandes muros»; Esculturas, «Forma que respira»; Cuadros personalizados, «Tu historia, enmarcada»; Restauración, «Memoria que perdura»; Letras y logotipos, «Tu marca, a gran escala»; Pintado de fachadas, «Identidad en cada muro». Los seis servicios comparten estructura y comportamiento: la configuración central determina nombre comercial, recurso visual, orden y categoría precargada; los lemas y las descripciones editoriales autorizadas se leen de `textos` con respaldo genérico. La primera obra ordenada por destacados aparece en el Hero; si no existen obras, se muestra el recurso visual de referencia del servicio. Un título que repite el nombre comercial queda fijo.

Letras y logotipos describe identidad visual pintada a mano. Pintado de fachadas presenta color e identidad aplicados a fachadas. Cada servicio conserva su contenido y sus obras, con la misma composición de galería e interacciones.

#### Cotizador

El cotizador aparece como panel lateral oscuro, sin cambiar de página. Incluye encabezado «Cotizador» y progreso de tres pasos: Obra, Medidas y Contacto. En Obra se indica servicio/proyecto y detalles; en Medidas, metros cuadrados aproximados, interior/exterior y piso/altura; en Contacto, nombre, teléfono o WhatsApp y correo. Un servicio de origen se precarga cuando corresponde. Continuar avanza y Volver regresa. «Enviar por WhatsApp» prepara el resumen y abre el destino para que el usuario lo envíe. El panel se cierra con su botón, Escape o clic fuera.

#### Lightbox

El lightbox ocupa la pantalla con fondo oscuro. Centra la imagen conservando proporciones y muestra debajo categoría, título, ubicación y año solo si están disponibles y verificados. Flechas laterales recorren las obras; el botón de cierre, Escape o clic fuera cierra la ampliación. Al cerrarse, devuelve al contexto exacto de origen.

#### Contenido e imágenes

Las imágenes y fichas del archivo incluidas como referencias visuales no se considerarán prueba de trabajos reales. Antes de publicar se sustituirán o validarán con el artista. Tampoco se inventarán fotografía de perfil, biografía, cifras, enlaces sociales, ubicación ni año. Cuando no haya retrato aprobado, se usa monograma AR. El catálogo actual de obras no incluye ubicación ni año; se decidirá si se amplían el modelo, API y formulario administrativo o si esos metadatos se omiten hasta verificarlos.

### 18.5 Dependencias de contenido por resolver antes de publicar

- Las fichas actuales de obra no incluyen ubicación ni año como campos públicos. No se mostrarán datos inventados; antes de incorporar esas leyendas se decidirá si se agregan campos al modelo, API y formulario administrativo o si se omiten cuando no estén verificados.
- Para las cuatro miniaturas de galería se definirá una única regla de selección basada en los slots existentes o en `destacado`; no se crearán dos mecanismos de curación que puedan divergir.
- La biografía, cifras de trayectoria, enlaces sociales y fotografías deben ser confirmados por el artista. Si no se entrega una foto, se conserva el monograma AR indicado en la especificación.

### 18.6 Criterios para aceptar esta fase

- Abrir Inicio conserva las seis consultas paralelas de categoría (hasta cinco obras cada una) y la consulta del logo activo; navegar entre vistas no duplica esas cargas sin necesidad.
- Cambiar de vista no recarga el documento, y Atrás/Adelante y el cierre de lightbox recuperan el contexto de navegación.
- Las categorías mantienen sus IDs actuales; una única configuración pública produce nombres y orden consistentes en dock, filtros, vistas y cotizador, sin cambiar etiquetas de Admin por accidente.
- La interfaz muestra estados de carga, vacío y error por categoría; imágenes no visibles no retrasan la primera vista.
- Se validan el menú móvil, los gestos, controles de teclado y movimiento reducido, además de los anchos responsive definidos en la auditoría visual.

### 18.7 Estado de implementación local

- La portada, Obras, Sobre nosotros, Contacto y las seis vistas de servicio están compuestas como una SPA con configuración de servicios centralizada, historial de navegación, transiciones y estilos públicos separados por responsabilidad.
- El cotizador, filtros, galerías y lightbox están conectados al Worker local. Se mantienen las consultas iniciales de obras por categoría y la consulta del logo activo; la comprobación integrada registró 11 solicitudes iniciales, todas locales.
- El modelo local incorpora `ubicacion` y `anio` opcionales. La interfaz solo muestra esos valores si están presentes; los fixtures no se presentan como trabajos verificados.
- Las fuentes DM Sans y Cormorant Garamond se sirven desde paquetes instalados en Front para que la carga local no dependa de Google Fonts.
- La vista de Sobre nosotros conserva contenido genérico y placeholders; no se agregaron estadísticas ni enlaces de contacto sin verificar.
- La comprobación de Playwright valida API, CRUD y slots en D1/R2 local, edición de textos y foto, navegación SPA, filtro, lightbox, cotizador precargado, menú móvil, historial y ausencia de desbordamiento a 390 px. No certifica dispositivos móviles reales ni una futura publicación.
