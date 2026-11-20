# Seguimiento del OWASP ZAP Baseline

**Fecha de verificación:** 2026-11-20 (UTC)\
**Alcance:** comprobación puntual, de solo lectura, del sitio público en producción y revisión estática del código local. No es una auditoría integral ni una prueba de penetración.\
**Repositorio:** `codex/admin-mobile-save`, HEAD `f3dfd52b80d533f1593aceee7c03a318b687cf31`; el árbol de trabajo ya tenía cambios ajenos a esta revisión, que se conservaron.

## Resumen

El ZAP Baseline previo rastreó una compilación local servida con Python: 46 URLs, cero fallos, nueve tipos de advertencia y 59 comprobaciones aprobadas. No escaneó producción ni el API. En este seguimiento se contrastaron manualmente las respuestas públicas de producción mediante solicitudes HTTP de lectura y se revisó el código local relacionado con navegación.

No se confirmó una vulnerabilidad explotable. Producción sí devuelve `X-Content-Type-Options: nosniff` y `Referrer-Policy: strict-origin-when-cross-origin`, así que esas alertas del servidor local no describen la configuración actual de Pages. Sí se confirmó que las respuestas revisadas no envían CSP, protección anti-frame ni `Permissions-Policy`. Esto es una brecha de hardening; el impacto de clickjacking no se probó.

## Procedimiento y cobertura

Se leyeron cabeceras HTTP y, para el caso de navegación, el cuerpo HTML público de:

- `https://corporacionantonyrodriguez.com/`
- `https://www.corporacionantonyrodriguez.com/` (redirección al dominio canónico)
- `/?vista=contacto` y la misma ruta con un marcador textual inocuo en `vista`
- páginas de servicio de murales y venta de materiales
- `/admin/` y `/admin/login/` (solo respuesta pública; sin iniciar sesión)
- `/robots.txt`, `/sitemap.xml` y el JavaScript público de la portada

No se enviaron formularios, credenciales ni solicitudes de escritura; no se probaron payloads ejecutables, APIs, D1, R2, autorización autenticada ni disponibilidad. Los resultados describen las respuestas observadas desde una ubicación de red y pueden variar por reglas de Cloudflare, región o cambios posteriores.

## Resultados de producción

| Control | Resultado observado | Evaluación |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` en las respuestas `200` revisadas | Presente en producción; la alerta del servidor Python local no aplica. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` en las respuestas `200` revisadas | Presente. |
| CSP | No se observó `Content-Security-Policy` en portada, servicios, rutas admin ni recursos revisados | Pendiente de diseñar y probar primero en modo `Report-Only`; las fuentes de imágenes, API, videos y fuentes externas deben inventariarse. |
| Anti-clickjacking | No se observó `X-Frame-Options` ni CSP `frame-ancestors` | Brecha confirmada de cabecera. El impacto sobre acciones sensibles no quedó demostrado; aplicar y probar en Preview antes de producción. |
| `Permissions-Policy` | No observada | Endurecimiento de bajo riesgo posible si se confirma que la web no requiere esas capacidades. |
| COOP, COEP y CORP | No observadas | No añadir en bloque: no se identificó requisito de aislamiento y pueden afectar ventanas, imágenes, videos o integraciones cross-origin. |
| Caché de HTML | `Cache-Control: public, max-age=0, must-revalidate` | El navegador puede revalidar el HTML. No es por sí mismo fuga de información. |
| Caché de JS con nombre versionado | `Cache-Control: public, max-age=14400, must-revalidate` | Cuatro horas y revalidación; no se considera problema demostrado. |
| `robots.txt` y sitemap | Ambos devuelven `200`; robots refiere al dominio canónico y sitemap enumera portada y servicios | Configuración coherente con el dominio actual. |
| `Server` | `cloudflare` | No revela la versión Python observada en el servidor de prueba. |
| `www` | Responde `301` al dominio canónico | Redirección correcta. La respuesta `301` no mostró las cabeceras de seguridad anteriores; comprobar si se desea uniformidad también en redirecciones. |
| CORS de contenido estático | `Access-Control-Allow-Origin: *` en algunas respuestas HTML/estáticas | No implica que el API permita acceso abierto. La política del API requiere una revisión separada. |

Las páginas de servicio revisadas, `/admin/` y `/admin/login/` respondieron `200`. Esto es compatible con páginas estáticas públicas y **no demuestra** que el panel permita operar sin autenticar. La autenticación y autorización del API no formaron parte de esta revisión.

## Ajuste preparado y efecto esperado

En la rama de corrección se añadieron a `Front/public/_headers`, para los recursos estáticos de Pages, `X-Frame-Options: DENY`, CSP limitada a `frame-ancestors 'none'` y `Permissions-Policy: camera=(), microphone=(), geolocation=()`. La inspección del Front no encontró uso de cámara, micrófono ni geolocalización. No se añadieron COOP, COEP, CORP ni una CSP general de recursos.

El coste de rendimiento esperado es insignificante: alrededor de 130 bytes de cabeceras adicionales por respuesta, sin JavaScript, consultas ni peticiones adicionales. `frame-ancestors` solo cambia si otro sitio intenta incrustar la página; navegación normal y los iframes que la página carga (por ejemplo, videos) no son su objetivo. La política de permisos solo restringe tres capacidades que el Front no usa. Esto es una estimación técnica, no una medición posterior al despliegue. Cloudflare indica que `_headers` afecta respuestas de activos estáticos, pero no respuestas generadas por Pages Functions; por ello las rutas API deben revisarse aparte. [Documentación de Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/).

