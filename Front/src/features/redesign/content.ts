import defaults from '../../../../Shared/contracts/textos.json';
import { servicios } from '../../config/servicios';
import { actualizarNombresServicios } from './service-names';
import { apiJson } from '../../services/api/client';
import { tipografiaPortadaInicial, type TipografiaPortada } from '../../../../Shared/contracts/typografia-portada';
type Content={textos:Record<string,string>;imagenes:Record<string,string|null>};
const fallback=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,v.valor]));
function renderStyled(group:string,data:Record<string,string>){const el=document.querySelector<HTMLElement>(`[data-styled-title="${group}"]`);if(!el)return;const title=data[group+'.title'],accent=data[group+'.titleAccent'];if(!title)return;el.replaceChildren();const i=accent?title.indexOf(accent):-1;if(i<0){el.textContent=title;return;}el.append(document.createTextNode(title.slice(0,i)));const em=document.createElement('em');em.textContent=accent;el.append(em,document.createTextNode(title.slice(i+accent.length)));}
export async function iniciarContenido(){
 let complementaryName='Servicios Complementarios';
 try{const catalog=await apiJson<{servicios:import('../../../../Shared/contracts/servicios').ServicioPresentacion[];grupo_complementario?:{id:string;nombre_publico:string}}>('/api/servicios');actualizarNombresServicios(catalog.servicios);complementaryName=catalog.grupo_complementario?.nombre_publico?.trim()||complementaryName;document.querySelectorAll<HTMLElement>('[data-service-group-display="complementarios"]').forEach(el=>el.textContent=complementaryName);document.querySelectorAll<HTMLElement>('[data-service-group-aria="complementarios"]').forEach(el=>el.setAttribute('aria-label',complementaryName));}catch{}
 let content:Content;try{content=await apiJson<Content>('/api/contenido');}catch{content={textos:{},imagenes:{}};}
 let typography:TipografiaPortada=tipografiaPortadaInicial;
 try{const config=await apiJson<{tipografia:TipografiaPortada}>('/api/tipografia-portada');typography=config.tipografia;}catch{}
 const values={...fallback,...content.textos};
 document.querySelectorAll<HTMLElement>('[data-text-key]').forEach(el=>{el.textContent=values[el.dataset.textKey||'']||el.textContent;});
 const aboutDescription=document.querySelector<HTMLElement>('[data-text-key="about.description"]');
 if(aboutDescription&&values['about.description'].toLowerCase().includes('podrá editarse con información confirmada')){aboutDescription.hidden=true;aboutDescription.textContent='';}
 for(const group of ['home','archive','profile','about'])renderStyled(group,values);
 const homeTitle=document.querySelector<HTMLElement>('[data-styled-title="home"]');
 if(homeTitle){homeTitle.dataset.titleFont=typography.fuente;homeTitle.dataset.titleScale=String(typography.escala_porcentaje);}
 const homeCover=content.imagenes['home.cover'];if(homeCover){const img=document.querySelector<HTMLImageElement>('[data-home-cover]');if(img){const fallback=img.dataset.fallbackSrc;if(fallback)img.addEventListener('error',()=>{if(img.src!==new URL(fallback,location.href).href)img.src=fallback;},{once:true});img.src=homeCover;}}
 document.querySelectorAll<HTMLImageElement>('[data-service-cover]').forEach(img=>{const id=img.dataset.serviceCover;const cover=content.imagenes[`service.${id}.cover`];const fallback=servicios.find(service=>service.id===id)?.imagen;if(fallback)img.addEventListener('error',()=>{if(img.src!==new URL(fallback,location.href).href)img.src=fallback;},{once:true});if(cover)img.src=cover;});
 document.querySelectorAll<HTMLImageElement>('[data-service-cover-fallback]').forEach(img=>{const id=img.dataset.serviceCoverFallback;const cover=content.imagenes[`service.${id}.cover`];if(cover)img.dataset.coverUrl=cover;});
 document.dispatchEvent(new CustomEvent('app:service-covers-updated'));
 const profilePhoto=content.imagenes['profile.photo'];if(profilePhoto){document.querySelectorAll<HTMLImageElement>('[data-profile-photo]').forEach(img=>{const frame=img.closest<HTMLElement>('[data-profile-avatar]');const fallback=frame?.querySelector<HTMLElement>('[data-profile-fallback]');img.addEventListener('error',()=>{img.hidden=true;if(fallback)fallback.hidden=false;},{once:true});img.src=profilePhoto;img.hidden=false;if(fallback)fallback.hidden=true;});document.querySelectorAll<HTMLImageElement>('[data-profile-backdrop]').forEach(img=>{img.addEventListener('error',()=>{img.hidden=true;},{once:true});img.src=profilePhoto;img.hidden=false;});}
}
