-- Agrega los textos editoriales limitados que el Admin puede editar para el cotizador.
-- No altera campos, pasos, opciones, validaciones ni el flujo de envío.
INSERT OR IGNORE INTO textos(clave,grupo,valor) VALUES
 ('quote.eyebrow','quote','PROYECTO / CONSULTA'),
 ('quote.title','quote','Cotizador'),
 ('quote.description','quote','Cuéntanos lo que tienes en mente y prepararemos la información para conversar sobre tu proyecto.'),
 ('quote.ideaTitle','quote','Cuéntanos tu idea'),
 ('quote.ideaDescription','quote','Indica qué servicio o proyecto tienes en mente y agrega los detalles que nos ayuden a entenderlo.'),
 ('quote.measurementsTitle','quote','Medidas aproximadas'),
 ('quote.measurementsDescription','quote','Las medidas y el tipo de espacio nos ayudan a preparar una primera orientación.'),
 ('quote.contactTitle','quote','¿Cómo te contactamos?'),
 ('quote.contactDescription','quote','Déjanos tus datos para continuar la conversación por WhatsApp o correo.');
