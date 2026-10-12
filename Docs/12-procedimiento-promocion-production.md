# 12 — Procedimiento para promover la refactorización a `production`

**Estado al 11 de octubre de 2026:** preparación local en curso; sin push, PR ni despliegue de la refactorización. La rama de trabajo es `codex/refactor-arquitectura-publico` y parte de `main` (`c0c8d6f`). `origin/production` permanece en `e4caf69`: el PR incorporaría también el commit que hoy diferencia `main` de `production`. No se encontró un archivo Gitflow `.md` en el árbol ni en el historial local; se sigue la ruta de PR hacia `production` descrita en `10-plan-refactorizacion-arquitectura.md` y la guía local `git-workflow`.

## 1. Condiciones previas: todavía no abrir la promoción final

| Condición | Estado y acción necesaria |
|---|---|
| Protección de administración | **Bloqueante.** El código local ahora exige el JWT de Access con firma, emisor y `aud` en todas las rutas privadas, incluido login; el bypass solo funciona en Wrangler local sobre loopback. La visita anónima a `/admin/login` en Pages redirige a Cloudflare Access. En cambio, un GET anónimo a `/api/auth/login` en el host productivo del Worker devolvió JSON `401 NO_AUTENTICADO` generado por la aplicación, señal de que esa ruta llegó al Worker sin bloqueo de Access. Antes del despliegue se necesita cubrir la API privada con Access y probar sesión autorizada, cookies/CORS y rechazo anónimo. Véase F5 del informe 09. |
| Datos y entradas | F3, F4, F7 y F8 corregidos en el código local y cubiertos por pruebas. D1 productiva tiene seis obras: un mural en `orden=1` y cinco obras en almacén (`orden=0`); no hay slots duplicados. **No ejecutar `001_asignar_orden_inicial.sql` en producción**: llenaría slots ahora vacíos y cambiaría el contenido destacado. La migración nueva es idempotente en pruebas locales, pero no se necesita para la promoción. |
| Despliegue de Pages | Wrangler confirma que `portafolio-front` tiene integración Git y que `production` es la rama productiva; el último despliegue productivo registra fuente `c0c8d6f`, mientras Git remoto conserva `production` en `e4caf69`. Determinar si ese despliegue se hizo manualmente y confirmar el control de builds automáticos antes del PR/merge. |
| Configuración | Se confirmaron el binding D1 `portafolio-db`, el bucket R2 `portafolio-archivos` y los **nombres** de secretos existentes. Faltan `CF_ACCESS_AUD` y `FRONTEND_ORIGIN` en `portafolio-api`: con el nuevo Worker, el panel fallaría cerrado hasta configurarlos. Confirmar el `aud` de **la aplicación Access que cubra la API**, no el de Pages si son aplicaciones distintas. Verificar también Pages `PUBLIC_API_BASE_URL`, `RATE_LIMITER`, `LOCAL_MEDIA`/`LOCAL_UPLOAD` ausentes, CORS y subida firmada real sin mostrar secretos. El dashboard Cloudflare no tenía sesión web en este entorno; Wrangler sí permitió las consultas de inventario. |
| Contenido del cambio | Revisar el diff completo desde `production`. El commit ya presente en `main` añade, entre otros, `Front/deployments.txt` y varios `Front/diff*.txt`; son artefactos sin referencias del producto y deben excluirse de la promoción. `test_edit.mjs` es una prueba manual obsoleta y no se incluirá. |

La propuesta de `02-arquitectura-y-despliegue.md` de enviar un Service Token desde la PWA no debe implementarse copiando su `Client Secret` al bundle público. Para acceso interactivo en navegador, evaluar una aplicación Access para el administrador y validar en el Worker el JWT emitido por Access, incluida la audiencia de esa aplicación. El diseño concreto debe resolver cookies/CORS si Front y API están en dominios diferentes. Cloudflare documenta el [flujo de cookies](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/), la [validación de `aud` y `Cf-Access-Jwt-Assertion`](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) y el [caso CORS entre dominios protegidos](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/).

