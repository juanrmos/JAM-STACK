import type { Categoria } from './categorias';

export interface ServicioPresentacion {
  id: Categoria;
  nombre_publico: string;
}

export const nombresPublicosIniciales: Readonly<Record<Categoria, string>> = {
  mural: 'Murales monumentales',
  escultura: 'Esculturas',
  cuadro: 'Cuadros personalizados',
  restauracion: 'Restauración',
  logo: 'Letras y logotipos',
  fachada: 'Pintado de fachadas',
};
