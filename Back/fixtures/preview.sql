-- Solo para portafolio-refactor-preview-db; nunca ejecutar en portafolio-db.
INSERT OR REPLACE INTO obras (id, titulo, categoria, imagen_key, orden, fecha_creacion) VALUES
('preview-mural-1', 'Ensayo mural', 'mural', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('preview-fachada-1', 'Ensayo fachada', 'fachada', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('preview-cuadro-1', 'Ensayo cuadro', 'cuadro', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('preview-escultura-1', 'Ensayo escultura', 'escultura', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('preview-restauracion-1', 'Ensayo restauración', 'restauracion', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('preview-logo-1', 'Ensayo logo', 'logo', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z');
INSERT OR REPLACE INTO logos (id, nombre, imagen_key, activo, fecha_creacion) VALUES
('preview-logo-activo', 'Logo de ensayo', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z');
