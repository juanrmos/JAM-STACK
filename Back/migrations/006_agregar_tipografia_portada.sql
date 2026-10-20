CREATE TABLE IF NOT EXISTS configuracion_tipografia_portada (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  fuente TEXT NOT NULL DEFAULT 'cormorant-garamond'
    CHECK (fuente IN (
      'cormorant-garamond',
      'fraunces',
      'lora',
      'playfair',
      'dm-serif-display',
      'young-serif',
      'libre-baskerville'
    )),
  escala_porcentaje INTEGER NOT NULL DEFAULT 100
    CHECK (escala_porcentaje BETWEEN 75 AND 100 AND escala_porcentaje % 5 = 0)
);

INSERT OR IGNORE INTO configuracion_tipografia_portada (id, fuente, escala_porcentaje)
VALUES (1, 'cormorant-garamond', 100);
