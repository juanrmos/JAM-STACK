export const categorias = ['mural', 'fachada', 'cuadro', 'escultura', 'restauracion', 'logo'] as const;
export type Categoria = typeof categorias[number];
