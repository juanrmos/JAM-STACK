# Auditoría visual y responsive de la vista pública

**Fecha:** 11 de octubre de 2026

**Rama:** `codex/refactor-arquitectura-publico`

**Alcance:** página pública. Evaluación de diseño y comportamiento visual; no se modificó la interfaz ni el admin en esta auditoría.

## Juicio general

La página **se adapta parcialmente**: Hero pasa de dos columnas a una, Servicios de tres a dos y una, el Cotizador ocupa toda la pantalla en móvil y las tarjetas de Galería tienen anchos según breakpoint. Sin embargo, **no cumple una adaptación fiable en móviles estrechos**: la cabecera desborda el ancho visible entre 320 y 390 px. La composición de escritorio es ordenada y coherente en color y espaciado, pero la dirección visual actual no realiza una de las decisiones centrales de `05-sistema-de-diseno-y-componentes.md`: galería en mosaico editorial con obras destacadas. Los textos de apoyo, enlaces y botones pequeños limitan la legibilidad.

La valoración estética depende de las obras reales, la identidad del artista y la intención de marca. Las capturas usan datos ficticios y la misma imagen de prueba para varias obras; **no permiten juzgar la calidad final del contenido fotográfico**. Sí permiten evaluar layout, jerarquía, controles, color y tipografía actuales.

## Evidencia responsive

Se abrió el build local en Edge a siete anchos de viewport, con una API ficticia local y un perfil limpio. Script reproducible: `node tests/visual-audit.mjs`, tras `npm.cmd run build:local` en `Front`; métricas y capturas quedan bajo `.work/responsive/` (ignorado por Git). Los carruseles tienen desplazamiento horizontal deliberado; la medida siguiente corresponde al ancho **total de la página**, que debe ajustarse al viewport.

| Viewport | Ancho de página | Cabecera | Resultado |
|---:|---:|---:|---|
| 320 px | 403 px | 128 px de alto; enlace Cotizar fuera del viewport | Desbordamiento de 83 px. |
| 360 px | 403 px | 128 px; Cotizar fuera del viewport | Desbordamiento de 43 px. |
| 390 px | 403 px | 128 px; Cotizar recortado | Desbordamiento de 13 px. |
| 430 px | 430 px | 128 px; marca partida en varias líneas | Sin desbordamiento, pero navegación comprimida. |
| 768 px | 768 px | 72 px | Dos columnas de servicios, sin desbordamiento. |
| 1024 px | 1024 px | 78 px | Tres columnas, Hero partido, sin desbordamiento. |
| 1440 px | 1440 px | 78 px | Contenido centrado hasta 1200 px, sin desbordamiento. |

El origen está en `visual/styles/public/header.css`: `.nav` intenta mantener marca y cuatro acciones en una fila, `.nav__links` conserva separaciones de 1 rem en móvil y los rótulos no tienen una alternativa compacta. A 320 px, los enlaces alcanzan la coordenada X=403. La marca se comprime hasta 59 px de ancho y ocupa 96 px de alto. Este fallo también ensancha las capturas de pantalla y deja visible una franja del Cotizador cuando está cerrado, pues el cajón está situado fuera de la pantalla de 320 px pero dentro del área horizontal desbordada de 403 px.

El Cotizador abierto usa 100 % del ancho hasta 768 px y tiene scroll vertical interno cuando el formulario no cabe en 850 px de alto. El flujo es utilizable, pero debe volver a comprobarse con teclado móvil abierto, zoom y alturas menores. A 1024 y 1440 px usa hasta 520 px de ancho.

