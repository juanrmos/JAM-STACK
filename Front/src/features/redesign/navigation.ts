import { servicios } from '../../config/servicios';
const valid=new Set(['inicio','obras','about','contacto',...servicios.map(s=>s.id)]);
let current='inicio';
export function vistaActual(){return current;}
export function navegar(dest:string,history=true){
 const view=valid.has(dest)?dest:'inicio';current=view;
 document.querySelectorAll<HTMLElement>('[data-view-panel]').forEach(el=>{el.hidden=el.dataset.viewPanel!==view;});
 document.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>{
  if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 document.querySelectorAll<HTMLElement>('.dock-card').forEach(el=>el.dataset.view===view?el.setAttribute('aria-current','true'):el.removeAttribute('aria-current'));
 const menu=document.querySelector('#main-menu');menu?.classList.remove('is-open');document.querySelector('#menu-toggle')?.setAttribute('aria-expanded','false');
 if(history){const url=new URL(location.href);if(view==='inicio')url.searchParams.delete('vista');else url.searchParams.set('vista',view);window.history.pushState({view},'',url);}
 document.querySelector('#app-main')?.scrollTo(0,0);
 document.querySelector<HTMLElement>(`[data-view-panel="${view}"]`)?.scrollTo(0,0);
 document.dispatchEvent(new CustomEvent('app:view',{detail:view}));
}
export function iniciarNavegacion(){
 document.querySelectorAll<HTMLElement>('[data-view]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();navegar(el.dataset.view||'inicio');}));
 document.querySelector('#menu-toggle')?.addEventListener('click',()=>{const menu=document.querySelector('#main-menu');menu?.classList.toggle('is-open');document.querySelector('#menu-toggle')?.setAttribute('aria-expanded',String(menu?.classList.contains('is-open')));});
 window.addEventListener('popstate',(event)=>{
  const state=event.state as {view?:unknown}|null;
  const stateView=typeof state?.view==='string'&&valid.has(state.view)?state.view:null;
  navegar(stateView||new URL(location.href).searchParams.get('vista')||'inicio',false);
 });
 navegar(new URL(location.href).searchParams.get('vista')||'inicio',false);
 let start:{x:number;y:number}|null=null;
 document.querySelectorAll<HTMLElement>('.service-view').forEach(el=>{el.addEventListener('touchstart',e=>{const t=e.touches[0];start={x:t.clientX,y:t.clientY};},{passive:true});el.addEventListener('touchend',e=>{if(!start)return;const target=e.target as HTMLElement;if(target.closest('button,a,input,select,textarea,.service-thumbs,.service-view__gallery')){start=null;return;}const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;start=null;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){const i=servicios.findIndex(s=>s.id===current);const next=servicios[i+(dx<0?1:-1)];if(next)navegar(next.id);}});});
}
