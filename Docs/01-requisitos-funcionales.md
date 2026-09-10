# 01 — Requisitos Funcionales

**Fuente:** Formulario de descubrimiento de requisitos (2 respuestas recibidas, conciliadas con el cliente el 06/09/2026).

## 1. Secciones del sitio (confirmado)

| Sección | Incluida | Notas |
|---|---|---|
| Galería de obras | Sí | Alimentada dinámicamente desde D1 + R2 (ver `03`) |
| Lista de precios base | No | Considerar para un futuro |
| Testimonios de clientes | No | Considerar para un futuro |
| Biografía | **No** | Descartada explícitamente por el cliente |
| Contacto | Sí | Solo vía WhatsApp — no hay formulario de contacto propio, no hay correo |

## 2. Tono y dirección de marca

**Palabras que definen el estilo (confirmado):** Exclusividad, excelencia plástica, rigor profesional.

Implicación para el copywriting y diseño: el tono debe ser premium/artesanal, no "rápido y práctico". Esto afecta:
- Los textos de la sección hero y descripciones (deben transmitir exclusividad, no urgencia/eficiencia).
- La elección tipográfica y espaciado (más aire, menos densidad — características de sitios de marca premium).

## 3. Paleta de colores (confirmada, ya validada visualmente con el cliente vía mockup en Builder)

| Rol | Hex | Descripción |
|---|---|---|
| Fondo principal | `#F9F9F7` | Crema cálido, base de toda la página |
| Texto principal | `#2F4F4F` | Deep Moss Green |
| Primario / CTA | `#DAA520` | Golden Ochre — botones y acentos |
| Acento secundario | `#B0C4DE` | Azul grisáceo suave — decoraciones, blob orgánico |
| Texto secundario | variaciones translúcidas de `#2F4F4F` | — |
| Superficies / bordes | tonos muy claros derivados del fondo y verde musgo con baja opacidad | — |

La combinación busca transmitir: realismo, elegancia, naturaleza, calidad artesanal.

**Nota de implementación:** esta paleta debe vivir como tokens de diseño (variables CSS / config central), nunca como valores hex sueltos repetidos en componentes. Ver `04`.

## 4. Flujo de cotización (resuelve la pregunta más frecuente de los clientes)

Requisito derivado del formulario: la primera pregunta que casi siempre reciben los clientes es "¿cuánto cobras?" (o un msj mas refinado), y cotizar un mural/obra requiere:
- Dirección del lugar
- Referencia
- Metros cuadrados aproximados
- Interior o exterior
- Altura / piso

**Solución funcional:** el botón de contacto de WhatsApp debe prellenar un mensaje que solicite explícitamente esos datos, para que el cliente potencial los envíe desde el primer mensaje sin que el artista tenga que pedirlo manualmente cada vez.

Ejemplo de mensaje prellenado (ajustar copy final en implementación):
```
Hola, quiero cotizar un mural de [obra] de [m² aprox], [interior o exterior], [piso/altura]. Te comparto mi direccion: [Direccion], [Referencia].
```

## 5. Canal de contacto

- **Preferido:** WhatsApp y llamadas telefónicas.
- **Explícitamente no ofrecido:** correo electrónico. No debe existir un formulario de "contáctanos por correo" en el sitio.

## 6. Frecuencia y mecanismo de actualización de contenido

- **Frecuencia esperada:** semanal.
- **Condición del cliente:** si no se logra una solución que permita actualización semanal de forma simple (sin fricción técnica para el cliente), se acepta degradar a un flujo manual (edición directa por el desarrollador).
- **Resolución adoptada:** app móvil o PWA con backend mínimo (Worker + D1 + R2) que permite al cliente subir una obra nueva (foto + título + descripción + link de video de YouTube) sin conocimientos técnicos y sin depender del desarrollador. Ver `02` y `03` para el diseño completo.
- Los videos se suben aparte, directo a YouTube en modalidad "no listado", por el propio cliente desde su celular; solo el link resultante se ingresa en el mismo formulario de la app.

## 7. Criterios de aceptación de alto nivel

- [ ] El cliente puede subir una obra nueva (foto + datos) desde su celular sin ayuda técnica, en menos de 2 minutos.
- [ ] El cliente puede subir un video de una obra pegando solo el link de YouTube, sin necesidad de subir el archivo de video a la infraestructura propia.
- [ ] El sitio público carga la galería reflejando los cambios subidos por el cliente sin necesidad de que el desarrollador haga un redeploy manual.
- [ ] El botón de contacto abre WhatsApp con el mensaje de "cotización" prellenado.
- [ ] Ningún endpoint de administración es navegable ni descubrible desde el sitio público (ver principios de seguridad en `00` y `02`).
- [ ] El costo mensual de infraestructura es $0, salvo decisión explícita de publicar app nativa en tiendas.
