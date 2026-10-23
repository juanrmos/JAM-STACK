import type { Categoria } from './categorias';

export interface ServicioPresentacion {
  id: Categoria;
  nombre_publico: string;
}

export interface GrupoServicioPresentacion {
  id: 'complementarios';
  nombre_publico: string;
}

export const nombreGrupoComplementarioInicial = 'Servicios Complementarios';

export const nombresPublicosIniciales: Readonly<Record<Categoria, string>> = {
  mural: 'Murales monumentales',
  escultura: 'Esculturas',
  cuadro: 'Cuadros personalizados',
  restauracion: 'Restauración',
  logo: 'Letras y logotipos',
  fachada: 'Pintado de fachadas',
  materiales: 'Venta de Materiales e Insumos',
  electricos: 'Servicios eléctricos',
  drywall: 'Sistemas de drywall / carpintería',
};
