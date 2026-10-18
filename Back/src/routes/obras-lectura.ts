import type { Env } from '../types';
import { generarUrlPublica } from '../lib/storage';
import { jsonResponse } from './response';
import { consultarObras } from '../repositories/obras';
import { categorias } from '../../../Shared/contracts/categorias';
export function obraPublica(env:Env,o:Record<string,unknown>){return {id:o.id,titulo:o.titulo,descripcion:o.descripcion,servicio_id:o.servicio_id,destacado_slot:o.destacado_slot,imagenUrl:generarUrlPublica(env,String(o.imagen_key)),videoUrl:o.video_url,ubicacion:o.ubicacion,anio:o.anio};}
export async function listarObras(request:Request,env:Env){
 const q=new URL(request.url).searchParams; const servicio=q.get('servicio_id');
 const limit=Number(q.get('limit')??50),offset=Number(q.get('offset')??0);
 if(q.has('categoria')||q.has('orden')||q.has('destacado')||!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||(servicio&&!categorias.includes(servicio as typeof categorias[number]))||(q.has('slots')&&q.get('slots')!=='true'))return jsonResponse({error:{mensaje:'Filtros inválidos.'}},400);
 const {results,total}=await consultarObras(env,servicio,q.get('buscar'),q.get('slots')==='true',limit,offset);
 const obras=results.map(o=>obraPublica(env,o as Record<string,unknown>));return jsonResponse({obras,total,hasMore:offset+obras.length<total});
}
