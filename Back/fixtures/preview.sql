-- Solo para portafolio-refactor-preview-db; nunca ejecutar en portafolio-db.
INSERT OR REPLACE INTO obras (id, titulo, categoria, imagen_key, orden, fecha_creacion) VALUES
('fc0dcf62-ce69-41d0-9768-b76d6f07bf45', 'Ensayo mural', 'mural', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('502392dd-9cd7-4d2f-9e2d-389a64722ae0', 'Ensayo fachada', 'fachada', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('3ae4ddc2-73f4-4aa3-ac2c-da8e862e4a01', 'Ensayo cuadro', 'cuadro', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('a8b7cd49-e541-4de6-b297-f1b3792e11a7', 'Ensayo escultura', 'escultura', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('aa814528-4c08-4706-8cd3-8ae2bbbf4978', 'Ensayo restauración', 'restauracion', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z'),
('8ffed9e2-c5b0-4dbc-88f1-0cb53ed24b6f', 'Ensayo logo', 'logo', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z');
INSERT OR REPLACE INTO logos (id, nombre, imagen_key, activo, fecha_creacion) VALUES
('96cfb767-aa28-4a80-a7cc-f4de0961f938', 'Logo de ensayo', 'fixtures/obra.jpg', 1, '2026-10-11T00:00:00Z');
