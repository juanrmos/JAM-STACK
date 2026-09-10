-- ============================================================
-- Esquema D1 — Tabla obras (v1)
-- Referencia: doc 03, sección 1
--
-- Tablas precios y testimonios: fuera de alcance v1.
-- Se agregarán en el futuro si se activan las secciones.
-- ============================================================

CREATE TABLE IF NOT EXISTS obras (
  id              TEXT    PRIMARY KEY,
  titulo          TEXT    NOT NULL,
  descripcion     TEXT,
  categoria       TEXT,
  imagen_key      TEXT    NOT NULL,
  video_url       TEXT,
  orden           INTEGER NOT NULL,
  destacado       INTEGER NOT NULL DEFAULT 0,
  fecha_creacion  TEXT    NOT NULL
);

-- Índice para consultas de galería ordenadas
CREATE INDEX IF NOT EXISTS idx_obras_orden ON obras(orden);

-- Índice para filtros por categoría
CREATE INDEX IF NOT EXISTS idx_obras_categoria ON obras(categoria);