## 2. Congelar y revisar el contenido de la rama

1. Terminar las correcciones anteriores en esta rama y volver a ejecutar la batería local de la sección 3. No alternar ramas mientras haya archivos sin guardar en Git.
2. Revisar `git status --short`, `git diff --stat`, `git diff` y el inventario de no rastreados. Seleccionar explícitamente código, configuración de ejemplo, pruebas y documentación. Los archivos `Back/.dev.vars`, `Front/.env`, `Front/.env.development.local`, `.wrangler/`, `Front/dist/`, `.work/` y `.audit/` están ignorados y no deben pasar a ningún commit; comprobar con `git check-ignore` y revisar `git diff --cached --name-status` antes de confirmar.
3. Crear commits revisables en `codex/refactor-arquitectura-publico`, separando si es posible la refactorización público/compartidos, el panel, el entorno local y la documentación. No usar `git add .` a ciegas: el árbol contiene material no rastreado que puede ser ajeno al producto.
4. Confirmar `git status --short` limpio. Actualizar referencias remotas y comparar `git diff --name-status origin/production...HEAD` y `git log --oneline origin/production..HEAD`. Esa comparación debe incluir deliberadamente el commit de `main` que falta en `production`; no se hará una integración separada de `main` que despliegue código intermedio sin las correcciones.

## 3. Puerta de pruebas antes del PR

Con las dependencias instaladas, ejecutar y conservar la salida en la descripción del PR:

```powershell
cd Back
npm.cmd run typecheck
cd ../Front
npm.cmd run check
npm.cmd run build:local
cd ..
node --test tests/public-contracts.mjs
node --test tests/promotion-contracts.mjs
node --test tests/access-contracts.mjs
node tests/public-browser.mjs
node tests/admin-visual.mjs
node tests/admin-delete-sync.mjs
node tests/admin-local-api.mjs
node tests/admin-local-browser.mjs
cd Front
npm.cmd run build
```

Las pruebas que usan Worker necesitan `Back: npm.cmd run dev` con D1/R2 locales y `Back/.dev.vars`; `public-browser.mjs` y las pruebas de panel usan `Front/dist` generado por `build:local`. Ejecutar `npm.cmd run build` **al final**, pues reemplaza `dist` por el build de producción. La salida de producción debe incluir las nueve rutas y no contener `localhost:8787` ni `127.0.0.1:8787`. `build:local` jamás se usa como artefacto de despliegue.

En esta preparación se obtuvo la siguiente salida; el build no incluyó la URL local:

```text
Back: npm.cmd run typecheck → exit 0
Front: npm.cmd run build → 9 page(s) built in 529ms; exit 0
rg -l '127\.0\.0\.1:8787|localhost:8787' Front/dist → sin coincidencias
```

En la rama de trabajo, el 11 de octubre se repitió la puerta local: `typecheck` (exit 0), `astro check` (0 errores, 0 advertencias, 3 indicaciones), `build:local` (9 rutas), `public-contracts` y `promotion-contracts` (5 pruebas), `access-contracts` (2 pruebas), `public-browser`, `admin-visual`, `admin-delete-sync`, `admin-local-api` y `admin-local-browser` (todos PASS). `npm.cmd run build` produjo 9 rutas y la búsqueda de hosts locales en `Front/dist` no encontró coincidencias. Repetir sobre el commit exacto que se proponga. Compilar no certifica las políticas de Access, Pages, D1 y R2 desplegadas.

## 4. Ensayo aislado en Cloudflare

