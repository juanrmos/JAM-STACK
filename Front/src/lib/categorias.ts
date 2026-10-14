import { categorias } from '../../../Shared/contracts/categorias';
import { etiquetasCategorias } from '../i18n/categorias';
export const categoriasObras = categorias.map(value => ({ value, label: etiquetasCategorias[value] }));