Este ajuste **aún no está desplegado**. Antes de producción se comprobará en el Preview que las cabeceras estén presentes en portada, servicios y rutas admin, que la navegación normal siga funcionando y que el iframe de prueba desde otro origen quede bloqueado. El informe CSP `Report-Only` se mantiene como una tarea aparte: no se añadió una política de carga de recursos sin inventariar sus orígenes.

## Correlación con las alertas de ZAP

### CSP y clickjacking

ZAP detectó ausencia de CSP y cabecera anti-clickjacking en la compilación local. La verificación en producción confirma que ambas protecciones tampoco aparecen en las respuestas revisadas. La recomendación es evaluar las directivas de carga de recursos de una CSP en `Report-Only` sobre un deployment de Preview; fijar la lista de orígenes requeridos y resolver violaciones antes de hacerlas obligatorias. `Report-Only` no bloquea recursos. La protección anti-frame debe comprobarse por separado con una política aplicada en Preview: valorar `frame-ancestors 'none'` y compatibilidad con `X-Frame-Options: DENY`, comprobando que no se inserte legítimamente la web en otra página. ([MDN: Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only), [MDN: frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors))

### Posible XSS en `?vista=contacto`

ZAP lo marcó con confianza baja. El marcador inocuo enviado en `vista` no apareció en el HTML de respuesta. En `Front/src/features/redesign/navigation.ts`, el valor pasa por `navegar`, que valida el destino contra una lista permitida y vuelve a `inicio` si no coincide; el código revisado no inserta el parámetro en HTML. Esto respalda que el aviso sea un falso positivo, pero no equivale a una prueba dinámica completa del DOM. No se enviaron payloads ejecutables.

### Otras alertas

- `X-Content-Type-Options`: presente en producción como `nosniff`.
- `Server Leaks Version Information`: el identificador `SimpleHTTP/0.6 Python/3.11.2` era del servidor temporal local; producción responde `Server: cloudflare`.
- `Storable and Cacheable Content` y `Modern Web Application`: informativas; las cabeceras actuales de HTML y JS no muestran por sí solas exposición de datos.
- COOP/COEP/CORP y `Permissions-Policy`: no quedaron validadas por el escaneo local como riesgos explotables; la verificación confirma ausencia de algunas cabeceras, pero no justifica añadirlas sin caso de uso.

## Plan de casos y estado

| ID | Caso | Estado | Próximo paso seguro |
|---|---|---|---|
| H-01 | Comparar cabeceras locales con Pages | **Completado** | Repetir tras cualquier cambio de reglas en Cloudflare o `_headers`. |
| H-02 | Confirmar `nosniff`, política de referencia, caché y banner de servidor | **Completado** | Mantener como verificaciones de regresión. |
| H-03 | Revisar CSP y dependencias externas | **Parcial: ausencia confirmada** | En Preview, habilitar `Content-Security-Policy-Report-Only` para directivas de recursos, inventariar violaciones y luego ajustar una política estricta. No publicar una política obligatoria sin revisar API, R2, imágenes, fuentes y videos. `Report-Only` no bloquea. |
| H-04 | Clickjacking en vistas públicas y administración | **Corrección preparada; Preview pendiente** | En esta rama se añadieron `frame-ancestors`/`X-Frame-Options`; verificar cabeceras y bloqueo de iframe en Preview para portada, login y rutas admin, y que el flujo normal siga funcionando. No se intentó en producción. |
| X-01 | Falso positivo de `vista` | **Parcial: no hay reflexión del parámetro** | En navegador aislado/Preview, probar valores válidos e inválidos y revisar que no haya ejecución ni inserción HTML; conservar la lista permitida como invariante. |
| A-01 | Protección del panel y API | **Fuera de cobertura** | En Preview con cuentas/datos ficticios: acceso sin sesión, sesión expirada, llamadas directas a rutas admin/API y denegación de operaciones. El `200` de la página estática no basta para concluir exposición. |
| P-01 | COOP/COEP/CORP y Permissions Policy | **Permissions-Policy preparada; COOP/COEP/CORP diferidos** | Se restringen cámara, micrófono y geolocalización tras buscar usos en el Front. Confirmar Preview. Mantener COOP/COEP/CORP fuera hasta que exista una necesidad concreta. |
| C-01 | Cache de documentos y assets | **Observado; sin defecto confirmado** | Validar invalidación tras una versión de prueba y que no se cacheen respuestas privadas del API. |

## Criterios para cerrar los pendientes

1. Ejecutar ZAP Baseline contra un deployment de Preview de Pages, con las cabeceras reales de Cloudflare, y comparar las alertas; no tratar el escaneo pasivo como prueba de ausencia de vulnerabilidades.
2. Validar CSP en modo `Report-Only`, corregir violaciones legítimas y después repetir navegador, navegación, imágenes R2, videos y llamadas al API.
3. Verificar anti-frame con un documento de prueba alojado en otro origen y confirmar que el sitio rechaza el encuadre en portada, login y admin.
4. Realizar pruebas del API y autenticación por separado, usando solo datos ficticios en Preview y sin solicitudes destructivas.
5. Repetir los checks de cabeceras sobre los URLs de servicios, HTML, recursos estáticos y redirecciones después de desplegar cualquier ajuste.

## Referencias

- [OWASP Web Security Testing Guide 4.2](https://owasp.org/www-project-web-security-testing-guide/)
- [WSTG: Additional Browser Security Controls](https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management/14-Additional_Browser_Security_Controls/)
- [WSTG: Testing for Clickjacking](https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/11-Client-side_Testing/09-Testing_for_Clickjacking/)
- [WSTG: DOM-Based XSS](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/11-Client-side_Testing/01-Testing_for_DOM-based_Cross_Site_Scripting/)
- [OWASP ASVS 5.0.0: Web Frontend Security](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x12-V3-Web-Frontend-Security.md)