La [guía WCAG 2.2 de reflow](https://www.w3.org/TR/wcag/#reflow) usa 320 CSS px como referencia para contenido de desplazamiento vertical; un carrusel horizontal puede ser una excepción por su función, pero la navegación principal no debería requerir mover horizontalmente toda la página. Por lo medido, **el caso de 320 px no cumple ese objetivo de adaptación**.

## Calidad visual y diferencias con el diseño documentado

| Área | Lo que funciona | Problema o tensión actual | Prioridad |
|---|---|---|---|
| Jerarquía | Hero con imagen y titular reconocibles; fondo crema, verde oscuro y espacios amplios dan una base sobria. | Galería queda después de seis tarjetas de Servicios; en móvil esas tarjetas ocupan más de 2200 px de alto antes de empezar a ver obras. Para un portafolio, las obras llegan tarde. | Alta |
| Galería | Tiene categorías y proporciones distintas de imagen. | Se usan rieles de tarjetas uniformes. El `destacado` del contrato no determina jerarquía visual. `05` pide explícitamente un **mosaico editorial**, no un catálogo repetitivo. El filtro gris permanente hasta hover apaga las obras en pantallas táctiles, donde hover no es una interacción fiable. | Alta |
| Identidad | Paleta y titular de Newsreader son reconocibles. | No aparece la forma geométrica/angular prevista en `05`. El cuerpo utiliza DM Sans como fallback; General Sans está declarado, pero no se carga. El Cotizador dice «J. Art Studio / Private commissions», mientras cabecera y pie dicen «Antony Art Studio». Conviene decidir una sola identidad y tono. | Media |
| Lectura | Texto principal verde sobre crema tiene contraste alto. | Base de cuerpo 14 px, navegación de 11–12 px, eyebrow de 10 px, metadatos de 10–12 px y placeholders de 11 px. En las capturas el contenido secundario resulta demasiado pequeño. | Alta |
| Servicios | El cambio 3→2→1 columnas funciona. | Seis tarjetas iguales y bordes repetidos dominan el recorrido móvil; parecen catálogo de servicios antes que presentación de obra singular. | Media |
| Conversión | Cotizador y WhatsApp están visibles y conectados. | Hay tres llamadas a la acción cercanas en móvil; el botón flotante puede competir con controles de galería y el formulario se apoya en placeholders pequeños como rótulos. | Media |
| Pie y enlaces | Estructura en columnas y caída a una columna. | Los enlaces sociales apuntan a `#` y el texto del pie es muy pequeño. Antes de rediseñar, hacen falta destinos reales o retirarlos. | Media |

### Contraste medido a partir de los colores CSS

| Par de colores | Razón aproximada |
|---|---:|
| Verde `#2F4F4F` sobre crema `#F9F9F7` | 8.47:1 |
| Gris `#6B7B7B` sobre crema | 4.20:1 |
| Dorado `#DAA520` sobre crema | 2.12:1 |
| Blanco sobre dorado | 2.24:1 |

WCAG 2.2 pide [4.5:1 para texto normal y 3:1 para texto grande](https://www.w3.org/TR/wcag/#contrast-minimum). El verde principal supera esa referencia; el dorado usado como texto pequeño o fondo de CTA con letras blancas queda por debajo, y el gris secundario queda ligeramente por debajo para texto normal. Los enlaces de navegación miden alrededor de 18–19 px de alto como área interactiva, y el cierre del Cotizador unos 23 px de ancho; la [regla de tamaño de objetivos de WCAG 2.2](https://www.w3.org/TR/wcag/#target-size-minimum) considera 24×24 px o excepciones por separación. Una medida pequeña por sí sola no prueba incumplimiento de todos los controles, pero justifica revisión de áreas táctiles y separación.

También falta una regla `prefers-reduced-motion` para la transición del Cotizador y el desplazamiento suave global. La página debe probarse con texto aumentado al 200 %, según el [criterio de cambio de tamaño de texto](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html); esta auditoría aún no ejecutó esa prueba. No se declara conformidad WCAG completa.

## Proceso propuesto para mejorar el diseño

1. **Fijar dirección y material real.** Confirmar el nombre y tono de marca, la pareja tipográfica y disponer de una pequeña selección de obras reales (horizontal, vertical, destacada, con video y sin video). Revisar junto al artista el marco de las fotos, que `05` dejó pendiente. Las imágenes de prueba actuales no sirven para escoger una estética final.
2. **Resolver la decisión de Galería.** Tomar el mosaico editorial con `destacado` de `05` como propuesta de referencia y compararlo con una variante de rieles. Elegir una sola solución por su capacidad para dar protagonismo a las obras y por cómo se adapta al tacto. Decidir también si Servicios se resume, se mueve después de la Galería o permanece antes.
3. **Diseñar composiciones antes de editar CSS.** Crear dos o tres propuestas de baja fidelidad para Inicio, vista de obra/Galería y Cotizador a 320/390, 768 y 1440 px. Mostrar el primer pantallazo, la primera obra visible y el recorrido completo. Evaluar qué transmite exclusividad, excelencia plástica y rigor profesional, no solo si «se ve moderno».
4. **Cerrar un sistema visual medible.** Acordar escalas de texto, ancho de lectura, ritmos de espacio, proporciones de imagen, estados de botones y paleta de contraste. Conservar o cambiar los colores confirmados en `01` solo después de ver alternativas sobre contenido real. Si se conserva dorado, usarlo en acentos no textuales o ajustar color de texto/fondo hasta contrastes legibles. Definir comportamiento del menú y del CTA en móvil estrecho.
5. **Aplicar por componentes y verificar cada ancho.** Empezar por cabecera y desbordamiento; después Hero, Galería, Servicios, Cotizador, botón flotante y pie. Los archivos de `visual/styles/public/` ya permiten cambiar un área por vez. Revisar 320, 360, 390, 430, 768, 1024 y 1440 px, además de zoom de 200 %, teclado y dispositivo táctil. Mantener las pruebas funcionales públicas para que el rediseño no rompa API, navegación, video o WhatsApp.
6. **Validar con el artista y con usuarios.** Comparar las alternativas con tres tareas: encontrar una obra representativa, entender qué servicios se ofrecen y enviar una cotización. Registrar dónde dudan y ajustar antes de cerrar el diseño. La aprobación visual debe hacerse sobre capturas o prototipo con obras reales en móvil y escritorio.

## Criterios para aceptar el siguiente diseño

- Ningún elemento de navegación queda fuera de pantalla desde 320 px; toda la página se desplaza solo verticalmente, excepto el carrusel si se elige conservarlo.
- La primera obra y la vía de contacto son fáciles de localizar en móvil. Las categorías no dependen solo de flechas pequeñas para descubrir contenido.
- Las obras destacadas tienen una jerarquía visible, o se documenta una decisión distinta a la especificación de `05`.
- Títulos, texto de apoyo y CTAs mantienen lectura y contraste adecuados; hay áreas táctiles cómodas.
- El nombre, imágenes, tipografía y tono cuentan una sola historia de marca.
- Funciona a los siete anchos medidos, con texto ampliado, interacción táctil y teclado; las pruebas funcionales de la fase pública siguen pasando.

La siguiente decisión de diseño con mayor efecto es **cómo debe presentarse la Galería y cuán pronto debe aparecer en móvil**. Resolverla primero evita ajustar decenas de detalles CSS alrededor de una estructura que después habría que reemplazar.

## Actualización tras la organización visual y cambio de marca

La auditoría anterior describe el estado medido antes del cambio de nombre. Después se confirmó «Corporacion Antony Rodriguez» y se reorganizaron los CSS y componentes públicos sin rediseñar la Galería ni Servicios. El nombre más largo elevó inicialmente el desbordamiento móvil de la cabecera a 442 px; se corrigió su composición a dos filas en `visual/styles/public/header.css`. Una nueva medición a 320, 360, 390, 430, 768, 1024 y 1440 px da ancho total de página igual al viewport en los siete casos. Los demás hallazgos de identidad, contraste, lectura y jerarquía de contenido mantienen su prioridad hasta la etapa de rediseño.