Preparar una vista previa que use un **Worker de ensayo, D1 y R2 separados de producción**, con secretos propios y `PUBLIC_API_BASE_URL` de preview apuntando a ese Worker HTTPS. Verificar el control de ramas y variables de Pages antes de subir la rama: Cloudflare puede crear previews de PR automáticamente si la integración Git y el control de ramas lo permiten, pero todavía no se verificó que este proyecto lo haga ([controles de ramas](https://developers.cloudflare.com/pages/configuration/branch-build-controls/), [variables de build](https://developers.cloudflare.com/pages/configuration/build-configuration/)). No apuntar una preview administrativa a la API productiva.

En el ensayo comprobar el sitio público, las seis categorías, el cotizador, login, subidas, slots, CRUD de obras y logos, eliminación de obra destacada y logo activo, errores HTTP, Access autorizado/anónimo, CORS y PWA en un perfil limpio. Confirmar mediante la red del navegador que todas las solicitudes de datos e imágenes van a los hosts de ensayo. Las pruebas de videos externos y WhatsApp solo deben comprobar URL/interacción sin publicar contenido ni enviar mensajes reales.

## 5. PR y aprobación de promoción

1. Cuando las secciones 1–4 estén cerradas, publicar la rama con `git push -u origin codex/refactor-arquitectura-publico` y abrir en GitHub un **PR en borrador con base `production`**. Revisar su diff completo contra `production`, no solo contra `main`. No hacer squash por defecto; mantener los commits revisables. La herramienta `gh` no está instalada en este equipo, así que el PR puede abrirse desde la interfaz web de GitHub.
2. Adjuntar la matriz de pruebas, los defectos corregidos, la configuración de ensayo, el orden de despliegue y el plan de reversión. Revisar secretos y hosts en el diff y en los artefactos compilados. Resolver todos los comentarios de revisión y verificar las comprobaciones sobre el último SHA. No hay workflows `.github` versionados en este repositorio; hasta configurar CI, conservar y revisar la salida manual de la sección 3.
3. Antes de aprobar el merge, confirmar el modo de despliegue de Pages. Si hay despliegue automático desde `production`, el merge puede publicar inmediatamente la nueva interfaz. Coordinar previamente el Worker y el esquema para que la versión antigua y la nueva del Front sean compatibles durante la transición, o controlar la publicación de Pages durante la ventana de cambio. No ejecutar además `Front: npm.cmd run deploy:prod` si la integración Git ya publicó ese mismo commit.

## 6. Ventana de despliegue y comprobación

1. Registrar el SHA anterior de `production`, el despliegue activo de Pages, la versión activa del Worker y un punto de recuperación de D1. Confirmar si esa D1 usa Time Travel o el sistema de backups legado; [Cloudflare explica cómo consultarlo](https://developers.cloudflare.com/d1/reference/time-travel/). No ejecutar migraciones sin copia/ensayo y revisión del SQL. R2 requiere un plan de conservación de objetos: retroceder el código no recupera una imagen ya borrada.
2. Integrar el PR aprobado a `production`. Si la publicación se controla manualmente, desplegar desde el **commit integrado** el Worker con `Back: npm.cmd run deploy` (`Back/wrangler.toml`, nunca `wrangler.local.toml`), validar sus lecturas y autenticación, y publicar el Front de ese mismo commit mediante el mecanismo Pages confirmado. Si Pages publica automáticamente al merge, seguir el orden coordinado en la sección 5.
3. Comprobar en producción, con una cuenta autorizada y datos de prueba controlados: página pública, imágenes R2, categoría y paginación, login, una creación/edición/eliminación de obra y logo, y el rechazo de escritura anónima. Revisar logs del Worker, errores de Pages y respuestas 4xx/5xx. Registrar los IDs de prueba y limpiarlos desde el panel.
4. Si falla el Front, volver al despliegue anterior de Pages; si falla el Worker, volver a la versión anterior del Worker. Ambas acciones están documentadas por Cloudflare ([rollback de Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/), [rollback de Worker](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)). Si hubo cambio de datos, decidir aparte la recuperación de D1; una restauración puntual sobrescribe datos posteriores y requiere una decisión operativa explícita. No asumir que un rollback de código revierte D1 o R2.

**Criterio de salida:** solo se declara promovido cuando `production` contiene el SHA revisado, Pages y Worker sirven versiones compatibles, las verificaciones reales pasan y el estado de D1/R2 queda registrado. Hasta completar las condiciones de la sección 1, el estado de este procedimiento es **no listo para merge ni despliegue**.
