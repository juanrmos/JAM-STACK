# 00 — Constitución y Alcance del Proyecto

**Proyecto:** Portafolio web de arte.
**Tipo de documento:** SDD (Spec-Driven Development) — específico de este proyecto, no reutilizable como práctica general.
**Estado:** Confirmado tras sesión de descubrimiento de requisitos + revisión arquitectónica.

## 1. Propósito de este documento

Este documento y los que le siguen (`01` a `04`) son el conjunto de especificaciones que debe leer un agente de código (Claude Code, Cursor, o similar) antes de escribir una sola línea de este proyecto. El objetivo es que ninguna decisión de arquitectura, seguridad o alcance quede a criterio del agente — todo lo que aquí se declara es la fuente de verdad.

Si el agente encuentra una ambigüedad no cubierta en estos documentos, debe **detenerse y preguntar**, no asumir.

## 2. Principios no negociables

Estos principios aplican a todo el proyecto y no se negocian salvo actualización explícita de este documento:

1. **Costo objetivo: $0/mes en infraestructura**, salvo que se decida explícitamente publicar una app nativa en tiendas (con costo de Apple Developer Program / Google Play).
2. **Ningún panel de administración público navegable.** No debe existir una URL tipo `/admin` accesible por navegador que exponga un formulario de login a internet.
3. **Ninguna credencial de almacenamiento (R2, D1) se expone al cliente** (app móvil/PWA). Toda escritura pasa por el Worker API, que emite URLs firmadas de un solo uso y vida corta.
4. **Nada de contenido variable hardcodeado en el código fuente.** Textos, colores, datos de obras, y flags de secciones viven en configuración o en base de datos, nunca escritos directo en componentes.
5. **Separación estricta por tipo de dato:** archivos binarios pesados (fotos) → R2. Texto/metadata (títulos, orden, links) → D1. Nunca se guardan binarios en D1 ni metadata de obras dentro del repositorio de código.
6. **El video nunca se aloja en la infraestructura propia.** Se sube a YouTube en modalidad "no listado"; solo el link se guarda como dato en D1.

## 3. Alcance confirmado (in scope)

- Sitio público de un solo idioma (español) — ver nota de i18n en `04`.
- Secciones: **Galería, imagenes y video**, **Contacto**.
- Sin sección de Biografía (decisión explícita, confirmada).
- Botón de contacto vía WhatsApp con mensaje prellenado con lo que requiere el cliente(no hay formulario de contacto con backend propio, no hay correo).
- Mecanismo de actualización de contenido (subir obras nuevas) mediante app móvil o PWA operada por el cliente (dueño del estudio de arte), sin necesidad de conocimientos técnicos.
- Frecuencia de actualización esperada: semanal (con fallback a manual si la solución automatizada no resulta viable en implementación — ver `01`).

## 4. Fuera de alcance (out of scope) — explícito

- Biografía del artista.
- Pasarela de pagos o checkout — el sitio no vende directo, solo deriva a WhatsApp.
- Multi-idioma en la v1 (preparado en arquitectura, no implementado).
- Analytics avanzado / dashboards internos.
- Autenticación multiusuario (el sistema está diseñado para **un solo usuario administrador**: el cliente dueño del estudio).

## 5. Decisiones que reemplazan opciones descartadas

Documentado explícitamente para que el agente de código no reintroduzca opciones ya evaluadas y rechazadas:

| Opción considerada | Estado | Motivo del descarte |
|---|---|---|
| CMS basado en Git (Decap/Netlify CMS) con login OAuth público | ❌ Descartada | Expone un endpoint de autenticación públicamente navegable — superficie de ataque innecesaria para un solo usuario. Ver `02` para la alternativa adoptada. |
| Cloudflare Images (producto dedicado) para fotos | ❌ Descartada | Es un servicio de pago ($5/100k almacenadas + $1/100k entregadas), no gratuito como se asumió inicialmente. Se usa **R2** en su lugar (gratis hasta 10GB). |
| Google Drive con enlace público para videos | ❌ Descartada | No ofrece restricción de acceso real (el link directo es extraíble desde el código fuente de la página) y tiene cuotas de reproducción que fallan bajo tráfico impredecible. |
| Hosting sobre VM propia (Oracle Cloud) con Cloudflare como proxy | ❌ Descartada para este proyecto | Innecesaria para un sitio sin lógica de servidor pesada; añade mantenimiento sin beneficio. La infraestructura Oracle queda reservada para el proyecto 2 (demo de arquitectura). |

## 6. Documentos relacionados

- `01-requisitos-funcionales.md` — qué debe hacer el sitio, según el formulario de descubrimiento.
- `02-arquitectura-y-despliegue.md` — cómo se despliega y qué componente hace qué.
- `03-modelo-de-datos-y-api.md` — esquema de D1, convención de R2, contrato del Worker API.
- `04-stack-y-parametrizacion.md` — stack elegido, estructura de carpetas, configuración central.
