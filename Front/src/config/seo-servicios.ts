import type { Categoria } from '../../../Shared/contracts/categorias';

export interface ServicioSeo {
  id: Categoria;
  slug: string;
  titulo: string;
  descripcion: string;
  altImagen: string;
}

export const paginasSeoServicios: readonly ServicioSeo[] = [
  {
    id: 'mural', slug: 'murales-monumentales',
    titulo: 'Murales monumentales en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Murales artísticos y proyectos de pintura mural en Huánuco. Conoce el trabajo de la Corporación Artística Antony Rodríguez y consulta tu proyecto.',
    altImagen: 'Proyecto de mural artístico de la Corporación Artística Antony Rodríguez',
  },
  {
    id: 'escultura', slug: 'esculturas',
    titulo: 'Esculturas en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Esculturas artísticas creadas a medida en Huánuco. Explora el trabajo de Antony Rodríguez y consulta una propuesta para tu espacio.',
    altImagen: 'Escultura artística de la Corporación Artística Antony Rodríguez',
  },
  {
    id: 'cuadro', slug: 'cuadros-personalizados',
    titulo: 'Cuadros personalizados en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Retratos y cuadros personalizados en Huánuco, creados a partir de tu historia e idea. Consulta una obra hecha a medida.',
    altImagen: 'Cuadro personalizado de la Corporación Artística Antony Rodríguez',
  },
  {
    id: 'restauracion', slug: 'restauracion-de-obras',
    titulo: 'Restauración de obras en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Restauración y recuperación de obras, superficies y espacios con valor artístico en Huánuco. Consulta los detalles de tu proyecto.',
    altImagen: 'Obra artística para servicio de restauración en Huánuco',
  },
  {
    id: 'logo', slug: 'letras-y-logotipos',
    titulo: 'Letras y logotipos pintados a mano | Antony Rodríguez',
    descripcion: 'Letras, logotipos e identidad visual pintada a mano en Huánuco. Conoce el servicio de la Corporación Artística Antony Rodríguez.',
    altImagen: 'Letras y logotipo pintados a mano por la Corporación Artística Antony Rodríguez',
  },
  {
    id: 'fachada', slug: 'pintado-de-fachadas',
    titulo: 'Pintado artístico de fachadas en Huánuco | Antony Rodríguez',
    descripcion: 'Pintado artístico de fachadas para viviendas y negocios en Huánuco. Comparte tu idea y consulta una propuesta a medida.',
    altImagen: 'Fachada intervenida con pintura artística en Huánuco',
  },
  {
    id: 'materiales', slug: 'venta-de-materiales-e-insumos',
    titulo: 'Materiales e insumos artísticos en Huánuco | Antony Rodríguez',
    descripcion: 'Consulta por WhatsApp la disponibilidad de materiales e insumos para crear y construir con la Corporación Artística Antony Rodríguez.',
    altImagen: 'Materiales e insumos para proyectos artísticos',
  },
  {
    id: 'electricos', slug: 'servicios-electricos',
    titulo: 'Servicios eléctricos en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Consulta los servicios eléctricos disponibles para tu proyecto en Huánuco y solicita información a la Corporación Artística Antony Rodríguez.',
    altImagen: 'Soluciones eléctricas para proyectos en Huánuco',
  },
  {
    id: 'drywall', slug: 'drywall-y-carpinteria',
    titulo: 'Drywall y carpintería en Huánuco | Corporación Artística Antony Rodríguez',
    descripcion: 'Proyectos de drywall y carpintería con soluciones adaptadas a cada espacio en Huánuco. Consulta tu proyecto.',
    altImagen: 'Proyecto de drywall y carpintería',
  },
] as const;

export const paginaSeoComplementarios = {
  slug: 'servicios-complementarios',
  titulo: 'Servicios complementarios en Huánuco | Corporación Artística Antony Rodríguez',
  descripcion: 'Conoce los servicios eléctricos, drywall y carpintería de la Corporación Artística Antony Rodríguez en Huánuco.',
} as const;

export function urlServicio(id: Categoria): string {
  const page = paginasSeoServicios.find((item) => item.id === id);
  return page ? `/servicios/${page.slug}/` : '/';
}

export const urlServiciosComplementarios = `/servicios/${paginaSeoComplementarios.slug}/`;
