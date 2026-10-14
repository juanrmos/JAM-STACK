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
  orden           INTEGER NOT NULL DEFAULT 0,
  destacado       INTEGER NOT NULL DEFAULT 0,
  fecha_creacion  TEXT    NOT NULL
);

-- Índices para búsqueda, filtros y slots
CREATE INDEX IF NOT EXISTS idx_obras_orden ON obras(orden);
CREATE INDEX IF NOT EXISTS idx_obras_categoria ON obras(categoria);
CREATE INDEX IF NOT EXISTS idx_obras_categoria_orden ON obras(categoria, orden);
CREATE INDEX IF NOT EXISTS idx_obras_titulo ON obras(titulo);

-- ============================================================
-- Esquema D1 — Tabla logos (v1)
-- ============================================================

CREATE TABLE IF NOT EXISTS logos (
  id              TEXT    PRIMARY KEY,
  nombre          TEXT    NOT NULL,
  imagen_key      TEXT    NOT NULL,
  activo          INTEGER NOT NULL DEFAULT 0,
  fecha_creacion  TEXT    NOT NULL,
  fecha_actualizacion TEXT
);

CREATE INDEX IF NOT EXISTS idx_logos_activo ON logos(activo);
