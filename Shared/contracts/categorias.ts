export const categorias = ['mural', 'escultura', 'cuadro', 'restauracion', 'logo', 'fachada', 'materiales', 'electricos', 'drywall'] as const;
export type Categoria = typeof categorias[number];
