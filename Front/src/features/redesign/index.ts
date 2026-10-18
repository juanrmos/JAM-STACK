import { iniciarNavegacion } from './navigation';
import { iniciarContenido } from './content';
import { iniciarGalerias } from './gallery';
import { iniciarLightbox } from './lightbox';
import { iniciarCotizadorNuevo } from './quote';
import { obtenerLogoActivo } from '../../services/api/logos';
export function iniciarPublico(){iniciarNavegacion();iniciarLightbox();iniciarCotizadorNuevo();void iniciarContenido();void iniciarGalerias();void obtenerLogoActivo().then(logo=>{if(!logo)return;const target=document.querySelector<HTMLElement>('.brand__mark');if(target){const img=document.createElement('img');img.src=logo.imagenUrl;img.alt='Logo activo';img.width=42;img.height=42;target.replaceChildren(img);}}).catch(()=>{});}
