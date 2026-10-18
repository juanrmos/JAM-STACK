import defaults from '../../../../Shared/contracts/textos.json';
import { servicios } from '../../config/servicios';
import { actualizarNombresServicios } from './service-names';
import { apiJson } from '../../services/api/client';
type Content={textos:Record<string,string>;imagenes:Record<string,string|null>};
const fallback=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,v.valor]));
function renderStyled(group:string,data:Record<string,string>){const el=document.querySelector<HTMLElement>(`[data-styled-title="${group}"]`);if(!el)return;const title=data[group+'.title'],accent=data[group+'.titleAccent'];if(!title)return;el.replaceChildren();const i=accent?title.indexOf(accent):-1;if(i<0){el.textContent=title;return;}el.append(document.createTextNode(title.slice(0,i)));const em=document.createElement('em');em.textContent=accent;el.append(em,document.createTextNode(title.slice(i+accent.length)));}
export async function iniciarContenido(){
 try{const catalog=await apiJson<{servicios:import('../../../../Shared/contracts/servicios').ServicioPresentacion[]}>('/api/servicios');actualizarNombresServicios(catalog.servicios);}catch{}
 let content:Content;try{content=await apiJson<Content>('/api/contenido');}catch{content={textos:{},imagenes:{}};}
 const values={...fallback,...content.textos};
 document.querySelectorAll<HTMLElement>('[data-text-key]').forEach(el=>{el.textContent=values[el.dataset.textKey||'']||el.textContent;});
 for(const group of ['home','archive','about'])renderStyled(group,values);
 const homeCover=content.imagenes['home.cover'];if(homeCover){const img=document.querySelector<HTMLImageElement>('[data-home-cover]');if(img){const fallback=img.dataset.fallbackSrc;if(fallback)img.addEventListener('error',()=>{if(img.src!==new URL(fallback,location.href).href)img.src=fallback;},{once:true});img.src=homeCover;}}
 const photo=content.imagenes['about.photo'];if(photo){const img=document.querySelector<HTMLImageElement>('#about-photo');if(img){img.src=photo;img.alt='Fotografía de Sobre nosotros';}}
 document.querySelectorAll<HTMLImageElement>('[data-service-cover]').forEach(img=>{const id=img.dataset.serviceCover;const cover=content.imagenes[`service.${id}.cover`];const fallback=servicios.find(service=>service.id===id)?.imagen;if(fallback)img.addEventListener('error',()=>{if(img.src!==new URL(fallback,location.href).href)img.src=fallback;},{once:true});if(cover)img.src=cover;});
 document.querySelectorAll<HTMLImageElement>('[data-service-cover-fallback]').forEach(img=>{const id=img.dataset.serviceCoverFallback;const cover=content.imagenes[`service.${id}.cover`];if(cover)img.dataset.coverUrl=cover;});
 document.dispatchEvent(new CustomEvent('app:service-covers-updated'));
 const profilePhoto=content.imagenes['profile.photo'];if(profilePhoto){document.querySelectorAll<HTMLImageElement>('[data-profile-photo]').forEach(img=>{const frame=img.closest<HTMLElement>('[data-profile-avatar]');const fallback=frame?.querySelector<HTMLElement>('[data-profile-fallback]');img.addEventListener('error',()=>{img.hidden=true;if(fallback)fallback.hidden=false;},{once:true});img.src=profilePhoto;img.hidden=false;if(fallback)fallback.hidden=true;});}
}
